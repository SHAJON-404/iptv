/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, dialog, shell, ipcMain, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const net = require('net');
const http = require('http');
const dotenv = require('dotenv');

let serverProcess = null;
let mainWindow = null;
let serverUrl = 'http://127.0.0.1:3000';
let sleepBlockerId = null;

// ── Desktop Performance: GPU & Rendering Optimizations ──────────────────────
// Enable hardware-accelerated video decoding and GPU compositing
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

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

// Register custom protocol client
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('iptv-app', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('iptv-app');
}

// Handle protocol URL to set cookies in Electron session
async function handleAuthProtocol(urlStr) {
  try {
    const parsedUrl = new URL(urlStr);
    const token = parsedUrl.searchParams.get('token');
    if (token && mainWindow) {
      const cookie = {
        url: serverUrl,
        name: 'iptv_session',
        value: token,
        expirationDate: Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60, // 10 days
        sameSite: 'no_restriction',
        httpOnly: true
      };
      await mainWindow.webContents.session.cookies.set(cookie);
      mainWindow.loadURL(serverUrl);
      console.log('Successfully handled auth protocol and set session cookie.');
    }
  } catch (err) {
    console.error('Failed to handle auth protocol:', err);
  }
}

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    // Protocol handler for Windows/Linux
    const url = commandLine.find(arg => arg.startsWith('iptv-app://'));
    if (url) {
      handleAuthProtocol(url);
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
    server.listen(0, () => {
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

  // Remove default menu bar in production
  if (!isDev) {
    mainWindow.removeMenu();
  }

  mainWindow.loadURL(url);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external link clicks (open in default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    // If it's the OAuth flow callback, Google login page, or local URL, allow opening inside the app
    if (
      targetUrl.startsWith('http://localhost') || 
      targetUrl.startsWith('http://127.0.0.1') || 
      targetUrl.startsWith('https://accounts.google.com') ||
      targetUrl.includes('shajon.dev') ||
      targetUrl.includes('/__/oauth/')
    ) {
      return { action: 'allow' };
    }
    // Otherwise open in native default browser
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  // Intercept Google OAuth initialization and open in default browser
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl.includes('/api/auth/google')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
}

// 5. Start the Next.js server and initialize the app
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
        env: {
          ...process.env,
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

  // Check if launched via deep link
  const url = process.argv.find(arg => arg.startsWith('iptv-app://'));
  if (url) {
    handleAuthProtocol(url);
  }
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

// Terminate Next.js server process and clean up when quitting
app.on('will-quit', () => {
  // Release sleep blocker
  if (sleepBlockerId !== null && powerSaveBlocker.isStarted(sleepBlockerId)) {
    powerSaveBlocker.stop(sleepBlockerId);
    sleepBlockerId = null;
  }

  if (serverProcess) {
    console.log('Shutting down background Next.js server...');
    serverProcess.kill('SIGTERM');
  }
});
