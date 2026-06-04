package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadReadsDotEnvFromCurrentDirectory(t *testing.T) {
	tmp := t.TempDir()
	oldwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(oldwd)
	if err := os.Chdir(tmp); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(tmp, ".env"), []byte("LSDB_ADDR=:9090\nLSDB_FRONTEND_DIST='../frontend/dist'\nLSDB_JWT_SECRET='from-dotenv'\nLSDB_JWT_EXPIRE_DAYS=3\nLSDB_JWT_REFRESH_DAYS=4\n"), 0o644); err != nil {
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

func TestLoadJWTDaysDefaultAndInvalid(t *testing.T) {
	tmp := t.TempDir()
	oldwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	defer os.Chdir(oldwd)
	if err := os.Chdir(tmp); err != nil {
		t.Fatal(err)
	}
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
