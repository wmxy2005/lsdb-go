package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data, "errorCode": 0})
}

func Fail(c *gin.Context, status, code int, msg string) {
	if status >= http.StatusBadRequest {
		status = http.StatusAccepted
	}
	c.JSON(status, gin.H{"success": false, "message": msg, "errorCode": code})
}
