package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestFailUsesSemanticStatusCode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	Fail(c, http.StatusUnauthorized, 401, "missing bearer token")

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", w.Code, http.StatusUnauthorized)
	}
	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["success"] != false {
		t.Fatalf("success = %v", body["success"])
	}
	if body["message"] != "missing bearer token" {
		t.Fatalf("message = %v", body["message"])
	}
	if int(body["errorCode"].(float64)) != 401 {
		t.Fatalf("errorCode = %v", body["errorCode"])
	}
}
