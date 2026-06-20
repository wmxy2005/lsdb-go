package response

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"lsdb-go/backend/internal/service"
)

const internalErrorMsg = "internal server error"

func FailErr(c *gin.Context, err error) {
	if err == nil {
		return
	}
	status, code, msg := mapError(err)
	if status >= http.StatusInternalServerError {
		log.Printf("request error: %v", err)
	}
	Fail(c, status, code, msg)
}

func FailErrNotFound(c *gin.Context, err error, msg string) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		Fail(c, http.StatusNotFound, 404, msg)
		return
	}
	FailErr(c, err)
}

func mapError(err error) (status, code int, msg string) {
	switch {
	case errors.As(err, new(*service.CommandOutputError)):
		return http.StatusBadRequest, 400, err.Error()
	case errors.Is(err, service.ErrInvalidCredentials):
		return http.StatusUnauthorized, 401, service.ErrInvalidCredentials.Error()
	case errors.Is(err, service.ErrInvalidInput):
		return http.StatusBadRequest, 400, service.ErrInvalidInput.Error()
	case errors.Is(err, service.ErrItemRenameInvalidName):
		return http.StatusBadRequest, 400, service.ErrItemRenameInvalidName.Error()
	case errors.Is(err, service.ErrUsernameTaken):
		return http.StatusConflict, 409, service.ErrUsernameTaken.Error()
	case errors.Is(err, service.ErrItemRenameSourceMissing):
		return http.StatusConflict, 409, service.ErrItemRenameSourceMissing.Error()
	case errors.Is(err, service.ErrItemRenameTargetExists):
		return http.StatusConflict, 409, service.ErrItemRenameTargetExists.Error()
	case errors.Is(err, service.ErrWrongPassword):
		return http.StatusBadRequest, 400, service.ErrWrongPassword.Error()
	case errors.Is(err, service.ErrUnsupportedCommand),
		errors.Is(err, service.ErrUnsupportedPlatform),
		errors.Is(err, service.ErrMissingPath),
		errors.Is(err, service.ErrMissingBase),
		errors.Is(err, service.ErrMissingCategory),
		errors.Is(err, service.ErrMissingItem),
		errors.Is(err, service.ErrMissingProcessID),
		errors.Is(err, service.ErrInvalidPath),
		errors.Is(err, service.ErrUnsafePath),
		errors.Is(err, service.ErrUnsafeValue),
		errors.Is(err, service.ErrSyncTaskNotFound):
		return http.StatusBadRequest, 400, err.Error()
	case errors.Is(err, gorm.ErrDuplicatedKey), isDuplicateConstraint(err):
		return http.StatusConflict, 409, "conflict"
	default:
		return http.StatusInternalServerError, 500, internalErrorMsg
	}
}

func isDuplicateConstraint(err error) bool {
	return strings.Contains(strings.ToLower(err.Error()), "unique constraint failed")
}
