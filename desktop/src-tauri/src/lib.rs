use serde::Serialize;
use std::{
    env, fs,
    io::{BufRead, BufReader},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, State, WindowEvent,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

struct ServerProcess {
    child: Option<Child>,
}

#[derive(Clone)]
struct ServerManager(Arc<Mutex<ServerProcess>>);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServerStatus {
    running: bool,
    pid: Option<u32>,
    server_path: String,
}

#[derive(Clone, Serialize)]
struct LogPayload {
    line: String,
    stream: &'static str,
}

fn server_dir() -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        if let Some(path) = env::var_os("LSDB_SERVER_DIR") {
            return Ok(PathBuf::from(path));
        }
    }
    let executable =
        env::current_exe().map_err(|error| format!("无法确定桌面程序路径: {error}"))?;
    executable
        .parent()
        .map(PathBuf::from)
        .ok_or_else(|| "无法确定桌面程序所在目录".to_string())
}

fn server_path() -> Result<PathBuf, String> {
    Ok(server_dir()?.join("server.exe"))
}

fn env_path() -> Result<PathBuf, String> {
    Ok(server_dir()?.join(".env"))
}

fn auto_run_server_enabled() -> Result<bool, String> {
    let path = env_path()?;
    if !path.exists() {
        return Ok(false);
    }

    let content = fs::read_to_string(&path)
        .map_err(|error| format!("无法读取 {}: {error}", path.display()))?;

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((key, value)) = line.split_once('=') else {
            continue;
        };

        if key.trim() == "AUTO_RUN_SERVER" {
            let value = value.trim().trim_matches(['"', '\'']);
            return Ok(value.eq_ignore_ascii_case("true"));
        }
    }

    Ok(false)
}

fn status(manager: &ServerManager) -> Result<ServerStatus, String> {
    let mut process = manager
        .0
        .lock()
        .map_err(|_| "后端进程状态不可用".to_string())?;
    let pid = match process.child.as_mut() {
        Some(child) => match child.try_wait() {
            Ok(None) => Some(child.id()),
            Ok(Some(_)) => {
                process.child = None;
                None
            }
            Err(error) => return Err(format!("无法检查后端状态: {error}")),
        },
        None => None,
    };
    Ok(ServerStatus {
        running: pid.is_some(),
        pid,
        server_path: server_path()?.display().to_string(),
    })
}

fn emit_status(app: &AppHandle, manager: &ServerManager) {
    if let Ok(current) = status(manager) {
        let _ = app.emit("server-status", current);
    }
}

fn emit_log(app: &AppHandle, stream: &'static str, line: impl Into<String>) {
    let _ = app.emit(
        "log-line",
        LogPayload {
            line: line.into(),
            stream,
        },
    );
}

fn stream_logs<R: std::io::Read + Send + 'static>(app: AppHandle, stream: &'static str, reader: R) {
    thread::spawn(move || {
        for line in BufReader::new(reader).lines() {
            match line {
                Ok(line) => emit_log(&app, stream, line),
                Err(error) => {
                    emit_log(&app, "system", format!("读取 {stream} 失败: {error}"));
                    break;
                }
            }
        }
    });
}

fn start(app: &AppHandle, manager: &ServerManager) -> Result<ServerStatus, String> {
    let current = status(manager)?;
    if current.running {
        return Ok(current);
    }

    let executable = server_path()?;
    if !executable.is_file() {
        return Err(format!("未找到后端程序: {}", executable.display()));
    }
    let working_dir = server_dir()?;
    let mut command = Command::new(&executable);
    command
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command
        .spawn()
        .map_err(|error| format!("无法启动 server.exe: {error}"))?;

    if let Some(stdout) = child.stdout.take() {
        stream_logs(app.clone(), "stdout", stdout);
    }
    if let Some(stderr) = child.stderr.take() {
        stream_logs(app.clone(), "stderr", stderr);
    }

    let pid = child.id();
    manager
        .0
        .lock()
        .map_err(|_| "后端进程状态不可用".to_string())?
        .child = Some(child);
    emit_log(app, "system", format!("server.exe 已启动，PID {pid}"));
    emit_status(app, manager);

    let monitor_app = app.clone();
    let monitor_manager = manager.clone();
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(500));
        let was_running = match status(&monitor_manager) {
            Ok(status) => status.running,
            Err(_) => false,
        };
        if !was_running {
            emit_log(&monitor_app, "system", "server.exe 已退出");
            emit_status(&monitor_app, &monitor_manager);
            break;
        }
    });

    status(manager)
}

fn stop(app: &AppHandle, manager: &ServerManager) -> Result<ServerStatus, String> {
    let child = manager
        .0
        .lock()
        .map_err(|_| "后端进程状态不可用".to_string())?
        .child
        .take();
    if let Some(mut child) = child {
        let pid = child.id();
        child
            .kill()
            .map_err(|error| format!("无法停止 server.exe: {error}"))?;
        let _ = child.wait();
        emit_log(app, "system", format!("server.exe 已停止，PID {pid}"));
    }
    let current = status(manager)?;
    let _ = app.emit("server-status", current.clone());
    Ok(current)
}

#[tauri::command]
fn get_server_status(manager: State<'_, ServerManager>) -> Result<ServerStatus, String> {
    status(&manager)
}

#[tauri::command]
fn start_server(app: AppHandle, manager: State<'_, ServerManager>) -> Result<ServerStatus, String> {
    start(&app, &manager)
}

#[tauri::command]
fn stop_server(app: AppHandle, manager: State<'_, ServerManager>) -> Result<ServerStatus, String> {
    stop(&app, &manager)
}

#[tauri::command]
fn restart_server(
    app: AppHandle,
    manager: State<'_, ServerManager>,
) -> Result<ServerStatus, String> {
    stop(&app, &manager)?;
    start(&app, &manager)
}

#[tauri::command]
fn read_env() -> Result<String, String> {
    let path = env_path()?;
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|error| format!("无法读取 {}: {error}", path.display()))
}

#[tauri::command]
fn write_env(content: String) -> Result<(), String> {
    let path = env_path()?;
    fs::write(&path, content).map_err(|error| format!("无法写入 {}: {error}", path.display()))
}

pub fn run() {
    let manager = ServerManager(Arc::new(Mutex::new(ServerProcess { child: None })));
    tauri::Builder::default()
        .manage(manager.clone())
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            start_server,
            stop_server,
            restart_server,
            read_env,
            write_env
        ])
        .setup(move |app| {
            let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let start_item = MenuItem::with_id(app, "start", "启动后端", true, None::<&str>)?;
            let stop_item = MenuItem::with_id(app, "stop", "停止后端", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &start_item, &stop_item, &quit])?;
            let tray_manager = manager.clone();
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "start" => {
                        if let Err(error) = start(app, &tray_manager) {
                            emit_log(app, "system", error);
                        }
                    }
                    "stop" => {
                        if let Err(error) = stop(app, &tray_manager) {
                            emit_log(app, "system", error);
                        }
                    }
                    "quit" => {
                        let _ = stop(app, &tray_manager);
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            if auto_run_server_enabled()? {
                emit_log(
                    app.handle(),
                    "system",
                    "AUTO_RUN_SERVER=true，正在自动启动 server.exe",
                );
                if let Err(error) = start(app.handle(), &manager) {
                    emit_log(app.handle(), "system", error);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("failed to run desktop application");
}
