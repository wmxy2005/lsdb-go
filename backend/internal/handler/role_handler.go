package handler

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

type RoleHandler struct{ roles *service.RoleService }

func NewRoleHandler(roles *service.RoleService) *RoleHandler { return &RoleHandler{roles: roles} }

func (h *RoleHandler) Get(c *gin.Context) {
	data, err := h.roles.Get(c.Param("roleId"))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			response.Fail(c, http.StatusNotFound, 404, "role not found")
			return
		}
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}
	response.OK(c, data)
}
