# 接口文档 / 数据模型

> 返回 [README](../README.md) ｜ 相关：[部署文档](DEPLOY.md) ｜ [开发文档](DEVELOPMENT.md)
>
> 文中标注「根据代码推测」为依据源码推断，「项目中未明确发现」表示现有代码无对应依据。

## 目录
- [1. 数据模型 / 数据库设计](#1-数据模型--数据库设计)
- [2. 接口文档](#2-接口文档)

---

## 1. 数据模型 / 数据库设计

数据库为 **SQLite**，路径由环境变量 `LSDB_DB_PATH` 配置（在 `backend/` 下运行时默认 `data/test.db`，见 `.env.example`）。数据访问层使用 **GORM**（纯 Go 驱动 `github.com/glebarez/sqlite`，无 CGO 依赖）。
四张表（`user`、`items`、`itemfavi`、`role`）均由 GORM `AutoMigrate` 在启动时自动创建。旧版 camelCase 列名或需补齐 `itemfavi` 唯一索引时，在 `backend/` 执行 `go run scripts/migrate_test_db.go`（默认读取 `.env` 中的 `LSDB_DB_PATH`）。以下字段含义结合 `model.go` 整理。

### 1.1 user（迁移创建，结构明确）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER PK AUTOINCREMENT | 用户 ID |
| username | TEXT UNIQUE NOT NULL | 用户名（唯一） |
| password_hash | TEXT NOT NULL | bcrypt 哈希 |
| created_at | TEXT | 创建时间（本地时间） |
| updated_at | TEXT | 更新时间 |

### 1.2 items
| 字段 | 类型(推断) | 说明 |
| --- | --- | --- |
| id | INTEGER PK | 档案 ID |
| base / category / subcategory | TEXT | 三级分类 |
| name | TEXT | 资源目录名 |
| created_at / updated_at | TEXT | 创建/更新时间 |
| title | TEXT | 标题 |
| date | TEXT | 业务日期（用于排序/筛选） |
| thumbnail | TEXT | 缩略图文件名 |
| roll / trailer | TEXT | 关联文件/预告片（视频） |
| tag / tag2 / tag3 | TEXT | 标签，`;a;b;` 包裹格式 |
| extra | TEXT | 附加信息 |
| content | TEXT | 正文内容 |
| images | TEXT | 图片列表，`;` 分隔 |
| type | INTEGER | 类型 |

### 1.3 itemfavi（收藏）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER PK AUTOINCREMENT | 收藏记录 ID |
| item_id | INTEGER | 关联 `items.id` |
| user_id | INTEGER | 关联 `user.id` |
| expired | INTEGER | 0=有效，1=已取消（软删除） |
| created_at | TEXT | 收藏创建时间 |
| updated_at | TEXT | 收藏更新时间（排序用；恢复收藏时更新） |

> 唯一性：数据库层强制 `UNIQUE(user_id, item_id)`，索引名 `idx_itemfavi_user_item`（GORM `AutoMigrate` 自动创建）。取消收藏仅设 `expired=1`，不新增行。

### 1.4 role
| 字段 | 类型(推断) | 说明 |
| --- | --- | --- |
| id | INTEGER PK | 角色 ID |
| date | TEXT | 日期 |
| title | TEXT | 标题 |
| name | TEXT | 角色名集合，`;` 分隔 → `nameList` |
| images | TEXT | `name@image.jpg;...` → `imageList` |
| remark | TEXT | 备注 |
| base | TEXT | 所属 base |

**关系图（推断）：**

```mermaid
erDiagram
  user ||--o{ itemfavi : "user_id"
  items ||--o{ itemfavi : "item_id"
  items }o..o{ role : "按 tag 文本匹配 role.name（非外键）"

  user { int id PK; string username; string password_hash }
  items { int id PK; string base; string category; string subcategory; string tag }
  itemfavi { int id PK; int item_id FK; int user_id FK; int expired }
  role { int id PK; string name; string images; string base }
```

> `items` 与 `role` 之间**没有外键**，而是通过标签文本（`role.name` 的分号标签是否出现在查询 tag/keyword 中）进行匹配。

---

## 2. 接口文档

**基础约定**
- 基础路径前缀：`/api`
- 鉴权：除「公开」接口外，均需请求头 `Authorization: Bearer <token>`
- 成功响应：`{ "success": true, "data": <any>, "errorCode": 0 }`
- 失败响应：`{ "success": false, "message": "...", "errorCode": <int> }`；HTTP 状态码与语义一致（如 401/400/404/409/500）。
- 前端 `apiRequest` 在 4xx/5xx 时解析上述 JSON 并返回，页面仍以 `success` 字段判断业务成败。

### 路由总览

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公开 | 注册 |
| POST | `/api/auth/login` | 公开 | 登录 |
| GET | `/api/resource` | 公开 | 读取资源文件 |
| GET | `/api/auth/current` | ✅ | 当前用户 + Token 续期 |
| POST | `/api/auth/logout` | ✅ | 登出 |
| GET | `/api/items` | ✅ | 档案列表 |
| GET | `/api/items/:id` | ✅ | 档案详情 |
| POST | `/api/items` | ✅ | 创建档案 |
| PUT | `/api/items/:id` | ✅ | 更新档案 |
| GET | `/api/favorites` | ✅ | 收藏列表 |
| POST | `/api/items/:id/favorite` | ✅ | 收藏 |
| DELETE | `/api/items/:id/favorite` | ✅ | 取消收藏 |
| GET | `/api/role/:roleId` | ✅ | 角色详情 |
| POST | `/api/resource` | ✅ | 上传资源 |
| DELETE | `/api/resource` | ✅ | 删除资源 |
| POST | `/api/cmd/:type` | ✅ | 系统命令（Windows） |

### 2.1 认证

#### POST /api/auth/register（公开）
- 说明：注册用户。用户名唯一，密码长度 ≥ 6。
- 请求体：
```json
{ "username": "alice", "password": "secret123" }
```
- 成功响应：
```json
{ "success": true, "errorCode": 0, "data": { "id": 1, "username": "alice" } }
```
- 失败：用户名重复 → HTTP **409**；校验失败 → HTTP **400**；`success:false`。

#### POST /api/auth/login（公开）
- 说明：登录，返回 JWT。
- 请求体：`{ "username": "alice", "password": "secret123" }`
- 成功响应：
```json
{ "success": true, "errorCode": 0,
  "data": { "token": "<jwt>", "user": { "id": 1, "username": "alice" } } }
```

#### GET /api/auth/current（需鉴权）
- 说明：返回当前用户；若 Token 签发已超过 `LSDB_JWT_REFRESH_DAYS`，返回新 `token`（滑动续期）。
- 成功响应：`{ "success": true, "data": { "id": 1, "username": "alice", "token": "<可选新token>" } }`

#### POST /api/auth/logout（需鉴权）
- 说明：JWT 无状态登出，服务端返回空对象。
- 成功响应：`{ "success": true, "data": {} }`

### 2.2 档案 Item

#### GET /api/items（需鉴权）
- 说明：档案列表查询。
- 查询参数（均可选）：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| base | string | base 精确匹配 |
| category | string/数组 | 支持逗号/分号多值 |
| subcategory | string | 精确匹配 |
| keyword | string/数组 | 模糊匹配 name/title/content/extra |
| tag | string/数组 | 匹配 tag/tag2/tag3（`%;v;%`） |
| dateFrom / dateTo | string | 日期区间（`a.date >= / <=`） |
| matchMode | string | 文本条件匹配模式：`or` 时 keyword / tag / category 之间用 OR 连接，默认（空）用 AND；base/subcategory/type/日期等标量条件始终 AND |
| favi | bool | true 仅返回已收藏 |
| type | string | 类型过滤 |
| sort | string | `date`/`dateAsc`/`idAsc`/默认(id desc) |
| page / current | int | 页码（默认 1） |
| pageSize | int | 每页（默认 20，最大 100） |

- 成功响应（节选关键字段）：
```json
{
  "success": true,
  "data": {
    "page": 1, "current": 1, "pageSize": 20, "pages": 5, "total": 92,
    "costTime": 0.0123,
    "roleList": [],
    "title": "...", "message": "92 record(s), 5 page(s)",
    "list": [
      {
        "id": 1, "base": "wallpaper", "category": "...", "name": "...",
        "title": "...", "tag": ";a;b;", "isFavi": false,
        "avatar": "WAL", "avatarSrc": "/api/resource?...logo.png",
        "tagList": [{"type":"base","tagIndex":0,"value":"wallpaper"}],
        "thumbnailW": 320, "thumbnailH": 200
      }
    ]
  }
}
```

#### GET /api/items/:id（需鉴权）
- 说明：档案详情，相比列表额外返回 `imgList`、`imgList1`(宽图≥200)、`imgList2`(窄图)、`fileList`、`videoThumbnail`。
- 失败：不存在 → `success:false`（原意 404）。

#### POST /api/items（需鉴权）
- 说明：创建档案，创建后返回详情。
- 请求体（`ItemWrite`，字段均可选，标签支持字符串或数组）：
```json
{
  "base": "wallpaper", "category": "nature", "name": "sunset",
  "title": "日落", "date": "2025-01-01",
  "tag": ["风景", "日落"], "images": "a.jpg;b.jpg", "type": 0
}
```
- 成功响应：`{ "success": true, "data": { ...item detail... } }`

#### PUT /api/items/:id（需鉴权）
- 说明：部分更新，未提供字段不更新；无任何可更新字段时返回失败（原意 400）。
- 请求体：同 `ItemWrite` 子集。

**前后端契约（已对齐）**

| 操作 | 前端（`LsdbController.ts`） | 后端路由 |
| --- | --- | --- |
| 创建 | `newItem` → `POST /api/items/` | `POST /api/items` |
| 更新 | `updateItem(id)` → `PUT /api/items/:id` | `PUT /api/items/:id` |

`EditItem` 组件在 `itemData.id > 0` 时调用 `updateItem`，否则调用 `newItem`。

### 2.3 收藏 Favorite

#### GET /api/favorites（需鉴权）
- 说明：等价于列表接口并强制 `favi=true`，返回结构同 `GET /api/items`。

#### POST /api/items/:id/favorite（需鉴权）
- 说明：收藏；若存在过期记录则恢复为 `expired=0`。
- 成功响应：`{ "success": true, "data": { "item_id": "1", "isFavi": true } }`

#### DELETE /api/items/:id/favorite（需鉴权）
- 说明：取消收藏（软删除 `expired=1`）。
- 成功响应：`{ "success": true, "data": { "item_id": "1", "isFavi": false } }`

### 2.4 角色 Role

#### GET /api/role/:roleId（需鉴权）
- 说明：角色详情，返回 `nameList`、`imageList`（含 `imageSrc`）。
- 成功响应（节选）：
```json
{ "success": true, "data": {
  "id": 1, "title": "...", "name": "甲;乙", "base": "wallpaper",
  "nameList": [{"nameIndex":1,"name":"甲"},{"nameIndex":2,"name":"乙"}],
  "imageList": [{"nameIndex":0,"name":"甲","image":"a.jpg","imageSrc":"/api/resource?force=true&..."}]
}}
```

### 2.5 资源 Resource

#### GET /api/resource（公开）
- 说明：按 `base/category/subcategory/name/filename` 从 `LSDB_FILE_ROOT` 读取文件并流式返回（`http.ServeFile`，支持图片/视频 Range）。空路径段跳过；防路径穿越。
- 查询参数：`base, category, subcategory, name, filename, force`
- `force=true`：文件不存在时回退到 `image-not-found.jpg`（若存在）。
- 响应：文件二进制流（200）；不存在 → 失败响应。

#### POST /api/resource（需鉴权，上传）
- 说明：`multipart/form-data` 上传文件到指定资源路径，字段名 `file`。`force=true` 允许覆盖。
- 查询参数同上（`filename` 必填）。
- 失败：已存在且非 force → 409（body 体现）。

#### DELETE /api/resource（需鉴权）
- 说明：删除指定资源文件。

### 2.6 系统命令 Command（需鉴权，仅 Windows）

#### POST /api/cmd/:type（需鉴权）
- `:type` 可为 `shutdown` / `restart` / `opendir`。
- `opendir` 需查询参数 `path`（相对 `LSDB_FILE_ROOT`，禁止 `..`/绝对路径，须为已存在目录）。
- 非 Windows 平台返回错误（原意 400）。

#### GET /api/pc（需鉴权）
- 说明：返回整机 CPU 占用率与网络速度缓存，保留为监控调试与兼容接口。
- 成功：`{ success: true, data: { time, cpu, uploadSpeed, downloadSpeed }, errorCode: 0 }`
  - `time`：采样时间，格式 `HH:MM:SS`
  - `cpu`：整机 CPU 占用百分比（0~100）
  - `uploadSpeed` / `downloadSpeed`：上传/下载速度，单位 MB/s
- 语义：HTTP 请求只读上一采样周期写入的缓存；goroutine 在收到请求后按需启动（每 1s 采样），超过 `LSDB_MONITOR_IDLE_TIMEOUT`（默认 30s）无新请求则自动停止。
- 首次调用（或采样重启后尚无新样本）返回 `cpu: 0`。

#### GET /api/pc/stream（需鉴权）
- 说明：SSE 实时监控流，供 `/tool` 页监控图表使用。
- 鉴权：浏览器 `EventSource` 无法设置 `Authorization` 头，需通过查询参数传 token：`/api/pc/stream?token=<jwt>`。`LSDB_CMD_SKIP_AUTH=true` 时可不传。
- 事件：默认 `message` 事件，每 1s 推送一次 JSON：`{ time, cpu, uploadSpeed, downloadSpeed }`。
- 连接关闭后停止刷新活跃时间；超过 `LSDB_MONITOR_IDLE_TIMEOUT` 后后端采样自动停止。
