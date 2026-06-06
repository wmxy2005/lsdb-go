# LSDB Go Backend

## Run

```powershell
cd backend
go mod tidy
go run ./cmd/server
```

Default local address: `http://localhost:8080`.

For LAN access, keep `LSDB_ADDR=:8080` and open `http://<this-machine-LAN-IP>:8080` from another device, for example `http://192.168.10.87:8080`. `localhost` always means the device you are using, so other LAN devices cannot use `http://localhost:8080` to reach this server.

## Environment

Configuration is loaded from the `.env` file in the current working directory first, then the `.env` file next to the running executable, then system environment variables, then defaults.

- `LSDB_ADDR`: HTTP listen address, default `:8080`.
- `LSDB_DB_PATH`: SQLite database path, default `backend/data/test.db`.
- `LSDB_FILE_ROOT`: resource root, default `backend/data/files`.
- `LSDB_FRONTEND_DIST`: frontend build output directory. Empty by default; use `../frontend/dist` to serve the Vite build from the backend.
- `LSDB_JWT_SECRET`: JWT signing secret, default development value.
- `LSDB_CMD_SKIP_AUTH`: skip authentication for command, monitor, and speed test endpoints, default `false`. When set to `true`, `/api/cmd/:type`, `/api/pc`, and `/api/speedtest/*` are exposed without authentication; keep it disabled outside local or trusted environments.

When running from `backend`, copy `.env.example` to `.env` and adjust values as needed. Packaged builds can keep `.env` next to `server.exe` (for example `build/.env`), including UTF-8 files with a BOM.

Path priority for `LSDB_DB_PATH`: CLI argument (scripts only) > current directory `.env` > executable directory `.env` > system environment variable > default (`data/test.db` when cwd is `backend`).

## LAN troubleshooting

`LSDB_ADDR=:8080` is recommended for LAN use because it listens on all network interfaces. If you set `LSDB_ADDR=127.0.0.1:8080` or `LSDB_ADDR=localhost:8080`, the backend only accepts requests from the same machine.

On Windows, allow `server.exe` through Windows Defender Firewall or open inbound TCP port `8080`. Quick checks:

```powershell
netstat -ano | findstr :8080
ipconfig
```

If you use `LSDB_ADDR=:80`, startup may require Administrator permission or port 80 may already be used by IIS, Apache, Nginx, or another local service.

## Database scripts

Run from `backend/` so scripts read `backend/.env`. Default database path is `LSDB_DB_PATH`; pass an optional path to override.

| Script | Purpose |
| --- | --- |
| `scripts/migrate_test_db.go` | Legacy schema fix: rename camelCase columns, add timestamps, dedupe `itemfavi`, create `idx_itemfavi_user_item` unique index |
| `scripts/verify_test_db.go` | Print row counts and sample rows from `items` / `itemfavi` |
| `scripts/smoke_test_db.go` | Smoke test: GORM list + favorite add against the configured DB |

```powershell
cd backend
go run scripts/migrate_test_db.go
go run scripts/verify_test_db.go
go run scripts/smoke_test_db.go

# Override .env path
go run scripts/migrate_test_db.go data/other.db
```

SQL reference: `scripts/migrate_test_db.sql`. Backup before migrating production data.

## API

See [../docs/API.md](../docs/API.md) for data models and full endpoint documentation.

## Frontend (API testing)

See `[../frontend/README.md](../frontend/README.md)` for the UmiJS + React dev client used to exercise register, login, items list/detail, roles, favorites, and resource images.

Full project docs: `[../README.md](../README.md)` · `[../docs/API.md](../docs/API.md)` · `[../docs/DEPLOY.md](../docs/DEPLOY.md)` · `[../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)`
