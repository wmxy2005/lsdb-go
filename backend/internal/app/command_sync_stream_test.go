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

func TestSyncStreamRequiresQueryToken(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("LSDB_DB_PATH", filepath.Join(tmp, "test.db"))
	t.Setenv("LSDB_FILE_ROOT", filepath.Join(tmp, "files"))
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { sqlDB, _ := srv.DB.DB(); sqlDB.Close() }()

	req := httptest.NewRequest(http.MethodGet, "/api/cmd/sync/stream?processId=x", nil)
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("sync stream without token status = %d", w.Code)
	}
}

func TestSyncStartRequiresAuth(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("LSDB_DB_PATH", filepath.Join(tmp, "test.db"))
	t.Setenv("LSDB_FILE_ROOT", filepath.Join(tmp, "files"))
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { sqlDB, _ := srv.DB.DB(); sqlDB.Close() }()

	req := httptest.NewRequest(http.MethodPost, "/api/cmd/sync/start?base=b&category=c&item=i", nil)
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("sync start without token status = %d", w.Code)
	}
}

func TestSyncStartValidationAndUnknownProcess(t *testing.T) {
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

	req := httptest.NewRequest(http.MethodPost, "/api/cmd/sync/start?category=c&item=i", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("sync start missing base status = %d body=%s", w.Code, w.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/cmd/sync/stream?processId=missing&token="+token, nil)
	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("sync stream missing process status = %d body=%s", w.Code, w.Body.String())
	}
}

func TestSyncStreamGzipExcluded(t *testing.T) {
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

	startReq := httptest.NewRequest(http.MethodPost, "/api/cmd/sync/start?base=b&category=c&item=i", nil)
	startW := httptest.NewRecorder()
	srv.Router.ServeHTTP(startW, startReq)
	if startW.Code != http.StatusOK {
		t.Fatalf("sync start status = %d body=%s", startW.Code, startW.Body.String())
	}

	var startResp map[string]any
	if err := json.Unmarshal(startW.Body.Bytes(), &startResp); err != nil {
		t.Fatal(err)
	}
	data := startResp["data"].(map[string]any)
	processID := data["processId"].(string)

	req := httptest.NewRequest(http.MethodGet, "/api/cmd/sync/stream?processId="+processID, nil)
	req.Header.Set("Accept-Encoding", "gzip")
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("sync stream status = %d body=%s", w.Code, w.Body.String())
	}
	if got := w.Header().Get("Content-Encoding"); got == "gzip" {
		t.Fatal("sync stream Content-Encoding = gzip, want uncompressed")
	}
}

func TestSyncStreamWithQueryToken(t *testing.T) {
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

	startReq := httptest.NewRequest(http.MethodPost, "/api/cmd/sync/start?base=b&category=c&item=i", nil)
	startReq.Header.Set("Authorization", "Bearer "+token)
	startW := httptest.NewRecorder()
	srv.Router.ServeHTTP(startW, startReq)
	if startW.Code != http.StatusOK {
		t.Fatalf("sync start status = %d body=%s", startW.Code, startW.Body.String())
	}

	var startResp map[string]any
	if err := json.Unmarshal(startW.Body.Bytes(), &startResp); err != nil {
		t.Fatal(err)
	}
	processID := startResp["data"].(map[string]any)["processId"].(string)

	ts := httptest.NewServer(srv.Router)
	defer ts.Close()

	resp, err := ts.Client().Get(ts.URL + "/api/cmd/sync/stream?processId=" + processID + "&token=" + token)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("sync stream status = %d", resp.StatusCode)
	}
	if contentType := resp.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "text/event-stream") {
		t.Fatalf("sync stream content-type = %q", contentType)
	}

	events := readSyncSSEEvents(t, resp, 2)
	if len(events) < 2 {
		t.Fatalf("events = %#v", events)
	}
	if events[len(events)-1].Event != "done" && events[len(events)-1].Event != "error" {
		t.Fatalf("terminal event = %#v", events[len(events)-1])
	}
}

type parsedSyncSSEEvent struct {
	Event string
	Data  map[string]any
}

func readSyncSSEEvents(t *testing.T, resp *http.Response, minCount int) []parsedSyncSSEEvent {
	t.Helper()
	reader := bufio.NewReader(resp.Body)
	events := make([]parsedSyncSSEEvent, 0, minCount)
	current := parsedSyncSSEEvent{}
	for len(events) < minCount {
		line, err := reader.ReadString('\n')
		if err != nil {
			t.Fatal(err)
		}
		line = strings.TrimSpace(line)
		if line == "" {
			if current.Event != "" {
				events = append(events, current)
				current = parsedSyncSSEEvent{}
			}
			continue
		}
		switch {
		case strings.HasPrefix(line, "event: "):
			current.Event = strings.TrimPrefix(line, "event: ")
		case strings.HasPrefix(line, "data: "):
			if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &current.Data); err != nil {
				t.Fatal(err)
			}
		}
	}
	return events
}
