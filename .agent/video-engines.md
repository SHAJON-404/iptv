# Developer & Agent Guide: Video Engines & Playback Hook

This guide details the integration of the HLS.js, Shaka Player, and video.js/MPEG-TS engines within the custom `useVideoPlayer.ts` hook.

## 📂 File Map
* **Main Hook**: [app/hooks/useVideoPlayer.ts](../app/hooks/useVideoPlayer.ts)

---

## 1. Overview
The video playback logic is abstracted inside the `useVideoPlayer` custom React hook. Rather than importing player engines globally, the application loads browser-only libraries dynamically and manages lifecycle cleanup manually.

---

## 2. Integrated Playback Engines
The player selects the appropriate engine based on the channel URL extension and browser compatibility:

### A. HLS.js (`hls.js`)
* Used for **HLS (.m3u8)** streams.
* Binds events (`MANIFEST_PARSED`, `LEVEL_LOADED`, `ERROR`) to handle quality levels and auto-recovery.
* Intercepts errors (network errors, media errors) to attempt custom level-switching or buffer flush recovery before throwing error states.

### B. Shaka Player (`shaka-player`)
* Loaded dynamically to prevent server-side rendering (SSR) failures.
* Primarily handles **DASH (.mpd)** streams and streams requiring DRM key decryption configurations.
* Extracts variant tracks (`shakaPlayer.getVariantTracks()`) for quality control.

### C. mpegts.js (`mpegts.js`)
* Handles legacy **MPEG-TS (.ts)** live channels.
* Provides quality and buffer setup on top of basic native video nodes.

### D. Video.js (`video.js`)
* Serves as an alternate HTML5 playback engine wrapper and provides additional interface plugins or fallbacks.

---

## 3. Core Hook Mechanisms

### A. Playable URL Generation (`getPlayableUrl`)
Formulates the source path for playback. If `useProxy` is active, it routes streams to `/api/iptv/proxy` while packing referer, origin, and user-agent custom headers into a base64-encoded query parameter `headers`.

### B. CORS Support Check (`checkCorsSupport`)
* Runs a lightweight `HEAD` fetch request (capped at 3 seconds) to test if the destination stream supports cross-origin headers.
* If blocked (or on HTTPS-to-HTTP Mixed Content violations), it falls back to the local proxy route.
* Caches CORS results inside a memory `Map` to avoid duplicate queries.

### C. Exponential Backoff Auto-Recovery
* Listens to playback stall or source errors.
* Attempts automatic stream recovery with exponential delay increments (`1000 * Math.pow(2, attempt)` capped at 16 seconds).
* Tracks user-initiated pause states (`userPausedRef`) to differentiate from connection-induced freezing.
* Fires an `onChannelFail` callback to cycle to the next channel in the playlist if all recovery attempts fail.
