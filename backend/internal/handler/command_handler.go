package handler

import (
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
		response.FailErr(c, err)
		return
	}
	response.OK(c, nil)
}
