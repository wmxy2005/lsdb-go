# LSDB 前端（shadcn 版）

基于 **Vite + React + shadcn/ui + Tailwind v4** 的新前端，与现有 [`frontend/`](../frontend/)（Umi + Ant Design）并列存在，共用同一套 Go 后端 API。

## 技术栈

| 类别 | 技术 |
|------|------|
| 构建 | Vite 6 |
| UI | shadcn/ui（new-york）+ Tailwind v4 + OKLCH token |
| 路由 | react-router-dom v6 |
| 数据 | @tanstack/react-query |
| URL 状态 | nuqs |
| 动效 | framer-motion |

## 环境要求

- Node.js 18+
- pnpm
- 运行中的后端（默认 `http://localhost:8080`）

## 快速开始

```powershell
# 终端 1：启动后端
cd backend
go run ./cmd/server

# 终端 2：启动新前端
cd frontend-shadcn
pnpm install
pnpm dev
```

- 开发地址：`http://localhost:5173`
- `/api` 代理到 `http://localhost:8080`

## 路由

| 路径 | 说明 | 鉴权 |
|------|------|------|
| `/items` | 档案列表（筛选、分页、hover roll 预览） | 需登录 |
| `/items/:itemId` | 档案详情（画廊、视频、编辑） | 需登录 |
| `/items/role?id=` | 角色详情 | 需登录 |
| `/tool` | 关机/重启 + SSE 监控 | 公开（API 需 token） |
| `/speedTest` | 网络测速 | 公开（API 需 token） |
| `/login` | 登录 | 公开 |

## 构建

```powershell
pnpm build   # 产物输出到 dist/
```

> 本阶段不修改 `build.ps1` 与 `LSDB_FRONTEND_DIST`。部署时需手动将 `dist/` 指向后端静态目录。

## 与旧前端关系

- 旧版 [`frontend/`](../frontend/) 保持不变，可独立 `pnpm dev`（端口 8000）
- 新版功能对齐后端 API，UI 重新设计（浅色优先 + 暗色切换）
- 支持响应式布局：移动端汉堡菜单 + Sheet 导航/搜索，各页面自适应网格与操作区
