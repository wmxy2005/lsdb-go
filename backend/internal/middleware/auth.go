package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"lsdb-go/backend/internal/response"
	"lsdb-go/backend/internal/service"
)

func AuthRequired(auth *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			response.Fail(c, http.StatusUnauthorized, 401, "missing bearer token")
			c.Abort()
			return
		}
		claims, err := auth.ParseToken(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			response.Fail(c, http.StatusUnauthorized, 401, "invalid token")
			c.Abort()
			return
		}
		c.Set("userId", claims.UserID)
		c.Set("username", claims.Name)
		c.Set("claims", claims)
		c.Next()
	}
}

func AuthQueryRequired(auth *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			response.Fail(c, http.StatusUnauthorized, 401, "missing token")
			c.Abort()
			return
		}
		claims, err := auth.ParseToken(token)
		if err != nil {
			response.Fail(c, http.StatusUnauthorized, 401, "invalid token")
			c.Abort()
			return
		}
		c.Set("userId", claims.UserID)
		c.Set("username", claims.Name)
		c.Set("claims", claims)
		c.Next()
	}
}

func AuthHeaderOrQueryRequired(auth *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Query("token")
		header := c.GetHeader("Authorization")
		if strings.HasPrefix(header, "Bearer ") {
			token = strings.TrimPrefix(header, "Bearer ")
		}
		if token == "" {
			response.Fail(c, http.StatusUnauthorized, 401, "missing token")
			c.Abort()
			return
		}
		claims, err := auth.ParseToken(token)
		if err != nil {
			response.Fail(c, http.StatusUnauthorized, 401, "invalid token")
			c.Abort()
			return
		}
		c.Set("userId", claims.UserID)
		c.Set("username", claims.Name)
		c.Set("claims", claims)
		c.Next()
	}
}

func CurrentClaims(c *gin.Context) *service.Claims {
	v, _ := c.Get("claims")
	claims, _ := v.(*service.Claims)
	return claims
}

func CurrentUserID(c *gin.Context) int64 {
	v, _ := c.Get("userId")
	id, _ := v.(int64)
	return id
}
