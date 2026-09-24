import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");
const frontend = path.join(root, "frontend");
const venvPython = path.join(
  backend,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python"
);
const fastapiPkg = path.join(backend, ".venv", "Lib", "site-packages", "fastapi");
const vitePkg = path.join(frontend, "node_modules", "vite");
const installOnly = process.argv.includes("--install-only");
const forceInstall = process.argv.includes("--force");
const children = [];
let shuttingDown = false;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    windowsHide: true,
    ...opts,
    shell: opts.shell === true,
  });
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function which(names) {
  for (const name of names) {
    const result = spawnSync(name, ["--version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: "pipe",
    });
    if (result.status === 0) return name;
  }
  return null;
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(400);
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

function waitHttp(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve(true);
          return;
        }
        retry();
      });
      req.on("error", retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      setTimeout(tryOnce, 400);
    };
    tryOnce();
  });
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

function startProcess(command, args, cwd, shell = false) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell,
    windowsHide: false,
    env: process.env,
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (shuttingDown || signal) return;
    if (code && code !== 0) {
      stopChildren();
      fail(`${path.basename(command)} exited with code ${code}`);
    }
  });
  return child;
}

function stopChildren() {
  shuttingDown = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
}

function shutdown() {
  stopChildren();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const python = which(["python", "py"]);
const npm = which(process.platform === "win32" ? ["npm.cmd", "npm"] : ["npm"]);
if (!python) fail("Python is required. Install it from python.org and add it to PATH.");
if (!npm) fail("Node.js (npm) is required. Install it from nodejs.org.");

const needVenv = !fs.existsSync(venvPython);
const needPyPkgs = forceInstall || installOnly || !fs.existsSync(fastapiPkg);
const needJsPkgs = forceInstall || installOnly || !fs.existsSync(vitePkg);

if (needVenv || needPyPkgs || needJsPkgs) {
  console.log("==> Installing packages");
}

if (needVenv) {
  console.log("Creating Python venv");
  run(python, ["-m", "venv", path.join(backend, ".venv")], { shell: true });
}

if (needPyPkgs) {
  run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"]);
  run(venvPython, ["-m", "pip", "install", "-r", path.join(backend, "requirements.txt")]);
}

if (needJsPkgs) {
  run(npm, ["install"], { cwd: frontend, shell: true });
}

const dbPath = path.join(backend, "instagram.db");
if (!fs.existsSync(dbPath)) {
  console.log("==> Creating demo database (first run)");
  run(venvPython, ["seed.py"], { cwd: backend });
} else {
  console.log("==> Applying SQLite schema");
  run(venvPython, ["migrate.py"], { cwd: backend });
}

if (installOnly) {
  console.log("Packages installed.");
  process.exit(0);
}

console.log("==> Starting backend and frontend");

if (!(await portOpen(8000))) {
  startProcess(
    venvPython,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--reload",
      "--reload-dir",
      "app",
      "--host",
      "127.0.0.1",
      "--port",
      "8000",
    ],
    backend
  );
} else {
  console.log("Port 8000 already in use — reusing API");
}

if (!(await portOpen(5173))) {
  startProcess(npm, ["exec", "vite", "--", "--host", "127.0.0.1", "--port", "5173"], frontend, true);
} else {
  console.log("Port 5173 already in use — reusing UI");
}

const ready = await waitHttp("http://127.0.0.1:5173/");
if (!ready) fail("Frontend did not start. Check the logs above.");

console.log("==> Opening http://localhost:5173");
openBrowser("http://localhost:5173");
console.log("Ready. UI http://localhost:5173  |  API http://localhost:8000/docs");
console.log("Demo login: demo / demo1234");
console.log("Press Ctrl+C to stop.");

await new Promise(() => {});
