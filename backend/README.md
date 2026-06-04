# LSDB Go Backend

## Run

```powershell
cd backend
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

## Main APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/current`
- `POST /api/auth/logout`
- `GET /api/items`
- `GET /api/items/:id`
- `POST /api/items`
- `PUT /api/items/:id`
- `GET /api/favorites`
- `POST /api/items/:id/favorite`
- `DELETE /api/items/:id/favorite`
- `GET /api/role/:roleId`
- `GET /api/resource`

`/api/resource` is public. All other APIs except register/login require `Authorization: Bearer <token>`.

## Frontend (API testing)

See [`../frontend/README.md`](../frontend/README.md) for the Vite + React dev client used to exercise register, login, items list/detail, roles, favorites, and resource images.
