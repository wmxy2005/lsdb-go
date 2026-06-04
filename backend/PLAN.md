# Go Archive Management Backend Plan

## Summary
- Build a Gin + SQLite backend under `backend`.
- Use existing SQLite data: `items`, `itemfavi`, and `role`.
- Add a `user` table for register/login with bcrypt password hashes and Bearer JWT auth.
- Rename/migrate `itemfavi.uId` to `itemfavi.userId`, matching `user.id`.
- Require auth for every API except register, login, and `/api/resource`.
- Match list/detail/role response shapes from `backend/data/items.json`, `item.json`, and `role.json`.

## Key Behavior
- `LSDB_DB_PATH` defaults to `backend/data/test.db`.
- `LSDB_FILE_ROOT` defaults to `backend/data/files`.
- `LSDB_JWT_SECRET` configures JWT signing.
- `/api/resource` is public and reads from `LSDB_FILE_ROOT/base/category/subcategory/name/filename`.
- `force=true` on `/api/resource` returns `image-not-found.jpg` if the target is missing.
- `avatarSrc` checks `category/logo.png` first, then `subcategory/logo.png`; if neither exists, it is empty.

## API
- `POST /api/auth/register`
- `POST /api/auth/login`
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

## Tests
- Register/login/auth guard.
- `itemfavi.userId` migration.
- Items list/detail response enrichment.
- Role response enrichment.
- Resource streaming, path traversal rejection, and `force=true` fallback.
- Favorite add/remove/restore.
