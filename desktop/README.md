# LSDB 服务器桌面端

Tauri 桌面程序用于管理与自身同目录下的 `server.exe` 和 `.env`。

## 功能

- 启动、停止和重新启动后端服务
- 后台隐藏启动 `server.exe`，不弹出独立控制台窗口
- 实时查看 `server.exe` 的标准输出和错误输出
- 查看和修改同目录下的 `.env`
- 关闭窗口后隐藏到系统托盘
- 通过托盘菜单显示窗口、启动后端、停止后端和退出程序
- 退出桌面程序时自动停止由桌面端启动的后端服务
- `.env` 中设置 `AUTO_RUN_SERVER=true` 时，打开桌面端后自动启动后端服务

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
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

脚本会构建前后端和桌面程序，并将桌面可执行文件、`server.exe`、`.env` 和前端静态资源统一放入 `build/`。
