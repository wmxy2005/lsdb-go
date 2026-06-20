package response

import (
	"net/http"
	"testing"

	"lsdb-go/backend/internal/service"
)

func TestMapErrorItemRenameSentinels(t *testing.T) {
	cases := []struct {
		err    error
		status int
		msg    string
	}{
		{service.ErrItemRenameInvalidName, http.StatusBadRequest, "item name is required"},
		{service.ErrItemRenameSourceMissing, http.StatusConflict, "item source folder does not exist"},
		{service.ErrItemRenameTargetExists, http.StatusConflict, "item target folder already exists"},
	}
	for _, tc := range cases {
		status, _, msg := mapError(tc.err)
		if status != tc.status || msg != tc.msg {
			t.Fatalf("mapError(%v) = %d %q, want %d %q", tc.err, status, msg, tc.status, tc.msg)
		}
	}
}