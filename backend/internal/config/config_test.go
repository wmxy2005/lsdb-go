package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadReadsDotEnvFromCurrentDirectory(t *testing.T) {
	tmp := chdirTemp(t)
	if err := os.WriteFile(filepath.Join(tmp, ".env"), []byte("LSDB_ADDR=:9090\nLSDB_FRONTEND_DIST='../frontend/dist'\nLSDB_GIN_MODE=release\nLSDB_JWT_SECRET='from-dotenv'\nLSDB_JWT_EXPIRE_DAYS=3\nLSDB_JWT_REFRESH_DAYS=4\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("LSDB_ADDR", ":8081")
	t.Setenv("LSDB_FRONTEND_DIST", "from-env")

	cfg := Load()
	if cfg.Addr != ":9090" {
		t.Fatalf("Addr = %q", cfg.Addr)
	}
	if cfg.FrontendDist != "../frontend/dist" {
		t.Fatalf("FrontendDist = %q", cfg.FrontendDist)
	}
	if cfg.GinMode != "release" {
		t.Fatalf("GinMode = %q", cfg.GinMode)
	}
	if string(cfg.JWTSecret) != "from-dotenv" {
		t.Fatalf("JWTSecret = %q", string(cfg.JWTSecret))
	}
	if cfg.JWTExpireDays != 3 {
		t.Fatalf("JWTExpireDays = %d", cfg.JWTExpireDays)
	}
	if cfg.JWTRefreshDays != 4 {
		t.Fatalf("JWTRefreshDays = %d", cfg.JWTRefreshDays)
	}
}

func TestLoadReadsDotEnvFromExecutableDirectory(t *testing.T) {
	runDir := chdirTemp(t)
	exeDir := t.TempDir()
	withExecutablePath(t, filepath.Join(exeDir, "server.exe"))
	if err := os.WriteFile(filepath.Join(exeDir, ".env"), []byte("LSDB_ADDR=:9091\nLSDB_FRONTEND_DIST=./dist\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Setenv("LSDB_ADDR", ":8081")

	cfg := Load()
	if cfg.Addr != ":9091" {
		t.Fatalf("Addr = %q", cfg.Addr)
	}
	if cfg.FrontendDist != "./dist" {
		t.Fatalf("FrontendDist = %q", cfg.FrontendDist)
	}
	if _, err := os.Stat(filepath.Join(runDir, ".env")); !os.IsNotExist(err) {
		t.Fatalf("current directory .env should not exist: %v", err)
	}
}

func TestLoadReadsDotEnvWithUTF8BOM(t *testing.T) {
	chdirTemp(t)
	exeDir := t.TempDir()
	withExecutablePath(t, filepath.Join(exeDir, "server.exe"))
	if err := os.WriteFile(filepath.Join(exeDir, ".env"), []byte("\ufeffLSDB_ADDR=:80\nLSDB_FRONTEND_DIST=./dist\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg := Load()
	if cfg.Addr != ":80" {
		t.Fatalf("Addr = %q", cfg.Addr)
	}
	if cfg.FrontendDist != "./dist" {
		t.Fatalf("FrontendDist = %q", cfg.FrontendDist)
	}
}

func TestLoadCurrentDirectoryDotEnvOverridesExecutableDirectory(t *testing.T) {
	runDir := chdirTemp(t)
	exeDir := t.TempDir()
	withExecutablePath(t, filepath.Join(exeDir, "server.exe"))
	if err := os.WriteFile(filepath.Join(exeDir, ".env"), []byte("LSDB_ADDR=:9091\nLSDB_FRONTEND_DIST=./dist\nLSDB_JWT_SECRET=from-exe\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(runDir, ".env"), []byte("LSDB_ADDR=:9092\nLSDB_JWT_SECRET=from-cwd\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg := Load()
	if cfg.Addr != ":9092" {
		t.Fatalf("Addr = %q", cfg.Addr)
	}
	if cfg.FrontendDist != "./dist" {
		t.Fatalf("FrontendDist = %q", cfg.FrontendDist)
	}
	if string(cfg.JWTSecret) != "from-cwd" {
		t.Fatalf("JWTSecret = %q", string(cfg.JWTSecret))
	}
}

func TestLoadJWTDaysDefaultAndInvalid(t *testing.T) {
	tmp := chdirTemp(t)
	withExecutablePath(t, filepath.Join(t.TempDir(), "server.exe"))
	t.Setenv("LSDB_ADDR", "")
	t.Setenv("LSDB_FRONTEND_DIST", "")
	t.Setenv("LSDB_JWT_EXPIRE_DAYS", "")
	t.Setenv("LSDB_JWT_REFRESH_DAYS", "")

	cfg := Load()
	if cfg.JWTExpireDays != 7 {
		t.Fatalf("default JWTExpireDays = %d", cfg.JWTExpireDays)
	}
	if cfg.JWTRefreshDays != 2 {
		t.Fatalf("default JWTRefreshDays = %d", cfg.JWTRefreshDays)
	}

	if err := os.WriteFile(filepath.Join(tmp, ".env"), []byte("LSDB_JWT_EXPIRE_DAYS=bad\nLSDB_JWT_REFRESH_DAYS=bad\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg = Load()
	if cfg.JWTExpireDays != 7 {
		t.Fatalf("invalid JWTExpireDays = %d", cfg.JWTExpireDays)
	}
	if cfg.JWTRefreshDays != 2 {
		t.Fatalf("invalid JWTRefreshDays = %d", cfg.JWTRefreshDays)
	}

	if err := os.WriteFile(filepath.Join(tmp, ".env"), []byte("LSDB_JWT_EXPIRE_DAYS=0\nLSDB_JWT_REFRESH_DAYS=0\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg = Load()
	if cfg.JWTExpireDays != 7 {
		t.Fatalf("non-positive JWTExpireDays = %d", cfg.JWTExpireDays)
	}
	if cfg.JWTRefreshDays != 2 {
		t.Fatalf("non-positive JWTRefreshDays = %d", cfg.JWTRefreshDays)
	}
}

func chdirTemp(t *testing.T) string {
	t.Helper()
	tmp := t.TempDir()
	oldwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(oldwd); err != nil {
			t.Fatal(err)
		}
	})
	if err := os.Chdir(tmp); err != nil {
		t.Fatal(err)
	}
	return tmp
}

func withExecutablePath(t *testing.T, path string) {
	t.Helper()
	old := executablePath
	executablePath = func() (string, error) {
		return path, nil
	}
	t.Cleanup(func() {
		executablePath = old
	})
}
