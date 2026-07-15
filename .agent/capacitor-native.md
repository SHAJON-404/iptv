# Capacitor & Android Native Integration Manual

This document details the configuration, build pipelines, and custom architecture used to run the **IPTV Docs** web player inside a native Android application using Capacitor.

---

## 📱 Mobile Architecture Overview

Next.js static export shuns dynamic API routes during packaging (`output: 'export'`). To support secure proxying, CORS bypass, and HLS manifest rewriting natively on-device, we launch a local Java HTTP daemon on the client device.

### 1. The Local Java HTTP Daemon (`Localhost.java`)
- **Port:** Loopback port `3000` is used by the Java daemon to receive local proxy/playlist requests.
- **Dynamic Host Resolution:** The daemon extracts the incoming `Host` header (usually `127.0.0.1:3000`) and dynamically rewrites chunk and segment URLs in proxy responses, avoiding hardcoded URLs.
- **Endpoints Handled:**
  - `/api/iptv/proxy?url=<target>`: Fetches and streams external IPTV feeds, rewriting sub-manifest paths to route through the loopback proxy.
  - `/api/iptv/playlists/available`: Delivers fallback defaults if connection to the central server is down.

### 2. Client Resolution (`useIPTVPlaylists.ts`)
- The web app dynamically determines if it is running inside the Capacitor native shell:
  ```typescript
  const isCapacitor = hostname === "localhost" && port === "";
  ```
- When `isCapacitor` is true, all API endpoints are prefixed with `http://127.0.0.1:3000` instead of a relative path.
- Standard web and Electron dev servers preserve relative routing (supporting dynamic random/testing ports).

---

## 🛠️ Static Build Pipeline (`build-static.js`)

Because Next.js does not allow dynamic Route Handlers (the `/app/api` directory) during static builds, we use a build runner:
1. Temporarily moves `app/api` to `app/api_backup`.
2. Compiles the Next.js static files into `/out`.
3. Restores the `app/api` folder to prevent source code loss.
4. Syncs static files into the Android assets directory using `npx cap sync`.

---

## ⚙️ Build and Asset Commands

- **Sync Assets:** `npm run cap:sync`
- **Build Debug APK:** `npm run android:build-debug`
- **Build Release APK:** `npm run android:build-release`
- **App Brand Icon Generation:**
  ```bash
  npx -y @capacitor/assets generate --android
  ```
  Generates adaptive, round, and mipmap icons using `public/logo.png` as the single high-resolution source.

---

## 🚫 Platform Restrictions
- **macOS Build Support is disabled.** Do not generate build configs, instructions, or guides for macOS. Only Windows, Linux, and Android builds are supported.
