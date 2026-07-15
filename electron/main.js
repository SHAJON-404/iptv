/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, shell, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const net = require('net');
const http = require('http');
const https = require('https');
const dotenv = require('dotenv');

let serverProcess = null;
let mainWindow = null;
let sleepBlockerId = null;

// Fix Linux specific connection issues and root password prompts
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('proxy-bypass-list', '127.0.0.1,localhost,::1');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// Enable hardware-accelerated video decoding and GPU compositing
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-accelerated-video-decode');

// Linux-specific: enable VA-API hardware video decoding
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecodeLinuxGL,VaapiVideoEncoder,VaapiVideoDecoder');
}

// ── Desktop Performance: Anti-Throttling for Background Playback ────────────
// Prevent Chromium from throttling timers and rendering when the window is minimized or in background
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// ── Desktop Performance: Memory Management ──────────────────────────────────
// Increase V8 heap size limit to support larger buffers for 4K streams
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// ── Desktop Performance: Audio Optimization ─────────────────────────────────
// Disable audio sandbox for lower-latency audio playback
app.commandLine.appendSwitch('disable-features', 'AudioServiceSandbox');

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Determine if we are in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Helper to log from main process to a file in userData
function logMain(message) {
  try {
    const logDir = app.getPath('userData');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'main.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
  } catch (e) {
    console.error('Failed to write to main.log:', e);
  }
}

// 1. Load environment variables
function loadEnvironment() {
  const userDataPath = app.getPath('userData');
  const projectRootEnv = path.join(__dirname, '../.env');
  const exeDirEnv = path.join(path.dirname(process.execPath), '.env');
  const userDataEnv = path.join(userDataPath, '.env');
  let activeEnvPath = null;

  logMain(`loadEnvironment: __dirname = "${__dirname}", process.execPath = "${process.execPath}"`);
  logMain(`loadEnvironment checking: projectRootEnv = "${projectRootEnv}" (exists: ${fs.existsSync(projectRootEnv)})`);
  logMain(`loadEnvironment checking: exeDirEnv = "${exeDirEnv}" (exists: ${fs.existsSync(exeDirEnv)})`);
  logMain(`loadEnvironment checking: userDataEnv = "${userDataEnv}" (exists: ${fs.existsSync(userDataEnv)})`);

  // First, check if .env is in the project root directory (useful during dev)
  if (fs.existsSync(projectRootEnv)) {
    activeEnvPath = projectRootEnv;
  }
  // Second, check if .env is in the executable directory (portable setups)
  else if (!isDev && fs.existsSync(exeDirEnv)) {
    activeEnvPath = exeDirEnv;
  }
  // Third, check if .env is in the user data directory
  else if (fs.existsSync(userDataEnv)) {
    activeEnvPath = userDataEnv;
  }

  logMain(`loadEnvironment activeEnvPath: "${activeEnvPath}"`);

  // Load the env variables
  if (activeEnvPath) {
    const result = dotenv.config({ path: activeEnvPath });
    logMain(`dotenv.config result: ${result.error ? `Error: ${result.error.message}` : 'Success'}`);
  } else {
    const result = dotenv.config();
    logMain(`Fallback dotenv.config result: ${result.error ? `Error: ${result.error.message}` : 'Success'}`);
  }

  return activeEnvPath;
}

// 2. Find a free port dynamically
function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

// 3. Poll server until it responds
function pollServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error('Next.js local server start timed out'));
        return;
      }
      const req = http.get(url, () => {
        clearInterval(interval);
        resolve();
      });
      req.on('error', () => {
        // Not ready yet
      });
      req.end();
    }, 200);
  });
}

// 4. Create the main application window
function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 576,
    backgroundColor: '#0a0a0a',
    title: 'IPTV Player Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false,
    },
  });

  if (!isDev) {
    mainWindow.removeMenu();
  }

  // Open DevTools if we are in development mode AND ENABLE_DEVTOOLS is set to true/True
  const enableDevTools = process.env.ENABLE_DEVTOOLS && process.env.ENABLE_DEVTOOLS.toLowerCase() === 'true';
  if (isDev && enableDevTools) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadURL(url);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external link clicks (open in default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    // Open all new windows/external links in the default OS browser
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });
}

// 5. Prepare a writable server directory for read-only environments (AppImage, snap, etc.)
// Next.js standalone server needs a writable .next/cache directory, but AppImage
// mounts as a read-only squashfs filesystem. This function creates a writable mirror
// in userData with symlinks to the original assets.
function prepareWritableServer(originalServerScript) {
  const serverDir = path.dirname(originalServerScript);
  const writableDir = path.join(app.getPath('userData'), 'next-server');

  // Check if the source directory is writable
  try {
    const testFile = path.join(serverDir, '.write-test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    // Writable — no mirror needed (installed via .deb/.rpm or local dev)
    return originalServerScript;
  } catch {
    // Read-only filesystem — need writable mirror
    logMain('Detected read-only filesystem, setting up writable server mirror...');
  }

  // Clean and recreate writable directory each launch for freshness
  try { fs.rmSync(writableDir, { recursive: true, force: true }); } catch { /* ignore */ }
  fs.mkdirSync(writableDir, { recursive: true });

  // Copy server.js so that __dirname resolves to the writable directory
  fs.copyFileSync(originalServerScript, path.join(writableDir, 'server.js'));

  // Symlink all other top-level items from the read-only standalone directory
  const items = fs.readdirSync(serverDir);
  for (const item of items) {
    if (item === 'server.js' || item === '.write-test') continue;
    const srcPath = path.join(serverDir, item);
    const dstPath = path.join(writableDir, item);

    if (item === '.next') {
      // Special handling: symlink everything inside .next EXCEPT 'cache'
      fs.mkdirSync(dstPath, { recursive: true });
      const nextItems = fs.readdirSync(srcPath);
      for (const nextItem of nextItems) {
        if (nextItem === 'cache') continue;
        try {
          fs.symlinkSync(path.join(srcPath, nextItem), path.join(dstPath, nextItem));
        } catch (e) {
          logMain(`Warning: Could not symlink .next/${nextItem}: ${e.message}`);
        }
      }
      // Create writable cache directories
      fs.mkdirSync(path.join(dstPath, 'cache', 'images'), { recursive: true });
      fs.mkdirSync(path.join(dstPath, 'cache', 'fetch-cache'), { recursive: true });
    } else {
      // Symlink everything else (node_modules, package.json, public, etc.)
      try {
        fs.symlinkSync(srcPath, dstPath);
      } catch (e) {
        logMain(`Warning: Could not symlink ${item}: ${e.message}`);
      }
    }
  }

  logMain(`Writable server mirror ready at: ${writableDir}`);
  return path.join(writableDir, 'server.js');
}

// 6. Start the Next.js server and initialize the app
async function initializeApp() {
  loadEnvironment();

  let serverPort = 3000;
  let serverUrl = 'http://127.0.0.1:3000';

  if (!isDev) {
    try {
      serverPort = await getFreePort();
      serverUrl = `http://127.0.0.1:${serverPort}`;
      console.log(`Starting local Next.js server on port ${serverPort}...`);

      // Path to Next.js standalone server
      // In packaged electron app, main.js is in resources/app/electron/main.js
      // standalone server.js is in resources/app/.next/standalone/server.js
      let serverScript = path.join(__dirname, '../.next/standalone/server.js');

      // Since .next/standalone is unpacked, point to the unpacked path so that
      // process.chdir inside server.js succeeds.
      if (serverScript.includes('app.asar')) {
        serverScript = serverScript.replace('app.asar', 'app.asar.unpacked');
      }

      if (!fs.existsSync(serverScript)) {
        throw new Error(`Standalone server.js not found at: ${serverScript}`);
      }

      // Prepare writable server directory (handles AppImage read-only fs)
      serverScript = prepareWritableServer(serverScript);

      // Setup logging to a file in userData
      const logDir = app.getPath('userData');
      const logFile = path.join(logDir, 'server.log');

      try {
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
      } catch (e) {
        console.error('Failed to create log directory:', e);
      }

      const logStream = fs.createWriteStream(logFile, { flags: 'a' });
      const timestamp = new Date().toISOString();
      logStream.write(`\n--- Server starting at ${timestamp} on port ${serverPort} ---\n`);

      // Start the server process
      serverProcess = child_process.fork(serverScript, [], {
        cwd: path.dirname(serverScript),
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          PORT: serverPort.toString(),
          HOSTNAME: '127.0.0.1',
          NODE_ENV: 'production',
          NEXTAUTH_URL: serverUrl,
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });

      serverProcess.stdout.on('data', (data) => {
        logStream.write(data);
        console.log(`[NextServer]: ${data.toString().trim()}`);
      });

      serverProcess.stderr.on('data', (data) => {
        logStream.write(data);
        console.error(`[NextServer Error]: ${data.toString().trim()}`);
      });

      // Track server process crashes
      serverProcess.on('exit', (code, signal) => {
        const msg = `[NextServer EXITED] code=${code} signal=${signal}`;
        console.error(msg);
        logStream.write(msg + '\n');
        logMain(msg);
      });

      serverProcess.on('error', (err) => {
        const msg = `[NextServer ERROR] ${err.message}`;
        console.error(msg);
        logStream.write(msg + '\n');
        logMain(msg);
      });

      console.log('Waiting for Next.js server to start...');
      await pollServer(serverUrl);
      console.log('Next.js server is ready.');
    } catch (err) {
      console.error('Failed to launch Next.js server:', err);
      dialog.showErrorBox(
        'Server Launch Failed',
        `Failed to start the background server: ${err.message}`
      );
      app.quit();
      return;
    }
  } else {
    console.log('Running in Development mode. Assuming Next.js dev server is running on port 3000.');
    // Poll the dev server to make sure it's up before opening Electron
    try {
      await pollServer(serverUrl, 10000);
    } catch {
      dialog.showErrorBox(
        'Dev Server Not Found',
        'Please run "npm run dev" to start the Next.js development server before starting Electron.'
      );
      app.quit();
      return;
    }
  }

  createMainWindow(serverUrl);
}

// Electron lifecycle events
app.whenReady().then(initializeApp);

// ── IPC Handlers: Desktop APIs for Renderer ─────────────────────────────────

// Sleep Prevention: Toggle system sleep blocker during active playback
ipcMain.handle('prevent-sleep', (_event, enable) => {
  if (enable) {
    if (sleepBlockerId === null || !powerSaveBlocker.isStarted(sleepBlockerId)) {
      sleepBlockerId = powerSaveBlocker.start('prevent-display-sleep');
      console.log(`[Desktop] Sleep prevention ENABLED (blocker id: ${sleepBlockerId})`);
    }
    return true;
  } else {
    if (sleepBlockerId !== null && powerSaveBlocker.isStarted(sleepBlockerId)) {
      powerSaveBlocker.stop(sleepBlockerId);
      console.log(`[Desktop] Sleep prevention DISABLED (blocker id: ${sleepBlockerId})`);
      sleepBlockerId = null;
    }
    return false;
  }
});

// System Memory: Expose total system memory for intelligent buffer sizing
ipcMain.handle('get-system-memory', () => {
  const os = require('os');
  return {
    totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
    freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
  };
});

// Update Checker: Check for new app updates using public GitHub Releases API
ipcMain.handle('check-for-updates', async () => {
  try {
    const currentVersion = app.getVersion();

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/SHAJON-404/iptv/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'iptv-desktop-app'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              resolve({
                success: false,
                error: `GitHub API returned HTTP status ${res.statusCode}`
              });
              return;
            }

            const release = JSON.parse(data);
            const latestVersionTag = release.tag_name || '';
            const latestVersion = latestVersionTag.replace(/^v/, '');

            // Basic semver compare logic
            const parseVersion = (v) => {
              const clean = v.replace(/^v/, '').split('-')[0];
              return clean.split('.').map(Number);
            };

            const currParsed = parseVersion(currentVersion);
            const lateParsed = parseVersion(latestVersion);

            let updateAvailable = false;
            for (let i = 0; i < Math.max(currParsed.length, lateParsed.length); i++) {
              const c = currParsed[i] || 0;
              const l = lateParsed[i] || 0;
              if (l > c) {
                updateAvailable = true;
                break;
              } else if (c > l) {
                break;
              }
            }

            resolve({
              success: true,
              updateAvailable,
              currentVersion,
              latestVersion: latestVersionTag,
              url: release.html_url,
              notes: release.body || ''
            });
          } catch (err) {
            resolve({ success: false, error: `Parse error: ${err.message}` });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: `Network error: ${err.message}` });
      });

      req.end();
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.on('window-all-closed', () => {
  // Respect macOS conventions, but on Windows/Linux terminate
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    initializeApp();
  }
});

// Helper to safely terminate Next.js background server process
function killServer() {
  // Release sleep blocker
  if (sleepBlockerId !== null && powerSaveBlocker.isStarted(sleepBlockerId)) {
    powerSaveBlocker.stop(sleepBlockerId);
    sleepBlockerId = null;
  }

  if (serverProcess) {
    console.log('Shutting down background Next.js server (sending SIGKILL)...');
    try {
      // Use SIGKILL to guarantee immediate process teardown on Windows/Linux
      serverProcess.kill('SIGKILL');
      console.log('Successfully requested termination of Next.js server.');
    } catch (err) {
      console.error('Error terminating Next.js server:', err);
    }
    serverProcess = null;
  }
}

// Register exit handlers to prevent zombie background processes
app.on('will-quit', killServer);
app.on('quit', killServer);
process.on('exit', killServer);
