import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./styles.css";

type ServerStatus = {
  running: boolean;
  pid: number | null;
  serverPath: string;
};

type LogPayload = {
  line: string;
  stream: "stdout" | "stderr" | "system";
};

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const statusElement = byId<HTMLDivElement>("status");
const statusText = byId<HTMLSpanElement>("status-text");
const serverPath = byId<HTMLParagraphElement>("server-path");
const logs = byId<HTMLPreElement>("logs");
const editor = byId<HTMLTextAreaElement>("env-editor");
const message = byId<HTMLElement>("message");
const startButton = byId<HTMLButtonElement>("start-button");
const stopButton = byId<HTMLButtonElement>("stop-button");
const restartButton = byId<HTMLButtonElement>("restart-button");

let running = false;
let messageTimer: number | undefined;

function showMessage(text: string, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    message.textContent = "";
  }, 4500);
}

function appendLog(payload: LogPayload) {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  logs.textContent += `[${timestamp}] [${payload.stream}] ${payload.line}\n`;
  logs.scrollTop = logs.scrollHeight;
}

function applyStatus(status: ServerStatus) {
  running = status.running;
  statusElement.classList.toggle("running", running);
  statusText.textContent = running
    ? `运行中 · PID ${status.pid ?? "-"}`
    : "已停止";
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
  await listen<LogPayload>("log-line", ({ payload }) => appendLog(payload));
  await listen<ServerStatus>("server-status", ({ payload }) => applyStatus(payload));
  await Promise.all([refreshStatus(), loadEnv()]);
}

initialize().catch((error) => showMessage(String(error), true));
