package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	Addr           string
	DBPath         string
	FileRoot       string
	FrontendDist   string
	JWTSecret      []byte
	JWTExpireDays  int
	JWTRefreshDays int
}

func Load() Config {
	env := loadDotEnv(".env")
	return Config{
		Addr:           envDefault(env, "LSDB_ADDR", ":8080"),
		DBPath:         envDefault(env, "LSDB_DB_PATH", defaultPath(filepath.Join("backend", "data", "test.db"), filepath.Join("data", "test.db"))),
		FileRoot:       envDefault(env, "LSDB_FILE_ROOT", defaultPath(filepath.Join("backend", "data", "files"), filepath.Join("data", "files"))),
		FrontendDist:   envDefault(env, "LSDB_FRONTEND_DIST", ""),
		JWTSecret:      []byte(envDefault(env, "LSDB_JWT_SECRET", "dev-secret-change-me")),
		JWTExpireDays:  envIntDefault(env, "LSDB_JWT_EXPIRE_DAYS", 7),
		JWTRefreshDays: envIntDefault(env, "LSDB_JWT_REFRESH_DAYS", 2),
	}
}

func envDefault(dotEnv map[string]string, key, fallback string) string {
	if v := dotEnv[key]; strings.TrimSpace(v) != "" {
		return v
	}
	if v := os.Getenv(key); strings.TrimSpace(v) != "" {
		return v
	}
	return fallback
}

func envIntDefault(dotEnv map[string]string, key string, fallback int) int {
	n, err := strconv.Atoi(envDefault(dotEnv, key, ""))
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}

func defaultPath(rootPath, backendPath string) string {
	if _, err := os.Stat(rootPath); err == nil {
		return rootPath
	}
	return backendPath
}

func loadDotEnv(path string) map[string]string {
	env := map[string]string{}
	file, err := os.Open(path)
	if err != nil {
		return env
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" {
			continue
		}
		env[key] = trimQuotes(value)
	}
	return env
}

func trimQuotes(value string) string {
	if len(value) < 2 {
		return value
	}
	if (value[0] == '"' && value[len(value)-1] == '"') || (value[0] == '\'' && value[len(value)-1] == '\'') {
		return value[1 : len(value)-1]
	}
	return value
}
