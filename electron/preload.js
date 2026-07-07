/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

// Expose desktop-specific APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Platform Detection ──────────────────────────────────────────────────
  platform: process.platform,
  isDesktop: true,

  // ── Sleep Prevention ────────────────────────────────────────────────────
  // Toggle system sleep blocker during active playback
  // Returns: Promise<boolean> — true if sleep prevention is active
  preventSleep: (enable) => ipcRenderer.invoke('prevent-sleep', enable),

  // ── System Memory ──────────────────────────────────────────────────────
  // Get total and free system memory for intelligent buffer sizing
  // Returns: Promise<{ totalMemoryMB: number, freeMemoryMB: number }>
  getSystemMemory: () => ipcRenderer.invoke('get-system-memory'),
});
