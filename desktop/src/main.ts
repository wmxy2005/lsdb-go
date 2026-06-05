import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./styles.css";

type ServerStatus = {
  running: boolean;
  pid: number | null;
  serverPath: string;
  startedAtMs?: number | null;
};

type LogPayload = {
  id: number;
  line: string;
  stream: "stdout" | "stderr" | "system";
};

type ThemeMode = "system" | "light" | "dark";

const themeStorageKey = "lsdb-theme";
const themeModes: ThemeMode[] = ["system", "light", "dark"];

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const statusElement = byId<HTMLDivElement>("status");
const statusText = byId<HTMLSpanElement>("status-text");
const statusDetail = byId<HTMLParagraphElement>("status-detail");
const serverPath = byId<HTMLParagraphElement>("server-path");
const logs = byId<HTMLPreElement>("logs");
const editor = byId<HTMLTextAreaElement>("env-editor");
const message = byId<HTMLElement>("message");
const startButton = byId<HTMLButtonElement>("start-button");
const stopButton = byId<HTMLButtonElement>("stop-button");
const restartButton = byId<HTMLButtonElement>("restart-button");
const copyPathButton = byId<HTMLButtonElement>("copy-path-button");
const themeButtons = document.querySelectorAll<HTMLButtonElement>(".theme-option");

let running = false;
let currentStatus: ServerStatus | null = null;
let messageTimer: number | undefined;
const seenLogIds = new Set<number>();

function isThemeMode(value: string | null): value is ThemeMode {
  return themeModes.includes(value as ThemeMode);
}

function applyTheme(mode: ThemeMode) {
  if (mode === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = mode;
  }

  themeButtons.forEach((button) => {
    const active = button.dataset.themeMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function initializeTheme() {
  const savedMode = localStorage.getItem(themeStorageKey);
  applyTheme(isThemeMode(savedMode) ? savedMode : "system");
}

function setTheme(mode: ThemeMode) {
  localStorage.setItem(themeStorageKey, mode);
  applyTheme(mode);
}

function showMessage(text: string, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    message.textContent = "";
  }, 4500);
}

function appendLog(payload: LogPayload) {
  if (payload.id > 0) {
    if (seenLogIds.has(payload.id)) {
      return;
    }
    seenLogIds.add(payload.id);
  }

  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  logs.textContent += `[${timestamp}] [${payload.stream}] ${payload.line}\n`;
  logs.scrollTop = logs.scrollHeight;
}

function formatRuntimeDuration(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function updateStatusDetail() {
  if (!currentStatus?.running) {
    statusDetail.textContent = "服务未运行";
    return;
  }

  if (typeof currentStatus.startedAtMs !== "number") {
    statusDetail.textContent = "已运行 --:--:--";
    return;
  }

  statusDetail.textContent = `已运行 ${formatRuntimeDuration(Date.now() - currentStatus.startedAtMs)}`;
}

function applyStatus(status: ServerStatus) {
  currentStatus = status;
  running = status.running;
  statusElement.classList.toggle("running", running);
  statusText.textContent = running
    ? `运行中 · PID ${status.pid ?? "-"}`
    : "已停止";
  updateStatusDetail();
  serverPath.textContent = status.serverPath;
  startButton.disabled = running;
  stopButton.disabled = !running;
}

async function refreshStatus() {
  applyStatus(await invoke<ServerStatus>("get_server_status"));
}

async function runAction(action: "start_server" | "stop_server" | "restart_server") {
  try {
    applyStatus(await invoke<ServerStatus>(action));
  } catch (error) {
    showMessage(String(error), true);
    await refreshStatus();
  }
}

async function loadEnv() {
  try {
    editor.value = await invoke<string>("read_env");
  } catch (error) {
    showMessage(String(error), true);
  }
}

startButton.addEventListener("click", () => runAction("start_server"));
stopButton.addEventListener("click", () => runAction("stop_server"));
restartButton.addEventListener("click", () => runAction("restart_server"));
copyPathButton.addEventListener("click", async () => {
  const path = serverPath.textContent?.trim() ?? "";
  if (!path || path === "正在读取程序路径...") {
    showMessage("服务路径尚未加载。", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(path);
    showMessage("服务路径已复制。");
  } catch (error) {
    showMessage(`复制服务路径失败：${String(error)}`, true);
  }
});
themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.themeMode ?? null;
    if (isThemeMode(mode)) {
      setTheme(mode);
    }
  });
});
byId("clear-button").addEventListener("click", () => {
  logs.textContent = "";
});
byId("reload-env-button").addEventListener("click", loadEnv);
byId("save-env-button").addEventListener("click", async () => {
  try {
    await invoke("write_env", { content: editor.value });
    showMessage(running ? "配置已保存，重新启动服务后生效。" : "配置已保存。");
  } catch (error) {
    showMessage(String(error), true);
  }
});

document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    byId(`${tab.dataset.tab}-panel`).classList.add("active");
  });
});

async function initialize() {
  initializeTheme();
  window.setInterval(updateStatusDetail, 1000);
  await listen<LogPayload>("log-line", ({ payload }) => appendLog(payload));
  await listen<ServerStatus>("server-status", ({ payload }) => applyStatus(payload));
  const history = await invoke<LogPayload[]>("get_log_history");
  history.forEach(appendLog);
  await Promise.all([refreshStatus(), loadEnv()]);
  applyStatus(await invoke<ServerStatus>("frontend_ready"));
}

initialize().catch((error) => showMessage(String(error), true));
