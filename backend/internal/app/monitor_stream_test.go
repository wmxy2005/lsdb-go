package app

import (
	"bufio"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func TestPCStreamRequiresQueryToken(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("LSDB_DB_PATH", filepath.Join(tmp, "test.db"))
	t.Setenv("LSDB_FILE_ROOT", filepath.Join(tmp, "files"))
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { sqlDB, _ := srv.DB.DB(); sqlDB.Close() }()

	req := httptest.NewRequest(http.MethodGet, "/api/pc/stream", nil)
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("pc stream without token status = %d", w.Code)
	}
}

func TestPCStreamSendsSnapshotWithQueryToken(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("LSDB_DB_PATH", filepath.Join(tmp, "test.db"))
	t.Setenv("LSDB_FILE_ROOT", filepath.Join(tmp, "files"))
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { sqlDB, _ := srv.DB.DB(); sqlDB.Close() }()

	token := registerAndLogin(t, srv)
	ts := httptest.NewServer(srv.Router)
	defer ts.Close()

	req, err := http.NewRequest(http.MethodGet, ts.URL+"/api/pc/stream?token="+token, nil)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := ts.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("pc stream status = %d", resp.StatusCode)
	}
	if contentType := resp.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "text/event-stream") {
		t.Fatalf("pc stream content-type = %q", contentType)
	}

	event := readFirstSSEEvent(t, resp)
	if event["time"] == "" {
		t.Fatalf("pc stream event missing time: %#v", event)
	}
	if _, ok := event["cpu"].(float64); !ok {
		t.Fatalf("pc stream event missing cpu: %#v", event)
	}
	if _, ok := event["uploadSpeed"].(float64); !ok {
		t.Fatalf("pc stream event missing uploadSpeed: %#v", event)
	}
	if _, ok := event["downloadSpeed"].(float64); !ok {
		t.Fatalf("pc stream event missing downloadSpeed: %#v", event)
	}
}

func TestPCStreamSendsSnapshotWithBearerToken(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("LSDB_DB_PATH", filepath.Join(tmp, "test.db"))
	t.Setenv("LSDB_FILE_ROOT", filepath.Join(tmp, "files"))
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { sqlDB, _ := srv.DB.DB(); sqlDB.Close() }()

	token := registerAndLogin(t, srv)
	ts := httptest.NewServer(srv.Router)
	defer ts.Close()

	req, err := http.NewRequest(http.MethodGet, ts.URL+"/api/pc/stream", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := ts.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("pc stream status = %d", resp.StatusCode)
	}
	_ = readFirstSSEEvent(t, resp)
}

func TestPCStreamSkipAuth(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("LSDB_DB_PATH", filepath.Join(tmp, "test.db"))
	t.Setenv("LSDB_FILE_ROOT", filepath.Join(tmp, "files"))
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	t.Setenv("LSDB_CMD_SKIP_AUTH", "true")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { sqlDB, _ := srv.DB.DB(); sqlDB.Close() }()

	ts := httptest.NewServer(srv.Router)
	defer ts.Close()

	resp, err := ts.Client().Get(ts.URL + "/api/pc/stream")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("pc stream skip auth status = %d", resp.StatusCode)
	}
	_ = readFirstSSEEvent(t, resp)
}

func readFirstSSEEvent(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			t.Fatal(err)
		}
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "data: ") {
			continue
		}

		var event map[string]any
		if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &event); err != nil {
			t.Fatal(err)
		}
		return event
	}
}
