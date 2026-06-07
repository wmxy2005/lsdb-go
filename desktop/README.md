# LSDB 服务器桌面端

Tauri 桌面程序用于管理与自身同目录下的 `server.exe` 和 `.env`。

> 项目总览见根目录 [README](../README.md)，部署见 [docs/DEPLOY.md](../docs/DEPLOY.md)。

- **版本**：`0.1.0`（`package.json`、`tauri.conf.json`、`Cargo.toml`）
- **维护者**：`wmxy2005`

## 功能

- 启动、停止和重新启动后端服务
- 后台隐藏启动 `server.exe`，不弹出独立控制台窗口
- 实时查看 `server.exe` 的标准输出和错误输出
- 查看和修改同目录下的 `.env`
- 关闭窗口后隐藏到系统托盘
- 通过托盘菜单显示窗口、启动后端、停止后端和退出程序
- 退出桌面程序时自动停止由桌面端启动的后端服务
- `.env` 中设置 `AUTO_RUN_SERVER=true` 时，打开桌面端后自动启动后端服务
- `.env` 中设置 `AUTO_RUN_MINIMIZE=true` 时，启动后隐藏主界面，仅驻留系统托盘

## 开发

```powershell
pnpm install
$env:LSDB_SERVER_DIR = "..\build"
pnpm tauri dev
```

`LSDB_SERVER_DIR` 仅在调试构建中生效。正式构建始终使用桌面程序自身所在目录。

## 构建

在仓库根目录执行：

```powershell
# 交互选择构建目标
powershell -ExecutionPolicy Bypass -File .\build.ps1

# 非交互（CI/脚本）
powershell -ExecutionPolicy Bypass -File .\build.ps1 -All
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Frontend
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Backend
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Desktop
```

无参数时会显示菜单，可选择全部或单独构建 Frontend、Backend、Desktop。脚本会将桌面可执行文件、`server.exe`、`.env` 和前端静态资源统一放入 `build/`。
