package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/middleware"
	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

type AuthHandler struct{ auth *service.AuthService }

func NewAuthHandler(auth *service.AuthService) *AuthHandler { return &AuthHandler{auth: auth} }

func (h *AuthHandler) Register(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid request")
		return
	}
	data, err := h.auth.Register(req.Username, req.Password)
	if err != nil {
		response.FailErr(c, err)
		return
	}
	response.OK(c, data)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid request")
		return
	}
	data, err := h.auth.Login(req.Username, req.Password)
	if err != nil {
		response.FailErr(c, err)
		return
	}
	response.OK(c, data)
}

func (h *AuthHandler) Current(c *gin.Context) {
	userID, _ := c.Get("userId")
	username, _ := c.Get("username")
	data := gin.H{"id": userID, "username": username}
	token, refreshed, err := h.auth.RefreshTokenIfNeeded(middleware.CurrentClaims(c))
	if err != nil {
		response.FailErr(c, err)
		return
	}
	if refreshed {
		data["token"] = token
	}
	response.OK(c, data)
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req struct {
		OldPassword string `json:"oldPassword"`
		NewPassword string `json:"newPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "invalid request")
		return
	}
	username, _ := c.Get("username")
	name, _ := username.(string)
	if err := h.auth.ChangePassword(name, req.OldPassword, req.NewPassword); err != nil {
		response.FailErr(c, err)
		return
	}
	response.OK(c, gin.H{})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	response.OK(c, gin.H{})
}
