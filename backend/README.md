# LSDB Go Backend

## Run

```powershell
cd backend
go mod tidy
go run ./cmd/server
```

Default address: `http://localhost:8080`.

## Environment

Configuration is loaded from the `.env` file in the current working directory first, then from system environment variables, then defaults.

- `LSDB_ADDR`: HTTP listen address, default `:8080`.
- `LSDB_DB_PATH`: SQLite database path, default `backend/data/test.db`.
- `LSDB_FILE_ROOT`: resource root, default `backend/data/files`.
- `LSDB_FRONTEND_DIST`: frontend build output directory. Empty by default; use `../frontend/dist` to serve the Vite build from the backend.
- `LSDB_JWT_SECRET`: JWT signing secret, default development value.

When running from `backend`, copy `.env.example` to `.env` and adjust values as needed.

Path priority for `LSDB_DB_PATH`: CLI argument (scripts only) > `.env` > system environment variable > default (`data/test.db` when cwd is `backend`).

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