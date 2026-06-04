package app

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "modernc.org/sqlite"

	"lsdb-go/backend/internal/service"
)

func TestAuthItemsRoleResourceAndFavorites(t *testing.T) {
	tmp := t.TempDir()
	dbPath := filepath.Join(tmp, "test.db")
	fileRoot := filepath.Join(tmp, "files")
	if err := os.MkdirAll(filepath.Join(fileRoot, "wallpaper", "4k", "sky"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Join(fileRoot, "wallpaper", "4k"), 0o755); err != nil {
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
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "sky", "notes.txt"), []byte("ignore"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(fileRoot, "wallpaper", "4k", "logo.png"), tinyPNG(), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := seedDB(dbPath); err != nil {
		t.Fatal(err)
	}

	t.Setenv("LSDB_DB_PATH", dbPath)
	t.Setenv("LSDB_FILE_ROOT", fileRoot)
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer srv.DB.Close()

	token := registerAndLogin(t, srv)
	get := func(path string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		srv.Router.ServeHTTP(w, req)
		return w
	}

	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/items", nil))
	if w.Code != http.StatusAccepted {
		t.Fatalf("items without token status = %d", w.Code)
	}

	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/auth/current", nil))
	if w.Code != http.StatusAccepted {
		t.Fatalf("current user without token status = %d", w.Code)
	}

	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/cmd/shutdown", nil))
	if w.Code != http.StatusAccepted {
		t.Fatalf("cmd without token status = %d", w.Code)
	}

	w = get("/api/auth/current")
	if w.Code != http.StatusOK {
		t.Fatalf("current user status = %d body=%s", w.Code, w.Body.String())
	}
	var currentResp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &currentResp); err != nil {
		t.Fatal(err)
	}
	currentUser := currentResp["data"].(map[string]any)
	if int(currentUser["id"].(float64)) != 1 || currentUser["username"] != "alice" {
		t.Fatalf("current user = %#v", currentUser)
	}
	if _, ok := currentUser["token"]; ok {
		t.Fatalf("fresh current user should not include token: %#v", currentUser)
	}

	oldToken := signTestToken(t, srv.cfg.JWTSecret, 1, "alice", time.Now().Add(-3*24*time.Hour), 7)
	req := httptest.NewRequest(http.MethodGet, "/api/auth/current", nil)
	req.Header.Set("Authorization", "Bearer "+oldToken)
	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("old current user status = %d body=%s", w.Code, w.Body.String())
	}
	if err := json.Unmarshal(w.Body.Bytes(), &currentResp); err != nil {
		t.Fatal(err)
	}
	currentUser = currentResp["data"].(map[string]any)
	refreshedToken, ok := currentUser["token"].(string)
	if !ok || refreshedToken == "" {
		t.Fatalf("expected refreshed token in current user = %#v", currentUser)
	}
	refreshedClaims := parseTestToken(t, srv.cfg.JWTSecret, refreshedToken)
	if refreshedClaims.IssuedAt == nil || time.Since(refreshedClaims.IssuedAt.Time) > 5*time.Second {
		t.Fatalf("refreshed token issuedAt = %#v", refreshedClaims.IssuedAt)
	}

	w = get("/api/items?tag=4k")
	if w.Code != http.StatusOK {
		t.Fatalf("items status = %d body=%s", w.Code, w.Body.String())
	}
	var listResp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &listResp); err != nil {
		t.Fatal(err)
	}
	data := listResp["data"].(map[string]any)
	if int(data["total"].(float64)) != 1 {
		t.Fatalf("total = %v", data["total"])
	}
	items := data["list"].([]any)
	item := items[0].(map[string]any)
	if item["avatarSrc"] == "" {
		t.Fatal("expected avatarSrc")
	}
	if item["createAt"] != "2026-01-02 03:04:05" || item["updateAt"] != "2026-01-02 03:04:06" {
		t.Fatalf("list timestamps = createAt:%#v updateAt:%#v", item["createAt"], item["updateAt"])
	}
	if len(data["roleList"].([]any)) != 1 {
		t.Fatalf("roleList = %#v", data["roleList"])
	}

	w = get("/api/items/1")
	if w.Code != http.StatusOK {
		t.Fatalf("detail status = %d body=%s", w.Code, w.Body.String())
	}
	var detailResp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &detailResp); err != nil {
		t.Fatal(err)
	}
	detail := detailResp["data"].(map[string]any)
	if detail["createAt"] != "2026-01-02 03:04:05" || detail["updateAt"] != "2026-01-02 03:04:06" {
		t.Fatalf("detail timestamps = createAt:%#v updateAt:%#v", detail["createAt"], detail["updateAt"])
	}
	if len(detail["fileList"].([]any)) == 0 {
		t.Fatal("expected fileList")
	}
	if detail["videoThumbnail"] != "extra.png" {
		t.Fatalf("videoThumbnail = %#v", detail["videoThumbnail"])
	}
	assertImageLists(t, detail)
	assertFileList(t, detail["fileList"].([]any))

	w = get("/api/items/2")
	if w.Code != http.StatusOK {
		t.Fatalf("plain detail status = %d body=%s", w.Code, w.Body.String())
	}
	var plainResp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &plainResp); err != nil {
		t.Fatal(err)
	}
	plain := plainResp["data"].(map[string]any)
	if plain["videoThumbnail"] != "plain.png" {
		t.Fatalf("plain videoThumbnail = %#v", plain["videoThumbnail"])
	}

	req = httptest.NewRequest(http.MethodPut, "/api/items/1", strings.NewReader(`{"title":"Sky Updated"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("item update status = %d body=%s", w.Code, w.Body.String())
	}
	var updateResp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &updateResp); err != nil {
		t.Fatal(err)
	}
	updated := updateResp["data"].(map[string]any)
	if updated["createAt"] != "2026-01-02 03:04:05" {
		t.Fatalf("updated createAt = %#v", updated["createAt"])
	}
	updatedAt, ok := updated["updateAt"].(string)
	if !ok || updatedAt == "" || updatedAt == "2026-01-02 03:04:06" {
		t.Fatalf("updated updateAt = %#v", updated["updateAt"])
	}

	w = get("/api/role/1")
	if w.Code != http.StatusOK {
		t.Fatalf("role status = %d body=%s", w.Code, w.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/resource?base=wallpaper&category=4k&name=sky&filename=a.txt", nil)
	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK || strings.TrimSpace(w.Body.String()) != "resource" {
		t.Fatalf("resource status=%d body=%q", w.Code, w.Body.String())
	}

	uploadPath := "/api/resource?base=wallpaper&category=4k&subcategory=&name=forestdawniv&filename=i.png"
	req = httptest.NewRequest(http.MethodPost, uploadPath, nil)
	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusAccepted {
		t.Fatalf("upload without token status = %d", w.Code)
	}

	w = uploadResource(t, srv, token, uploadPath, "first upload")
	if w.Code != http.StatusOK {
		t.Fatalf("upload status = %d body=%s", w.Code, w.Body.String())
	}
	assertMessageResponse(t, w, "")
	w = get("/api/resource?base=wallpaper&category=4k&subcategory=&name=forestdawniv&filename=i.png")
	if w.Code != http.StatusOK || strings.TrimSpace(w.Body.String()) != "first upload" {
		t.Fatalf("uploaded resource status=%d body=%q", w.Code, w.Body.String())
	}

	w = uploadResource(t, srv, token, uploadPath, "second upload")
	if w.Code != http.StatusAccepted {
		t.Fatalf("upload conflict status = %d body=%s", w.Code, w.Body.String())
	}

	w = uploadResource(t, srv, token, uploadPath+"&force=true", "second upload")
	if w.Code != http.StatusOK {
		t.Fatalf("force upload status = %d body=%s", w.Code, w.Body.String())
	}
	assertMessageResponse(t, w, "")
	w = get("/api/resource?base=wallpaper&category=4k&subcategory=&name=forestdawniv&filename=i.png")
	if w.Code != http.StatusOK || strings.TrimSpace(w.Body.String()) != "second upload" {
		t.Fatalf("overwritten resource status=%d body=%q", w.Code, w.Body.String())
	}

	w = uploadResource(t, srv, token, "/api/resource?base=wallpaper&category=4k&name=forestdawniv&filename=../i.png", "unsafe")
	if w.Code != http.StatusAccepted {
		t.Fatalf("unsafe upload status = %d body=%s", w.Code, w.Body.String())
	}

	req = httptest.NewRequest(http.MethodDelete, uploadPath, nil)
	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusAccepted {
		t.Fatalf("delete without token status = %d", w.Code)
	}

	w = deleteResource(t, srv, token, uploadPath)
	if w.Code != http.StatusOK {
		t.Fatalf("delete status = %d body=%s", w.Code, w.Body.String())
	}
	assertMessageResponse(t, w, "")
	w = get("/api/resource?base=wallpaper&category=4k&subcategory=&name=forestdawniv&filename=i.png")
	if w.Code != http.StatusAccepted {
		t.Fatalf("deleted resource get status=%d body=%q", w.Code, w.Body.String())
	}
	w = deleteResource(t, srv, token, uploadPath)
	if w.Code != http.StatusAccepted {
		t.Fatalf("delete missing status = %d body=%s", w.Code, w.Body.String())
	}
	w = deleteResource(t, srv, token, "/api/resource?base=wallpaper&category=4k&name=forestdawniv&filename=../i.png")
	if w.Code != http.StatusAccepted {
		t.Fatalf("unsafe delete status = %d body=%s", w.Code, w.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/items/1/favorite", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("favorite status = %d body=%s", w.Code, w.Body.String())
	}
}

func TestFrontendDistServesStaticFilesAndSPAFallback(t *testing.T) {
	tmp := t.TempDir()
	dbPath := filepath.Join(tmp, "test.db")
	fileRoot := filepath.Join(tmp, "files")
	frontendDist := filepath.Join(tmp, "dist")
	if err := os.MkdirAll(filepath.Join(frontendDist, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(fileRoot, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(frontendDist, "index.html"), []byte("<html>app</html>"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(frontendDist, "assets", "app.js"), []byte("console.log('app')"), 0o644); err != nil {
		t.Fatal(err)
	}

	t.Setenv("LSDB_DB_PATH", dbPath)
	t.Setenv("LSDB_FILE_ROOT", fileRoot)
	t.Setenv("LSDB_FRONTEND_DIST", frontendDist)
	t.Setenv("LSDB_JWT_SECRET", "test-secret")
	srv, err := New()
	if err != nil {
		t.Fatal(err)
	}
	defer srv.DB.Close()

	get := func(path string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		srv.Router.ServeHTTP(w, req)
		return w
	}

	w := get("/")
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "<html>app</html>") {
		t.Fatalf("root status=%d body=%q", w.Code, w.Body.String())
	}

	w = get("/assets/app.js")
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "console.log('app')") {
		t.Fatalf("asset status=%d body=%q", w.Code, w.Body.String())
	}

	w = get("/favicon.ico")
	if w.Code != http.StatusNotFound || strings.Contains(w.Body.String(), "<html>app</html>") {
		t.Fatalf("missing favicon status=%d body=%q", w.Code, w.Body.String())
	}

	w = get("/items/1")
	if w.Code != http.StatusOK || !strings.Contains(w.Body.String(), "<html>app</html>") {
		t.Fatalf("spa fallback status=%d body=%q", w.Code, w.Body.String())
	}

	w = get("/api/unknown")
	if w.Code != http.StatusNotFound || strings.Contains(w.Body.String(), "<html>app</html>") {
		t.Fatalf("api unknown status=%d body=%q", w.Code, w.Body.String())
	}

	if err := os.WriteFile(filepath.Join(frontendDist, "favicon.ico"), []byte("icon"), 0o644); err != nil {
		t.Fatal(err)
	}
	w = get("/favicon.ico")
	if w.Code != http.StatusOK || strings.TrimSpace(w.Body.String()) != "icon" {
		t.Fatalf("favicon status=%d body=%q", w.Code, w.Body.String())
	}
}

func uploadResource(t *testing.T, srv *Server, token, path, content string) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "upload.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, path, &body)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	return w
}

func assertFileList(t *testing.T, files []any) {
	t.Helper()
	counts := map[string]int{}
	types := map[string]string{}
	thumbs := map[string]string{}
	for _, raw := range files {
		file := raw.(map[string]any)
		value := file["value"].(string)
		counts[value]++
		if typ, ok := file["type"].(string); ok {
			types[value] = typ
		}
		if thumb, ok := file["thumbUrl"].(string); ok {
			thumbs[value] = thumb
		}
	}
	if counts["a.txt"] != 1 || types["a.txt"] != "thumbnail" {
		t.Fatalf("expected a.txt once as thumbnail, counts=%#v types=%#v", counts, types)
	}
	if counts["extra.png"] != 1 || types["extra.png"] != "image" {
		t.Fatalf("expected extra.png once as image, counts=%#v types=%#v", counts, types)
	}
	if counts["wide.png"] != 1 || types["wide.png"] != "image" {
		t.Fatalf("expected wide.png once as image, counts=%#v types=%#v", counts, types)
	}
	if counts["small.png"] != 1 || types["small.png"] != "image" {
		t.Fatalf("expected small.png once as image, counts=%#v types=%#v", counts, types)
	}
	if counts["clip.mp4"] != 1 || types["clip.mp4"] != "file" || thumbs["clip.mp4"] != "/video.svg" {
		t.Fatalf("expected clip.mp4 once as video file, counts=%#v types=%#v thumbs=%#v", counts, types, thumbs)
	}
	if counts["notes.txt"] != 0 {
		t.Fatalf("expected notes.txt to be ignored, counts=%#v", counts)
	}
}

func assertImageLists(t *testing.T, detail map[string]any) {
	t.Helper()
	imgList := detail["imgList"].([]any)
	if len(imgList) != 2 {
		t.Fatalf("imgList = %#v", imgList)
	}
	byValue := map[string]map[string]any{}
	for _, raw := range imgList {
		img := raw.(map[string]any)
		value := img["value"].(string)
		byValue[value] = img
	}
	if _, ok := byValue["extra.png"]; ok {
		t.Fatalf("extra.png should be reserved for videoThumbnail: %#v", imgList)
	}
	if int(byValue["wide.png"]["imgIndex"].(float64)) != 1 || int(byValue["small.png"]["imgIndex"].(float64)) != 2 {
		t.Fatalf("imgList indices = %#v", imgList)
	}
	imgList1 := detail["imgList1"].([]any)
	if len(imgList1) != 1 || imgList1[0].(map[string]any)["value"] != "wide.png" {
		t.Fatalf("imgList1 = %#v", imgList1)
	}
	imgList2 := detail["imgList2"].([]any)
	if len(imgList2) != 1 || imgList2[0].(map[string]any)["value"] != "small.png" {
		t.Fatalf("imgList2 = %#v", imgList2)
	}
}

func assertMessageResponse(t *testing.T, w *httptest.ResponseRecorder, message string) {
	t.Helper()
	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp["success"] != true || int(resp["errorCode"].(float64)) != 0 || resp["data"] != nil {
		t.Fatalf("message response = %#v", resp)
	}
	if _, ok := resp["errorMessage"]; ok {
		t.Fatalf("message response should not include errorMessage: %#v", resp)
	}
	_ = message
}

func deleteResource(t *testing.T, srv *Server, token, path string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodDelete, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	return w
}

func registerAndLogin(t *testing.T, srv *Server) string {
	t.Helper()
	body := `{"username":"alice","password":"secret1"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("register status=%d body=%s", w.Code, w.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	srv.Router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("login status=%d body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	data := resp["data"].(map[string]any)
	return data["token"].(string)
}

func signTestToken(t *testing.T, secret []byte, userID int64, username string, issuedAt time.Time, expireDays int) string {
	t.Helper()
	claims := service.Claims{
		UserID: userID,
		Name:   username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(issuedAt.Add(time.Duration(expireDays) * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(issuedAt),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func parseTestToken(t *testing.T, secret []byte, raw string) *service.Claims {
	t.Helper()
	claims := &service.Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		return secret, nil
	})
	if err != nil || !token.Valid {
		t.Fatalf("invalid token err=%v valid=%v", err, token != nil && token.Valid)
	}
	return claims
}

func seedDB(path string) error {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return err
	}
	defer db.Close()
	stmts := []string{
		`CREATE TABLE items (
			id INTEGER PRIMARY KEY, base TEXT, category TEXT, subcategory TEXT, name TEXT,
			createAt TEXT DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
			updateAt TEXT DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
			title TEXT, date TEXT,
			thumbnail TEXT, roll TEXT, trailer TEXT, tag TEXT, tag2 TEXT, tag3 TEXT, extra TEXT, content TEXT, images TEXT, type INTEGER
		)`,
		`CREATE TABLE itemfavi (
			id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, uId INTEGER DEFAULT 0, itemId INTEGER DEFAULT 0,
			datetime text DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')), expired integer DEFAULT 0
		)`,
		`CREATE TABLE role (
			id integer NOT NULL PRIMARY KEY, date datetime, title TEXT, name TEXT, images TEXT, remark TEXT, base TEXT
		)`,
		`INSERT INTO items(id,base,category,subcategory,name,createAt,updateAt,title,date,thumbnail,roll,trailer,tag,tag2,tag3,extra,content,images,type)
		 VALUES(1,'wallpaper','4k','','sky','2026-01-02 03:04:05','2026-01-02 03:04:06','Sky','2026-01-01','a.txt',NULL,'clip.mp4',';4k;sky;',';JPEG;',';HD;',NULL,'content','extra.png;wide.png;small.png',NULL)`,
		`INSERT INTO items(id,base,category,subcategory,name,createAt,updateAt,title,date,thumbnail,roll,trailer,tag,tag2,tag3,extra,content,images,type)
		 VALUES(2,'wallpaper','4k','','plain','2026-01-02 03:04:05','2026-01-02 03:04:06','Plain','2026-01-01','plain.png',NULL,NULL,';plain;',';JPEG;',';HD;',NULL,'content','extra.png',NULL)`,
		`INSERT INTO role(id,date,title,name,images,remark,base) VALUES(1,NULL,'4k=stream',';4k;stream;','4k@4k.jpg;stream@stream.jpg','remark','role')`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

func testPNG(t *testing.T, width, height int) []byte {
	t.Helper()
	var out bytes.Buffer
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	img.Set(0, 0, color.White)
	if err := png.Encode(&out, img); err != nil {
		t.Fatal(err)
	}
	return out.Bytes()
}

func tinyPNG() []byte {
	return []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
		0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
		0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
		0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0, 0x00, 0x00, 0x00,
		0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
	}
}
