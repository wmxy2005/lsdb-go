# LSDB 前端（Web）

LSDB 档案 / 资料管理系统的 Web 前端，基于 **UmiJS Max + React + Ant Design** 构建，提供登录、档案搜索、详情浏览、图片画廊、视频播放、收藏、角色查看、系统工具、实时监控与网络测速等功能。

> 项目总览见根目录 [README](../README.md)，接口细节见 [docs/API.md](../docs/API.md)，后端见 [backend/README.md](../backend/README.md)。

## 技术栈


| 类别   | 技术                                      | 版本              |
| ---- | --------------------------------------- | --------------- |
| 框架   | @umijs/max（UmiJS Max 4）                 | ^4.6.39         |
| UI 库 | antd                                    | ^6.3.5          |
| 组件库  | @ant-design/pro-components              | 3.1.1-1         |
| 视图层  | react / react-dom                       | 18.2.0          |
| 图片画廊 | photoswipe / react-photoswipe-gallery   | ^5.4.4 / ^3.0.2 |
| 视频播放 | xgplayer                                | 3.0.24          |
| 图表   | chart.js / react-chartjs-2              | ^4.5.1 / ^5.3.1 |
| 语言   | TypeScript                              | ^5.0.3          |
| 包管理  | pnpm（`.umirc.ts` 中 `npmClient: 'pnpm'`） | -               |


## 环境要求

- Node.js 18+
- pnpm
- 一个运行中的后端服务（默认 `http://localhost:8080`），见 [backend/README.md](../backend/README.md)

## 快速开始

```powershell
cd frontend
pnpm install
pnpm dev        # 等价 max dev
```

- 默认开发地址：`http://localhost:8000`（UmiJS 默认端口）
- `.umirc.ts` 已配置开发代理：`/api` → `http://localhost:8080`，因此本地开发无需处理跨域。

## 可用脚本（`package.json`）


| 命令                        | 说明                              |
| ------------------------- | ------------------------------- |
| `pnpm dev` / `pnpm start` | 启动开发服务器（`max dev`）              |
| `pnpm build`              | 生产构建（`max build`），产物输出到 `dist/` |
| `pnpm format`             | 使用 Prettier 格式化全部文件             |
| `pnpm setup`              | `max setup`，生成 Umi 临时文件         |


> 提交时由 husky + lint-staged 对 `*.{js,css,md}` 自动执行 Prettier。

## 目录结构

```text
frontend/
├─ .umirc.ts                 # Umi 配置：路由 / 代理 / 布局 / 国际化 / 包管理器
├─ package.json / LICENSE    # 维护者 wmxy2005；Apache 2.0
├─ vercel.json               # Vercel 部署配置
└─ src/
   ├─ app.tsx                # 运行时配置：getInitialState、ProLayout、语言切换、登出
   ├─ access.ts              # 权限定义（login = userId > 0）
   ├─ global.css / search.css
   ├─ constants/
   │  ├─ config.ts           # 业务常量：apiUrl、Token 过期、语言、分类/类型示例
   │  └─ index.ts            # 常量导出（含 DIR_SEP）
   ├─ services/lsdb/
   │  ├─ client.ts           # apiRequest 封装：注入 Bearer Token、401 处理
   │  ├─ LsdbController.ts    # 业务 API：登录/档案/角色/收藏/命令/监控 SSE/测速 URL
   │  └─ typings.d.ts        # LSDB 命名空间响应类型
   ├─ models/                # 全局状态（search、global）
   ├─ pages/
   │  ├─ login.tsx           # 登录页
   │  ├─ items/              # 档案列表/详情/角色 + 子组件（Item/EditItem/Search/EditTag 等）
   │  ├─ Tool/               # 系统工具（关机/重启 + CPU/网络 SSE 监控）
   │  ├─ SpeedTest/          # 网络测速（Ping/下载/上传）
   │  └─ Home|Access|Table/  # Umi 脚手架遗留，路由未启用
   ├─ components/            # 通用组件（Guide 等）
   ├─ utils/                 # 工具（resource/format/jwt/prisma）
   ├─ locales/              # 国际化 zh-CN / en-US
   └─ .umi / .umi-production # Umi 自动生成产物（请勿手动修改）
```

> `src/.umi` 与 `.umi-production` 为 UmiJS 编译生成的中间代码，不属于业务源码，**不应手动修改 / 提交**。

## 路由（`.umirc.ts`）


| 路径               | 页面                         | 菜单 | 权限  |
| ---------------- | -------------------------- | --- | --- |
| `/`              | 重定向到 `/items`              | -   | -   |
| `/items`         | 档案搜索列表                     | 显示  | 需登录 |
| `/items/:itemId` | 档案详情                       | 隐藏  | 需登录 |
| `/items/role`    | 角色详情                       | 隐藏  | 需登录 |
| `/tool`          | 关机/重启 + CPU/网络监控（SSE）      | 显示  | 公开  |
| `/speedTest`     | 网络测速（Ping/下载/上传）           | 显示  | 公开  |
| `/login`         | 登录                         | 隐藏  | 公开  |

> `/tool` 与 `/speedTest` 路由本身不要求登录，但对应 API 默认需 JWT（`LSDB_CMD_SKIP_AUTH=true` 时可跳过，见 [backend/README.md](../backend/README.md)）。


## 搜索与 matchMode

档案列表页（`pages/items/index.tsx`）通过 URL query 驱动搜索。高级筛选表单支持 `keyword`、`category`、`tag`、`dateFrom`/`dateTo` 与 `matchMode`：

- 默认（`matchMode` 为空）：keyword / tag / category 之间 **AND** 匹配
- `matchMode=or`：上述文本条件之间 **OR** 匹配

详见 [docs/API.md](../docs/API.md) 中 `GET /api/items` 参数说明。

## 认证与请求

- 登录成功后，JWT 存于 cookie `lsdb_token`（有效期默认 7 天，见 `config.tokenExpired`）。
- `services/lsdb/client.ts` 的 `apiRequest` 会自动附加请求头 `Authorization: Bearer <token>`；4xx/5xx 且响应体含 `success` 时会解析 JSON 并正常返回，页面仍以 `success` 判断业务成败（详见 [docs/API.md](../docs/API.md)）。
- 权限由 `access.ts` 控制：`login = initialState.userId > 0`；未登录访问受保护路由会展示登录引导。
- 失败时 HTTP 状态码与语义一致（如 401/400/404/409/500），与响应体 `errorCode` 通常相同；勿以 2xx 判断失败。

## 国际化

- 默认语言 `zh-CN`，可在顶栏切换 `zh-CN` / `en-US`（`useLocalStorage` 持久化）。
- 文案位于 `src/locales/zh-CN.ts`、`src/locales/en-US.ts`。

## 构建与部署

```powershell
pnpm build        # 产物输出到 frontend/dist
```

部署方式：

1. **由后端托管（推荐）**：将 `dist/` 提供给后端，设置后端环境变量 `LSDB_FRONTEND_DIST` 指向该目录（如 `../frontend/dist` 或 `./dist`），浏览器访问后端地址即可。仓库根目录的 `build.ps1` 会自动完成此流程。
2. **独立部署（Vercel）**：使用 `vercel.json`；需将 `constants/config.ts` 中的 `apiUrl` 指向实际后端地址并处理跨域（根据代码推测）。

更多构建/部署细节见 [docs/DEPLOY.md](../docs/DEPLOY.md)。

## **Docs / Context Files**

- `doc/llms.txt` — Ant Design enterprise-class React UI library documentation (API reference, components, design specs). Reference this when working with Ant Design components, theming, or layout.

## 版本与许可证


| 项    | 说明                                                          |
| ---- | ----------------------------------------------------------- |
| 版本号  | `package.json` 未声明 `version` 字段（项目中未明确发现）                   |
| 许可证  | [LICENSE](LICENSE)（Apache License 2.0），仅存在于 `frontend/` 子目录 |
| 维护者  | `wmxy2005`（`package.json`）                                  |
| 页脚版权 | `Copyright © 2025 By wmxy2005`（`src/app.tsx`）               |
| 源码仓库 | `https://github.com/wmxy2005/lsdb-go`                       |


项目级统一版本与根目录 LICENSE 见根 [README](../README.md) 与 [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)。

## 已知问题 / 注意事项

- `pages/Tool` 通过 `getPcStatsStreamUrl()` 连接 `GET /api/pc/stream` SSE（token 走 query）；展示 CPU 与上传/下载速度双图表。关闭监控开关或连接断开后，超过 `LSDB_MONITOR_IDLE_TIMEOUT` 后端采样自动停止。`GET /api/pc` 仍保留为兼容轮询接口。
- `pages/SpeedTest` 通过 `speedTestUrl()` + `authHeaders()` 调用 `/api/speedtest/ping|download|upload`（见 [docs/API.md](../docs/API.md)）。
- `src/utils/{jwt.ts, prisma.ts}` 及依赖 `bcryptjs`、`jsonwebtoken` 可能为脚手架遗留，实际认证由后端完成（需确认是否使用）。
- `DIR_SEP` 为 `/`，用于拼接传给后端的相对资源路径（`opendir` 等）；后端会规范化为本机路径。

完整的待补充信息与优化建议见 [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)。
