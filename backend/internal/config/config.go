package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr               string
	DBPath             string
	FileRoot           string
	FrontendDist       string
	GinMode            string
	JWTSecret          []byte
	JWTExpireDays      int
	JWTRefreshDays     int
	CmdSkipAuth        bool
	MonitorIdleTimeout time.Duration
	CORSOrigins        []string
}

var executablePath = os.Executable

func Load() Config {
	env := loadRuntimeDotEnv()
	return Config{
		Addr:               envDefault(env, "LSDB_ADDR", ":8080"),
		DBPath:             envDefault(env, "LSDB_DB_PATH", defaultPath(filepath.Join("backend", "data", "test.db"), filepath.Join("data", "test.db"))),
		FileRoot:           envDefault(env, "LSDB_FILE_ROOT", defaultPath(filepath.Join("backend", "data", "files"), filepath.Join("data", "files"))),
		FrontendDist:       envDefault(env, "LSDB_FRONTEND_DIST", ""),
		GinMode:            envDefault(env, "LSDB_GIN_MODE", ""),
		JWTSecret:          []byte(envDefault(env, "LSDB_JWT_SECRET", "dev-secret-change-me")),
		JWTExpireDays:      envIntDefault(env, "LSDB_JWT_EXPIRE_DAYS", 7),
		JWTRefreshDays:     envIntDefault(env, "LSDB_JWT_REFRESH_DAYS", 2),
		CmdSkipAuth:        envBoolDefault(env, "LSDB_CMD_SKIP_AUTH", false),
		MonitorIdleTimeout: envDurationDefault(env, "LSDB_MONITOR_IDLE_TIMEOUT", 30*time.Second),
		CORSOrigins:        envStringSliceDefault(env, "LSDB_CORS_ORIGINS", nil),
	}
}

func loadRuntimeDotEnv() map[string]string {
	paths := []string{".env"}
	if exe, err := executablePath(); err == nil {
		if dir := filepath.Dir(exe); dir != "." {
			paths = append(paths, filepath.Join(dir, ".env"))
		}
	}
	return loadDotEnvFiles(paths...)
}

func loadDotEnvFiles(paths ...string) map[string]string {
	env := map[string]string{}
	for i := len(paths) - 1; i >= 0; i-- {
		for key, value := range loadDotEnv(paths[i]) {
			env[key] = value
		}
	}
	return env
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

func envDurationDefault(dotEnv map[string]string, key string, fallback time.Duration) time.Duration {
	raw := envDefault(dotEnv, key, "")
	if raw == "" {
		return fallback
	}
	if d, err := time.ParseDuration(raw); err == nil && d > 0 {
		return d
	}
	if n, err := strconv.Atoi(raw); err == nil && n > 0 {
		return time.Duration(n) * time.Second
	}
	return fallback
}

func envBoolDefault(dotEnv map[string]string, key string, fallback bool) bool {
	b, err := strconv.ParseBool(envDefault(dotEnv, key, ""))
	if err != nil {
		return fallback
	}
	return b
}

func envIntDefault(dotEnv map[string]string, key string, fallback int) int {
	n, err := strconv.Atoi(envDefault(dotEnv, key, ""))
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}

func envStringSliceDefault(dotEnv map[string]string, key string, fallback []string) []string {
	raw := envDefault(dotEnv, key, "")
	if raw == "" {
		return fallback
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	if len(out) == 0 {
		return fallback
	}
	return out
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
		key = strings.TrimPrefix(strings.TrimSpace(key), "\ufeff")
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
