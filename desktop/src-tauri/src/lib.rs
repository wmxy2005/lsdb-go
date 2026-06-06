use serde::Serialize;
use std::{
    collections::VecDeque,
    env, fs,
    io::{BufRead, BufReader},
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
    image::Image,
    menu::{IconMenuItem, Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const LOG_HISTORY_LIMIT: usize = 1000;

struct ServerProcess {
    child: Option<Child>,
    started_at: Option<SystemTime>,
}

#[derive(Clone)]
struct ServerManager(Arc<Mutex<ServerProcess>>);

struct LogHistoryState {
    entries: VecDeque<LogPayload>,
    next_id: u64,
}

#[derive(Clone)]
struct LogHistory(Arc<Mutex<LogHistoryState>>);

#[derive(Clone)]
struct FrontendReady(Arc<Mutex<bool>>);

#[derive(Clone)]
struct TrayMenuState {
    start_item: IconMenuItem<tauri::Wry>,
    stop_item: IconMenuItem<tauri::Wry>,
    tray_icon: TrayIcon<tauri::Wry>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServerStatus {
    running: bool,
    pid: Option<u32>,
    server_path: String,
    started_at_ms: Option<u128>,
}

#[derive(Clone, Serialize)]
struct LogPayload {
    id: u64,
    line: String,
    stream: &'static str,
}

fn blend_pixel(rgba: &mut [u8], width: u32, x: u32, y: u32, color: [u8; 3], alpha: f32) {
    let index = ((y * width + x) * 4) as usize;
    let alpha = alpha.clamp(0.0, 1.0);
    rgba[index] = color[0];
    rgba[index + 1] = color[1];
    rgba[index + 2] = color[2];
    rgba[index + 3] = (alpha * 255.0).round() as u8;
}

fn menu_icon<F>(background: [u8; 3], mut glyph_alpha: F) -> Image<'static>
where
    F: FnMut(f32, f32) -> f32,
{
    const SIZE: u32 = 24;
    const CENTER: f32 = 11.5;
    const RADIUS: f32 = 10.0;
    const EDGE: f32 = 1.0;

    let mut rgba = vec![0; (SIZE * SIZE * 4) as usize];
    for y in 0..SIZE {
        for x in 0..SIZE {
            let px = x as f32 + 0.5;
            let py = y as f32 + 0.5;
            let distance = ((px - CENTER).powi(2) + (py - CENTER).powi(2)).sqrt();
            let background_alpha = ((RADIUS + EDGE - distance) / EDGE).clamp(0.0, 1.0);
            if background_alpha > 0.0 {
                blend_pixel(&mut rgba, SIZE, x, y, background, background_alpha);
            }

            let alpha = glyph_alpha(px, py);
            if alpha > 0.0 {
                blend_pixel(&mut rgba, SIZE, x, y, [255, 255, 255], alpha);
            }
        }
    }
    Image::new_owned(rgba, SIZE, SIZE)
}

fn start_menu_icon() -> Image<'static> {
    menu_icon([34, 197, 94], |x, y| {
        let left = 8.0;
        let top = 6.5;
        let bottom = 17.5;
        let right = 17.0;
        let center_y = 12.0;

        let half_height_at_x = (x - left) * (bottom - top) / (2.0 * (right - left));
        let inside = x >= left && x <= right && (y - center_y).abs() <= half_height_at_x;
        let edge = ((half_height_at_x - (y - center_y).abs()).min(x - left).min(right - x)) / 0.9;
        if inside { edge.clamp(0.0, 1.0) } else { 0.0 }
    })
}

fn stop_menu_icon() -> Image<'static> {
    menu_icon([239, 68, 68], |x, y| {
        let left = 7.5;
        let right = 16.5;
        let top = 7.5;
        let bottom = 16.5;
        let inside = x >= left && x <= right && y >= top && y <= bottom;
        let edge = (x - left)
            .min(right - x)
            .min(y - top)
            .min(bottom - y)
            / 0.8;
        if inside { edge.clamp(0.0, 1.0) } else { 0.0 }
    })
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        let is_minimized = window.is_minimized().unwrap_or(false);
        if is_visible && !is_minimized {
            let _ = window.hide();
        } else {
            show_main_window(app);
        }
    }
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
                process.started_at = None;
                None
            }
            Err(error) => return Err(format!("无法检查后端状态: {error}")),
        },
        None => {
            process.started_at = None;
            None
        }
    };
    let started_at_ms = if pid.is_some() {
        process
            .started_at
            .and_then(|started_at| started_at.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis())
    } else {
        None
    };
    Ok(ServerStatus {
        running: pid.is_some(),
        pid,
        server_path: server_path()?.display().to_string(),
        started_at_ms,
    })
}

fn emit_status(app: &AppHandle, manager: &ServerManager) {
    if let Ok(current) = status(manager) {
        sync_tray_menu(app, &current);
        let _ = app.emit("server-status", current);
    }
}

fn tray_tooltip(current: &ServerStatus) -> &'static str {
    if current.running {
        "LSDB Server - 运行中"
    } else {
        "LSDB Server - 已停止"
    }
}

fn sync_tray_menu(app: &AppHandle, current: &ServerStatus) {
    if let Some(menu_state) = app.try_state::<TrayMenuState>() {
        let _ = menu_state.start_item.set_enabled(!current.running);
        let _ = menu_state.stop_item.set_enabled(current.running);
        let _ = menu_state
            .tray_icon
            .set_tooltip(Some(tray_tooltip(current)));
    }
}

fn emit_log(app: &AppHandle, stream: &'static str, line: impl Into<String>) {
    let line = line.into();
    let payload = if let Some(history) = app.try_state::<LogHistory>() {
        match history.0.lock() {
            Ok(mut history) => {
                let payload = LogPayload {
                    id: history.next_id,
                    line,
                    stream,
                };
                history.next_id += 1;
                history.entries.push_back(payload.clone());
                while history.entries.len() > LOG_HISTORY_LIMIT {
                    history.entries.pop_front();
                }
                payload
            }
            Err(_) => LogPayload {
                id: 0,
                line,
                stream,
            },
        }
    } else {
        LogPayload {
            id: 0,
            line,
            stream,
        }
    };

    let _ = app.emit("log-line", payload);
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
    manager
        .0
        .lock()
        .map_err(|_| "server process state unavailable".to_string())?
        .started_at = Some(SystemTime::now());
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
    manager
        .0
        .lock()
        .map_err(|_| "server process state unavailable".to_string())?
        .started_at = None;
    if let Some(mut child) = child {
        let pid = child.id();
        child
            .kill()
            .map_err(|error| format!("无法停止 server.exe: {error}"))?;
        let _ = child.wait();
        emit_log(app, "system", format!("server.exe 已停止，PID {pid}"));
    }
    let current = status(manager)?;
    sync_tray_menu(app, &current);
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

#[tauri::command]
fn get_log_history(history: State<'_, LogHistory>) -> Result<Vec<LogPayload>, String> {
    let history = history
        .0
        .lock()
        .map_err(|_| "log history unavailable".to_string())?;
    Ok(history.entries.iter().cloned().collect())
}

#[tauri::command]
fn frontend_ready(
    app: AppHandle,
    manager: State<'_, ServerManager>,
    ready: State<'_, FrontendReady>,
) -> Result<ServerStatus, String> {
    let should_check_auto_run = {
        let mut ready = ready
            .0
            .lock()
            .map_err(|_| "frontend ready state unavailable".to_string())?;
        if *ready {
            false
        } else {
            *ready = true;
            true
        }
    };

    if should_check_auto_run && auto_run_server_enabled()? {
        emit_log(
            &app,
            "system",
            "AUTO_RUN_SERVER=true, starting server.exe automatically",
        );
        if let Err(error) = start(&app, &manager) {
            emit_log(&app, "system", error);
        }
    }

    status(&manager)
}

pub fn run() {
    let manager = ServerManager(Arc::new(Mutex::new(ServerProcess {
        child: None,
        started_at: None,
    })));
    let history = LogHistory(Arc::new(Mutex::new(LogHistoryState {
        entries: VecDeque::with_capacity(LOG_HISTORY_LIMIT),
        next_id: 1,
    })));
    let frontend_ready_state = FrontendReady(Arc::new(Mutex::new(false)));
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .manage(manager.clone())
        .manage(history)
        .manage(frontend_ready_state)
        .invoke_handler(tauri::generate_handler![
            get_server_status,
            start_server,
            stop_server,
            restart_server,
            read_env,
            write_env,
            get_log_history,
            frontend_ready
        ])
        .setup(move |app| {
            let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let start_item = IconMenuItem::with_id(
                app,
                "start",
                "启动后端",
                true,
                Some(start_menu_icon()),
                None::<&str>,
            )?;
            let stop_item = IconMenuItem::with_id(
                app,
                "stop",
                "停止后端",
                true,
                Some(stop_menu_icon()),
                None::<&str>,
            )?;
            let quit = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &start_item, &stop_item, &quit])?;
            let tray_manager = manager.clone();
            let tray_icon = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("LSDB Server - 已停止")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show" => {
                        show_main_window(app);
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
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;
            app.manage(TrayMenuState {
                start_item: start_item.clone(),
                stop_item: stop_item.clone(),
                tray_icon,
            });
            emit_status(app.handle(), &manager);

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
