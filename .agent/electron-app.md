# Developer & Agent Guide: Electron Desktop Integration

This document outlines the Electron main process lifecycle, preload context bridge, and specific optimizations for desktop packaging.

## 📂 File Map
* **Main Process**: [electron/main.js](../electron/main.js)
* **Preload Script**: [electron/preload.js](../electron/preload.js)
* **Linux Postinstall**: [scripts/linux-postinstall.sh](../scripts/linux-postinstall.sh)

---

## 1. Preload Context Bridge (`preload.js`)
Exposes the secure `electronAPI` window global namespace to the frontend application:
* `isDesktop`: Hardcoded to `true` (useful for feature-flagging desktop-only menus/buttons).
* `platform`: Exposes `process.platform` (`win32`, `linux`, etc.) to hide macOS options as per workspace guidelines.
* `preventSleep(enable)`: Invokes IPC message channel to disable system display sleeping during video playback.
* `getSystemMemory()`: Fetches system hardware specs.
* `checkForUpdates()`: Queries the GitHub releases endpoint for SemVer differences.

---

## 2. Main Process Lifecycle (`main.js`)

### A. GPU & Performance Optimization Flags
Startup sets Chromium CLI switches:
* Disables background throttling for continuous stream playback: `disable-renderer-backgrounding`, `disable-background-timer-throttling`, `disable-backgrounding-occluded-windows`.
* Increases heap size: `--max-old-space-size=4096`.
* Configures GPU hardware video decoding and rasterization flags, including VA-API hardware decoding on Linux.

### B. Dynamic Standalone Next.js Server
* **Port Allocation**: In production (`!isDev`), uses a raw socket socket test (`getFreePort()`) to identify an available free port.
* **Process Spawning**: Spawns the compiled Next.js standalone script (`.next/standalone/server.js`) as a background node child process via `child_process.fork()`.
* **Health Polling**: Polls the server port with lightweight HTTP requests until the server becomes ready before loading the URL.
* **Process Cleanup**: Registers handlers (`SIGKILL`) on `will-quit`, `quit`, and `exit` events to ensure the background Node process is terminated.

### C. Writable Server Mirror (`prepareWritableServer`)
* Under read-only platforms like AppImage (which mounts as read-only squashfs filesystems), Next.js cannot write compilation/fetch caches to `.next/cache`.
* `prepareWritableServer` detects permission errors. It creates a writable folder inside the user's AppData directory (`userData/next-server`), copies `server.js`, and recursively symlinks all other static/node assets except `.next/cache`, which it creates as writable folders.
