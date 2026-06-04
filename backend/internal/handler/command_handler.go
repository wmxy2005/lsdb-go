package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

type CommandHandler struct{ commands *service.CommandService }

func NewCommandHandler(commands *service.CommandService) *CommandHandler {
	return &CommandHandler{commands: commands}
}

func (h *CommandHandler) Run(c *gin.Context) {
	err := h.commands.Run(c.Param("type"), c.Query("path"))
	if err != nil {
		if errors.Is(err, service.ErrUnsupportedCommand) ||
			errors.Is(err, service.ErrUnsupportedPlatform) ||
			errors.Is(err, service.ErrMissingPath) ||
			errors.Is(err, service.ErrInvalidPath) ||
			errors.Is(err, service.ErrUnsafePath) {
			response.Fail(c, http.StatusBadRequest, 400, err.Error())
			return
		}
		response.Fail(c, http.StatusInternalServerError, 500, err.Error())
		return
	}
	response.OK(c, nil)
}
