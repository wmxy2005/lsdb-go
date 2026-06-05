package handler

import (
	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

type RoleHandler struct{ roles *service.RoleService }

func NewRoleHandler(roles *service.RoleService) *RoleHandler { return &RoleHandler{roles: roles} }

func (h *RoleHandler) Get(c *gin.Context) {
	data, err := h.roles.Get(c.Param("roleId"))
	if err != nil {
		response.FailErrNotFound(c, err, "role not found")
		return
	}
	response.OK(c, data)
}
