# 📺 IPTV Player — Watch Live TV Channels

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.2.10-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.7-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D_22.19.0-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

A modern, high-performance, and premium web-based IPTV player built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**. Stream high-quality live TV channels directly from official broadcast sources with a cinematic user interface.

**🌐 Live Web Player:** [tv.shajon.dev](https://tv.shajon.dev)

</div>

---

## ✨ Features

- 🎬 **Advanced Video Engine**: Seamless playback for HLS, DASH (with ClearKey DRM), and MPEG-TS streams using native and custom engines (`hls.js`, `shaka-player`, `mpegts.js`).
- 🎛️ **Cinematic Player Experience**: Custom video quality selection with precise Mbps analytics, Picture-in-Picture (PiP), and double-tap seek.
- 🛡️ **Security & Proxy Routing**: Built-in secure proxy to bypass CORS and Geo-blocking with custom headers, protected by Anti-SSRF DNS validation.
- ⚡ **High-Performance Architecture**: Smart proxy bypass for direct streams.
- 💾 **Local Playlist Caching**: Auto-caches default and custom playlists (IndexedDB) for instant load speeds and offline channel accessibility.
- ✨ **Premium Glassmorphic UI**: Responsive interactive channel grid, seamless skeleton loaders, sticky headers, knockout bracket cards, and a GPU-optimized 3D CSS cyber background.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Stream Engines**: [HLS.js](https://github.com/video-dev/hls.js/), [Shaka Player](https://github.com/shaka-project/shaka-player) (for DASH & ClearKey DRM), [mpegts.js](https://github.com/xqq/mpegts.js) (for legacy MPEG-TS), & [Video.js](https://github.com/videojs/video.js) (for standard video playback wrappers)
- **HTTP Client**: [Undici](https://github.com/nodejs/undici) (for secure proxy streaming)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (**v22.19.0** or newer) installed.
> [!IMPORTANT]
> The dependency `undici@8.4.1` requires Node.js version **v22.19.0** or higher. Lower versions will fail to build or compile.

### Installation

1. Clone this repository:
   ```bash
   git clone --depth=1 https://github.com/SHAJON-404/iptv.git
   cd iptv
   ```

2. Configure environment variables:
   Create a `.env` file in the root directory:
   ```env
   # Site Configuration
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Popup Configuration
   SHOW_POPUP=True

   # Developer/Local Subnet Origins (CORS validation bypass)
   ALLOWED_DEV_ORIGINS=live.shajon.dev,192.168.0.57

   # Default Playlists Domain (Dynamic available_playlist.json domain)
   PLAYLIST_DOMAIN=iamshajon.com
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Running

To build and run the application in production mode:
```bash
npm run build
npm start
```

### 🖥️ Desktop Application (Windows & Linux)

This repository includes support for compiling the player into a standalone desktop application (`.exe` for Windows, and installers like `.deb`, `.rpm`, `.AppImage` for Linux) using Electron.

The desktop application runs the Next.js production server locally in a background process on a dynamically allocated port, serving the dynamic pages, secure CORS stream proxies, and local API handlers directly inside a native window.

#### Local Development
1. Start the Next.js dev server:
   ```bash
   npm run dev
   ```
2. Launch Electron (in a separate terminal) pointed to the local dev server:
   ```bash
   npm run electron:dev
   ```

#### Compiling Installers Locally
- **Local Unpacked Dry-Run (Fast testing):**
   ```bash
   npm run electron:pack
   ```
- **Compile Windows installer (`dist/IPTV Player Setup 3.3.0.exe`):**
   ```bash
   npm run electron:dist-win
   ```
- **Compile Linux installers (AppImage, deb, rpm):**
   ```bash
   npm run electron:dist-linux
   ```

#### Configuration Setup
When launched, the desktop app searches for a configuration `.env` file in the user's home folder config path (`%APPDATA%/iptv` on Windows or `~/.config/iptv` on Linux). If it doesn't exist, a default template is generated.


### Docker Deployment

You can deploy the application using the preconfigured multi-stage `Dockerfile` (optimized for Node.js 22):
```bash
docker build -t iptv-player .
docker run -p 3000:3000 iptv-player
```

### 🔄 Upgrading Dependencies

To check for and upgrade all project dependencies to their latest versions:

1. **Check and upgrade package specifications**:
   ```bash
   npx npm-check-updates -u
   ```
2. **Install the upgraded versions**:
   ```bash
   npm install
   ```
3. **Verify the build output**:
   ```bash
   npm run build
   ```

---

## ⚠️ Disclaimer

This repository does not host, store, retransmit, or own any television channels or media content. The web player only processes and plays data from the user's own provided playlist files (M3U or JSON) or publicly available stream links. Channel availability may change, expire, or stop working at any time.

If you are the copyright owner of any content and would like it removed, please refer to our [Security & DMCA Policy](SECURITY.md) or contact the developer directly.

---

## 📄 License & Compliance

This project is open-source software licensed under the **GNU General Public License v3 (GPLv3)**.

### Open Source Compliance Guidelines:
1. **Copyleft Protection & Mandatory Open Source**: You are free to use, modify, and build upon everything in this repository, but any derivative player, application, or database **MUST remain fully open-source** and distributed under the same GPLv3 license.
2. **Preserve Developer Attribution**: You must preserve all S. SHAJON copyright, developer profile links (GitHub, Telegram, Facebook), and licensing labels in both the user interface and code files.
3. **No Commercial Ads or Betting/Gambling Promotions**: If you build your own IPTV player or service based on this codebase, database, or resources, you are **strictly prohibited** from integrating or displaying any form of commercial advertisements, pop-up ads, redirect ads, or betting/gambling promotions of any kind.

---
<div align="center">
Developed with ♥ by <a href="https://t.me/SHAJON"><b>S. SHAJON</b></a>. Follow <a href="https://github.com/SHAJON-404"><b>GitHub Profile</b></a> for updates.
</div>
