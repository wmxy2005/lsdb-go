# 开发文档

> 返回 [README](../README.md) ｜ 相关：[接口文档](API.md) ｜ [部署文档](DEPLOY.md)

## 目录
- [1. 本地开发指南](#1-本地开发指南)
- [2. 测试说明](#2-测试说明)
- [3. 开发规范建议](#3-开发规范建议)
- [4. 常见问题 FAQ](#4-常见问题-faq)
- [5. 后续优化建议](#5-后续优化建议)
- [6. 需要开发者补充的信息](#6-需要开发者补充的信息)

---

## 1. 本地开发指南

> 各子项目需分别启动，互相独立。开发顺序建议：后端 → 前端 →（如需）桌面端。

### 1.1 环境要求
- Go ≥ 1.26
- Node.js（建议 18+）与 pnpm（前端 `npmClient: pnpm`）
- 桌面端：Rust 工具链（stable）+ Tauri 2 依赖（Windows 上需 WebView2、MSVC 构建工具）
- 操作系统：Windows（命令模块/桌面端依赖 Windows；纯后端 API 可在其他平台运行）
- 数据库文件路径（默认 `backend/data/test.db`），首次启动自动建表

### 1.2 启动后端
```powershell
cd backend
Copy-Item .env.example .env   # 首次，按需修改
# 确保数据库与资源目录存在（默认 data/test.db、data/files）
go run ./cmd/server
```
默认监听 `http://localhost:8080`。

### 1.3 启动前端
```powershell
cd frontend
pnpm install
pnpm dev        # 等价 max dev
```
默认 `http://localhost:8000`，`/api` 自动代理到 `8080`。

### 1.4 启动桌面端（Windows）
```powershell
cd desktop
pnpm install
$env:LSDB_SERVER_DIR = "..\build"   # 指向含 server.exe 与 .env 的目录
pnpm tauri dev
```
> 桌面端管理的是「`server.exe`」，因此需先用 `build.ps1 -Backend` 生成 `build/server.exe`（或自行 `go build`），否则启动后端会提示「未找到后端程序」。

### 1.5 初始化数据库
- 后端启动时自动执行 GORM `AutoMigrate`，创建 `user`、`items`、`role`、`itemfavi` 四张表（空库可直接启动）。
- 默认数据库路径由 `LSDB_DB_PATH` 配置（在 `backend/` 下运行时为 `data/test.db`，见 `.env.example`）。
- `itemfavi` 表有复合唯一索引 `idx_itemfavi_user_item`（`user_id` + `item_id`），由 `AutoMigrate` 自动创建。
- 注册首个用户：`POST /api/auth/register`。

### 1.6 数据库维护脚本

在 `backend/` 目录执行；默认连接 `.env` 中的 `LSDB_DB_PATH`（与主程序相同），可选命令行参数覆盖路径。

| 脚本 | 用途 |
| --- | --- |
| `scripts/migrate_test_db.go` | 旧库列名迁移（`createAt`→`created_at`、`userId`→`user_id` 等）、`itemfavi` 去重并创建唯一索引 |
| `scripts/verify_test_db.go` | 打印 `items` / `itemfavi` 行数与抽样数据 |
| `scripts/smoke_test_db.go` | GORM 列表查询 + 收藏写入冒烟测试 |

```powershell
cd backend
go run scripts/migrate_test_db.go
go run scripts/verify_test_db.go
go run scripts/smoke_test_db.go
```

迁移前建议备份：`Copy-Item data\test.db data\test.db.bak`。备档 SQL 见 `scripts/migrate_test_db.sql`。

### 1.7 常见启动问题
- 后端启动即退出 / 报表不存在：检查 `LSDB_DB_PATH` 指向的目录是否可写。
- 前端 401 跳登录：未登录或 Token 过期 → 重新登录（Token 存于 cookie `lsdb_token`）。
- 图片/视频 404：`LSDB_FILE_ROOT` 配置错误或文件不在对应目录层级。
- 桌面端「未找到后端程序」：`server.exe` 不在 `LSDB_SERVER_DIR`/可执行目录。
- 前端 `/tool` CPU 监控无数据：确认已登录；关闭 CPU 开关超过 `LSDB_MONITOR_IDLE_TIMEOUT`（默认 30s）后采样会停止，重新打开开关即可。

---

## 2. 测试说明

后端**已有单元测试**（Go），覆盖部分 service 与 app：

| 测试文件 | 覆盖范围 |
| --- | --- |
| `internal/app/app_test.go` | 应用装配/路由、前端静态托管与 SPA fallback |
| `internal/config/config_test.go` | 配置加载 |
| `internal/repository/item_repository_test.go` | `applyFilters` 的 matchMode AND/OR、category IN（GORM + 内存 SQLite 真实查询） |
| `internal/service/auth_service_test.go` | 注册/登录/JWT |
| `internal/service/resource_service_test.go` | 资源路径解析/穿越防护、图片尺寸缓存命中与失效 |
| `internal/service/command_service_test.go` | 命令服务（含 runner mock） |
| `internal/service/monitor_service_test.go` | CPU 监控按需采样、缓存与空闲停止 |
| `internal/database/database_test.go` | `AutoMigrate` 建表、`itemfavi` 唯一索引 |
| `internal/repository/favorite_repository_test.go` | 收藏时间戳、幂等 Add、软删除恢复 |

运行后端测试：
```powershell
cd backend
go test ./...
```

**前端 / 桌面端**：未发现测试代码（项目中未明确发现）。

**建议补充的测试**：
- 后端：`item_repository` 列表过滤/分页/排序的集成测试（基于内存 SQLite + GORM，`applyFilters` matchMode 用例已覆盖）、`item_service` 派生字段、收藏增删恢复、`/api/resource` Range 与权限。
- 前端：关键页面（items 搜索、登录、详情）的组件测试与 API 客户端的单测（mock request）。
- 桌面端：Rust `auto_run_server_enabled`/`.env` 解析单测；进程启停的集成测试。
- 端到端：登录 → 搜索 → 详情 → 收藏 的 E2E（如 Playwright）。

---

## 3. 开发规范建议

> 以下为结合现有结构给出的建议，便于后续维护。

**目录规范**
- 后端延续 `cmd / internal/{app,config,database,model,repository,service,handler,middleware,response}` 分层，新增能力按「repository→service→handler」三层落位。
- 前端业务代码集中在 `src/{pages,components,services,models,constants,utils}`，禁止改动 `src/.umi*` 生成目录。

**命名规范**
- Go：导出标识符大驼峰，包名小写单词；文件名 `xxx_service.go / xxx_handler.go`。
- 前端：组件 PascalCase，hooks/工具 camelCase，常量 UPPER_CASE。
- `itemfavi` 表列名统一 snake_case（`item_id`/`user_id`/`created_at`/`updated_at`），`(user_id, item_id)` 唯一索引 `idx_itemfavi_user_item`；`items` 时间戳列同为 `created_at`/`updated_at`。

**接口规范**
- 统一响应 `{success,data,errorCode}`；`response.Fail` 返回语义化 HTTP 状态码；前端 `apiRequest` 解析错误 body 后仍据 `success` 判断。
- 路径用复数资源名，动作用 HTTP 方法表达；保持前后端路由契约一致（创建 `POST /api/items`、更新 `PUT /api/items/:id`，前端 `newItem` / `updateItem` 已对齐）。

**错误处理规范**
- service 层返回 `error`（业务错误使用 sentinel，如 `ErrUsernameTaken`）；handler 通过 `response.FailErr` 映射状态码与对外文案。
- 未知内部错误（DB/OS 等）仅服务端 `log.Printf` 记录详情，客户端统一收到 `internal server error`，不暴露 SQL 或路径。

**日志规范**
- 后端当前使用 Gin 默认日志 + `log.Fatal`。建议引入结构化日志（如 `slog`），区分级别，记录请求 ID。

**配置管理规范**
- 区分环境（dev/prod）配置；**生产强制修改 `LSDB_JWT_SECRET`**；`.env` 不入库（确认 `.gitignore` 已忽略，仓库存在 `backend/.env` 需确认是否含敏感值）。

**Git 提交规范**
- 建议采用 Conventional Commits：`feat / fix / docs / refactor / test / chore(scope): 描述`。
- 前端已配置 husky + lint-staged（`*.{js,css,md}` 走 prettier），建议补充提交信息校验与后端 `gofmt/go vet` 钩子。

---

## 4. 常见问题 FAQ

**Q1：登录后接口仍 401？**
Token 存于 cookie `lsdb_token`，请求由 `client.ts` 注入 `Authorization`。检查 cookie 是否写入、是否过期（默认 7 天），以及后端 `LSDB_JWT_SECRET` 是否一致。

**Q2：HTTP 状态码与 body 如何配合？**
失败时 HTTP 状态码与 `errorCode` 一致（如 401/404/409）。前端 `apiRequest` 会把含 `success` 的错误 JSON 正常返回，页面仍按 `success` 字段判断，无需依赖 2xx 伪装。

**Q3：搜索的 `matchMode=or` 如何生效？**
已实现。后端 `applyFilters`（GORM 链式 API）将 keyword / tag / category 归为一组文本条件：`matchMode=or` 时组内用 OR 连接，默认（空）用 AND；base/subcategory/type/日期区间/收藏等标量条件始终与该组 AND。多值 `category` 使用 `IN`（多值 OR）。

**Q4：图片/视频打不开？**
确认 `LSDB_FILE_ROOT` 指向真实资源目录，且文件位于 `base/category/subcategory/name/filename` 的层级；`/api/resource` 会做路径穿越校验，路径含 `..` 会被拒绝。

**Q5：数据库相关报错（no such table / no such column）？**
检查 `LSDB_DB_PATH` 指向的目录是否可写；后端启动时会通过 GORM `AutoMigrate` 自动建表。若使用旧版 camelCase 列名（如 `createAt`、`userId`、`datetime`）或 `itemfavi` 存在重复 `(user_id, item_id)`，在 `backend/` 下执行 `go run scripts/migrate_test_db.go`（读取 `.env` 中的 `LSDB_DB_PATH`）后再启动服务。

**Q6：CPU 监控页空白 / 报错？**
`/tool` 依赖 `GET /api/pc/stream` SSE 实时流（需鉴权，token 通过查询参数传递）。首次数据点为 `cpu: 0`，约 1s 后显示真实占用率。关闭监控开关后连接断开，超过 `LSDB_MONITOR_IDLE_TIMEOUT`（默认 30s，可用 `.env` 配置）采样自动停止。`GET /api/pc` 仍保留为兼容和调试接口。

**Q7：桌面端点击启动报「未找到后端程序」？**
`server.exe` 必须与桌面 exe 同目录（或调试时由 `LSDB_SERVER_DIR` 指定）。先用 `build.ps1 -Backend` 生成。

**Q8：SQLite 写入偶发阻塞？**
`SetMaxOpenConns(1)` 限制单连接，写入串行化，是规避 SQLite 锁的有意设计；高并发写场景需评估。

**Q9：后端托管前端时，缺失的静态文件为何返回 404 而非 index.html？**
`registerFrontend` 对带扩展名（如 `.ico`、`.js`）且未在 `dist/` 中找到的请求返回 404；仅无扩展名的导航路径（如 `/items/1`）才回退 `index.html`，避免将缺失资源误当作 SPA 页面。

---

## 5. 后续优化建议

### 必须优先处理
1. **JWT 密钥安全**：生产环境务必通过环境变量注入并修改 `LSDB_JWT_SECRET`；确认仓库内 `backend/.env` 不含真实密钥/敏感数据。
2. **数据库可演进**：表结构变更复杂时可引入版本化迁移工具（如 goose/golang-migrate）；当前仅用 GORM `AutoMigrate` 建表。
3. **危险命令鉴权**：`/api/cmd/shutdown|restart` 可关机/重启主机，应增加更强的权限校验/二次确认/角色控制。

### 建议优化
1. **CORS / 安全头**：明确生产跨域策略；Tauri `csp: null` 建议收紧。
2. **结构化日志 + 请求追踪**：引入 `slog`，统一日志格式与级别。
3. **输入校验**：对 `ItemWrite`、查询参数做更严格的校验（长度、枚举、日期格式）。
4. **前端类型完善**：`typings.d.ts` 中 `ITEMInfo` 等与后端实际字段对齐，减少 `any` 使用。
5. **补充自动化测试**：前端组件测试、后端集成测试、E2E。

### 长期优化
1. **数据库可演进**：若表结构变更复杂可引入版本化迁移工具（如 goose/golang-migrate）；当前仅用 GORM `AutoMigrate` 建表。
2. **可扩展存储**：资源存储抽象出接口，支持对象存储（S3 等），不强绑本地文件系统。
3. **多平台支持**：将 Windows 专用命令与桌面端能力做平台抽象，支持 Linux/macOS 部署。
4. **性能**：列表查询 `LIKE '%...%'` 无法走索引，数据量大时考虑全文检索（FTS5）或外部搜索引擎。图片宽高已由 `ResourceService.ImageSize` 进程内缓存（键为绝对路径，校验 `mtime`/`size`；上传覆盖或删除后自动失效）。
5. **CI/CD 与容器化**：补充 GitHub Actions（lint/test/build）与（如适用）Docker 镜像。
6. **可观测性**：增加指标（Prometheus）与健康检查端点。

---

## 6. 需要开发者补充的信息

以下信息在现有代码 / 配置中**未能确认**，需要开发者补充以使文档与项目完整：

1. **`SpeedTest`、`Table`、`Home`、`Access` 等页面**：路由已注释，是否为脚手架遗留/计划功能，是否需要保留。
2. **`frontend/src/utils/{jwt.ts, prisma.ts}` 与依赖 `bcryptjs/jsonwebtoken`**：是否实际使用，还是模板残留。
3. **资源目录约定**：`logo.png`、`image-not-found.jpg`、`name@image.jpg` 等命名/层级规范的权威说明。
4. **部署目标平台与运行约束**：是否仅限 Windows，是否需要跨平台。
5. **`vercel.json` 部署细节**与生产 `apiUrl`/跨域策略。
6. **`resBaseList` / `resTypeList`**：示例数据是否需替换为真实业务分类，是否应改为后端下发。
7. **版本与许可证（部分已确认，尚未完全统一）**：
    - 已确认：维护者统一为 `wmxy2005`；桌面端版本 `0.1.0`；前端 [frontend/LICENSE](../frontend/LICENSE) 为 Apache 2.0；UI 页脚版权为 `Copyright © 2025 By wmxy2005`；源码仓库为 `https://github.com/wmxy2005/lsdb-go`。
    - 待补充：根目录统一版本号与 LICENSE；backend/frontend 声明版本。
