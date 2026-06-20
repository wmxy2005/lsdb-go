package app

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestItemRenameMovesFolderAndKeepsAPIConsistent(t *testing.T) {
	tmp := t.TempDir()
	dbPath := filepath.Join(tmp, "test.db")
	fileRoot := filepath.Join(tmp, "files")
	if err := os.MkdirAll(filepath.Join(fileRoot, "wallpaper", "4k", "sky"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(fileRoot, "wallpaper", "4k", "plain"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "sky", "a.txt"), []byte("resource"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "sky", "extra.png"), tinyPNG(), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "sky", "wide.png"), testPNG(t, 240, 2), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "sky", "small.png"), testPNG(t, 120, 2), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "sky", "clip.mp4"), []byte("video"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "logo.png"), tinyPNG(), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("LSDB_DB_PATH", dbPath)
	t.Setenv("LSDB_FILE_ROOT", fileRoot)
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { sqlDB, _ := srv.DB.DB(); sqlDB.Close() }()
	if err := seedData(srv.DB); err != nil {
		t.Fatal(err)
	}
	token := registerAndLogin(t, srv)
	get := func(path string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		srv.Router.ServeHTTP(w, req)
		return w
	}

	req := httptest.NewRequest(http.MethodPut, "/api/items/1", strings.NewReader(`{"name":" sky-renamed "}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("item rename status = %d body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	data := resp["data"].(map[string]any)
	if data["name"] != "sky-renamed" {
		t.Fatalf("renamed name = %#v", data["name"])
	}
	if _, err := os.Stat(filepath.Join(fileRoot, "wallpaper", "4k", "sky-renamed", "a.txt")); err != nil {
		t.Fatalf("renamed folder missing resource: %v", err)
	}
	if _, err := os.Stat(filepath.Join(fileRoot, "wallpaper", "4k", "sky")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("old folder should be gone, stat err = %v", err)
	}
	w = get("/api/resource?base=wallpaper&category=4k&name=sky-renamed&filename=a.txt")
	if w.Code != http.StatusOK || strings.TrimSpace(w.Body.String()) != "resource" {
		t.Fatalf("renamed resource status=%d body=%q", w.Code, w.Body.String())
	}
	w = get("/api/resource?base=wallpaper&category=4k&name=sky&filename=a.txt")
	if w.Code != http.StatusNotFound {
		t.Fatalf("old resource path status=%d body=%q", w.Code, w.Body.String())
	}
}

func TestItemRenameConflictScenarios(t *testing.T) {
	tmp := t.TempDir()
	dbPath := filepath.Join(tmp, "test.db")
	fileRoot := filepath.Join(tmp, "files")
	if err := os.MkdirAll(filepath.Join(fileRoot, "wallpaper", "4k", "sky"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(fileRoot, "wallpaper", "4k", "plain"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "sky", "a.txt"), []byte("resource"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("LSDB_DB_PATH", dbPath)
	t.Setenv("LSDB_FILE_ROOT", fileRoot)
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { sqlDB, _ := srv.DB.DB(); sqlDB.Close() }()
	if err := seedData(srv.DB); err != nil {
		t.Fatal(err)
	}
	token := registerAndLogin(t, srv)
	requestRename := func(body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPut, "/api/items/1", strings.NewReader(body))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		srv.Router.ServeHTTP(w, req)
		return w
	}

	w := requestRename(`{"name":"   "}`)
	if w.Code != http.StatusBadRequest || !strings.Contains(w.Body.String(), "item name is required") {
		t.Fatalf("empty name status=%d body=%s", w.Code, w.Body.String())
	}

	w = requestRename(`{"name":"plain"}`)
	if w.Code != http.StatusConflict || !strings.Contains(w.Body.String(), "item target folder already exists") {
		t.Fatalf("existing target status=%d body=%s", w.Code, w.Body.String())
	}
	var name string
	if err := srv.DB.Table("items").Where("id = ?", 1).Pluck("name", &name).Error; err != nil {
		t.Fatal(err)
	}
	if name != "sky" {
		t.Fatalf("name after target conflict = %q", name)
	}
	if _, err := os.Stat(filepath.Join(fileRoot, "wallpaper", "4k", "sky", "a.txt")); err != nil {
		t.Fatalf("source folder should remain after target conflict: %v", err)
	}

	if err := os.RemoveAll(filepath.Join(fileRoot, "wallpaper", "4k", "sky")); err != nil {
		t.Fatal(err)
	}
	w = requestRename(`{"name":"sky-missing"}`)
	if w.Code != http.StatusConflict || !strings.Contains(w.Body.String(), "item source folder does not exist") {
		t.Fatalf("missing source status=%d body=%s", w.Code, w.Body.String())
	}
	if err := srv.DB.Table("items").Where("id = ?", 1).Pluck("name", &name).Error; err != nil {
		t.Fatal(err)
	}
	if name != "sky" {
		t.Fatalf("name after missing source conflict = %q", name)
	}
}