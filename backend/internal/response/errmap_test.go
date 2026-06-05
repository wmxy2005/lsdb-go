package response

import (
	"errors"
	"net/http"
	"testing"

	"gorm.io/gorm"

	"lsdb-go/backend/internal/service"
)

func TestMapErrorRecordNotFoundViaFailErrNotFound(t *testing.T) {
	status, code, msg := mapError(gorm.ErrRecordNotFound)
	if status != http.StatusInternalServerError {
		t.Fatalf("mapError(RecordNotFound) status=%d, want 500 for generic FailErr", status)
	}
	if code != 500 || msg != internalErrorMsg {
		t.Fatalf("mapError(RecordNotFound) = %d %q", code, msg)
	}
}

func TestMapErrorDuplicateConstraint(t *testing.T) {
	status, code, msg := mapError(errors.New("UNIQUE constraint failed: user.username"))
	if status != http.StatusConflict || code != 409 || msg != "conflict" {
		t.Fatalf("mapError(duplicate) = %d %d %q", status, code, msg)
	}
}

func TestMapErrorInternal(t *testing.T) {
	status, code, msg := mapError(errors.New("no such table: items"))
	if status != http.StatusInternalServerError || code != 500 || msg != internalErrorMsg {
		t.Fatalf("mapError(internal) = %d %d %q", status, code, msg)
	}
}

func TestMapErrorAuthSentinels(t *testing.T) {
	cases := []struct {
		err    error
		status int
		msg    string
	}{
		{service.ErrInvalidCredentials, http.StatusUnauthorized, "invalid username or password"},
		{service.ErrInvalidInput, http.StatusBadRequest, "username and password length >= 6 are required"},
		{service.ErrUsernameTaken, http.StatusConflict, "username already exists"},
	}
	for _, tc := range cases {
		status, _, msg := mapError(tc.err)
		if status != tc.status || msg != tc.msg {
			t.Fatalf("mapError(%v) = %d %q, want %d %q", tc.err, status, msg, tc.status, tc.msg)
		}
	}
}
