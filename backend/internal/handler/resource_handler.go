package handler

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

type ResourceHandler struct{ resources *service.ResourceService }

func NewResourceHandler(resources *service.ResourceService) *ResourceHandler {
	return &ResourceHandler{resources: resources}
}

func (h *ResourceHandler) Get(c *gin.Context) {
	path, err := h.resources.ResolveForRequest(c.Query("base"), c.Query("category"), c.Query("subcategory"), c.Query("name"), c.Query("filename"), parseBool(c.Query("force")))
	if err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid resource path")
		return
	}
	if !service.FileExists(path) {
		response.Fail(c, http.StatusNotFound, 404, "resource not found")
		return
	}
	http.ServeFile(c.Writer, c.Request, path)
}

func (h *ResourceHandler) Upload(c *gin.Context) {
	base := c.Query("base")
	category := c.Query("category")
	subcategory := c.Query("subcategory")
	name := c.Query("name")
	filename := c.Query("filename")
	force := parseBool(c.Query("force"))

	path, err := h.resources.Resolve(base, category, subcategory, name, filename)
	if err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid resource path")
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "missing file")
		return
	}

	if service.FileExists(path) && !force {
		response.Fail(c, http.StatusConflict, 409, "resource already exists")
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid file")
		return
	}
	defer src.Close()

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}

	flags := os.O_WRONLY | os.O_CREATE
	if force {
		flags |= os.O_TRUNC
	} else {
		flags |= os.O_EXCL
	}
	dst, err := os.OpenFile(path, flags, 0o644)
	if err != nil {
		if errors.Is(err, os.ErrExist) {
			response.Fail(c, http.StatusConflict, 409, "resource already exists")
			return
		}
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}

	response.OK(c, nil)
}

func (h *ResourceHandler) Delete(c *gin.Context) {
	base := c.Query("base")
	category := c.Query("category")
	subcategory := c.Query("subcategory")
	name := c.Query("name")
	filename := c.Query("filename")

	path, err := h.resources.Resolve(base, category, subcategory, name, filename)
	if err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid resource path")
		return
	}
	if !service.FileExists(path) {
		response.Fail(c, http.StatusNotFound, 404, "resource not found")
		return
	}
	if err := os.Remove(path); err != nil {
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}

	response.OK(c, nil)
}
