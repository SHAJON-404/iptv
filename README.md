# 📺 IPTV Player — Watch Live TV Channels

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.2.7-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D_22.19.0-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

A modern, high-performance, and premium web-based IPTV player built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**. Stream high-quality live TV channels directly from official broadcast sources with a cinematic user interface.

**🌐 Live Web Player:** [tv.shajon.dev](https://tv.shajon.dev)

</div>

---

## ✨ Features

- 📺 **Cinematic Video Player**: Large, center-aligned, aspect-ratio locked media container utilizing HLS.js and native iOS Safari player engines. Supports Picture-in-Picture (PiP), custom volume controls, double-tap seek, and auto-fallback muted play.
- 🔑 **DASH & ClearKey DRM Support**: Fully integrated **Shaka Player** engine for playing `.mpd` (DASH) streams. Supports automated decryption using ClearKey DRM configurations (decoding `kid` and `key` tags from the JSON database).
- 🎬 **MPEG-TS Support**: Includes integrated `mpegts.js` support for natively playing legacy MPEG-TS streams in modern browsers.
- 📊 **Enhanced Player Analytics**: Displays dynamic stream resolution (with superscript HD/4K tags) and precise Mbps bandwidth columns within the quality selection settings.
- 🔄 **Advanced Error Recovery & Fallbacks**: Automatic recovery loops for HLS.js network and media failures. Implements a **10-second automatic channel switcher fallback** that automatically plays the next channel in the list if the current one fails to start.
- 🛡️ **Anti-SSRF Security & DNS Validation**: Proxy API endpoint protects internal infrastructure by performing DNS resolution lookup on target hostnames to block private, local, loopback, or link-local IP addresses.
- 🤖 **Cloudflare Turnstile Bot Protection**: Secures the platform against automated scraping and DDoS attacks using Cloudflare Turnstile verification for first-time visitors, executed safely via Next.js Server Actions.
- 🌐 **CORS & Geo-Block Bypass**: Upstream proxy fetches streams using custom Undici Agents (TLS v1+ legacy cipher compatibility) and dynamically rewrites/injects headers (`Referer`, `Origin`, and `Range`) to bypass hotlink restrictions and CORS issues.
- 💾 **SHA-256 Hash-Based IndexedDB Cache**: Caches each default playlist in the browser using IndexedDB. On page load, it queries a lightweight `/api/iptv/channels/hash?type=...` endpoint. If unchanged, channels load instantly from cache, saving bandwidth and eliminating player lag.
- 📂 **High-Speed BDIX FTP Portal**: An elegant `/ftp` directory showing local BDIX movie and media servers, complete with real-time online status indicators, host configurations, speed diagnostics, and instant redirection link components.
- 👥 **Real-Time Watcher Telemetry**: Integrated directly into the channel list header, using a non-blocking session heartbeat endpoint to monitor active viewers concurrently.
- 🌌 **3D CSS Net Background**: A highly optimized, static 3D perspective cyber grid with deep purple and cyan radial glows and a subtle viewport mesh overlay, designed for maximum performance (0% CPU/GPU overhead) on all devices.
- 🔍 **Interactive Channel Grid**: Filter and search through thousands of Bangla and international live TV channels in real-time. Responsive grid display dynamically adjusts for mobile, tablet, and desktop viewports.
- ⚡ **Full Skeleton UI Loading States**: Fully unified, custom-designed pulsing skeleton templates for every card element (Player, Details, Developer Info, Total Channels, and Channel List grid) to prevent layout shifts.
- 🧭 **Glassmorphic Sticky Header**: A clean, luxurious sticky header with brand identification and active live broadcast status.
- 📢 **Telegram Announcement Popup**: A beautiful announcement modal prompting users to join the official Telegram channel (`t.me/shajonOTT`) for updates, stream status notifications, and channel requests. Includes a developer-mode bypass for easier testing.

---

## 🌍 Live TV Channels Database

If you want to use the curated, lightweight IPTV channel databases in another project, media player, or Android TV, you can easily copy and fetch the raw files directly:

### 🏆 Sports Playlist (240+ Channels)
* **JSON Database Link**
  ```text
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/sports.json
  ```
* **M3U Playlist Link**
  ```text
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/sports.m3u
  ```

### 🌍 Universal Playlist (7500+ Channels)
* **JSON Database Link**
  ```text
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/channels.json
  ```
* **M3U Playlist Link**
  ```text
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/channels.m3u
  ```

### 🇧🇩 Bangla Playlist (100+ Channels)
* **JSON Database Link**
  ```text
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/bangla.json
  ```
* **M3U Playlist Link**
  ```text
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/bangla.m3u
  ```

### ⚽ FIFA Playlist (7 Channels)
* **JSON Database Link**
  ```text
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/fifa.json
  ```
* **M3U Playlist Link**
  ```text
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/fifa.m3u
  ```


> [!IMPORTANT]
> **License & Credit Notice**: If you use this channel database or stream source list in your own projects, you **must share and display proper credit** to the original developer (**S. SHAJON**) along with a link back to this repository.

---

## ⚙️ M3U Playlist Converter

The repository includes a built-in Node.js converter script that automatically scans and parses all JSON files in the data directory and outputs standard M3U playlists.

### Usage

1. **Convert All Playlists** (Converts all `.json` files in `app/data/` to `.m3u`):
   ```bash
   npm run convert-m3u
   ```
   *Or run it directly:*
   ```bash
   node scripts/json-to-m3u.js
   ```

2. **Custom Paths**:
   If you have a custom JSON database or want to output to a specific location:
   ```bash
   node scripts/json-to-m3u.js <path-to-input.json> <path-to-output.m3u>
   ```

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Stream Engines**: [HLS.js](https://github.com/video-dev/hls.js/), [Shaka Player](https://github.com/shaka-project/shaka-player) (for DASH & ClearKey DRM), & [mpegts.js](https://github.com/xqq/mpegts.js) (for legacy MPEG-TS)
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
   git clone https://github.com/SHAJON-404/iptv.git
   cd iptv
   ```

2. Configure environment variables:
   Create a `.env` file in the root directory:
   ```env
   # Site Configuration
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Popup Modals Configuration
   SHOW_POPUP=True
   DISABLE_WC_POPUP=True
   DISABLE_TG_POPUP=False

   # Cloudflare Turnstile Verification Configuration
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
   TURNSTILE_SECRET_KEY=your-secret-key
   NEXT_PUBLIC_DISABLE_TURNSTILE=False

   # Developer/Local Subnet Origins (CORS validation bypass)
   ALLOWED_DEV_ORIGINS=live.shajon.dev,192.168.0.57
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Running

To build and run the application in production mode:
```bash
npm run build
npm start
```

### Docker Deployment

You can deploy the application using the preconfigured multi-stage `Dockerfile` (optimized for Node.js 22):
```bash
docker build -t iptv-player .
docker run -p 3000:3000 iptv-player
```

---

## ⚠️ Disclaimer

This repository does not host, store, retransmit, or own any television channels or media content. The JSON file and web player only reference publicly available stream links collected from open-source IPTV playlists and public internet sources. Channel availability may change, expire, or stop working at any time.

If you are the copyright owner of any content and would like it removed, please refer to our [Security & DMCA Policy](SECURITY.md) or contact the developer directly.

---

## ❤️ Credits

Special thanks to all IPTV open-source repository maintainers and contributors whose publicly available playlists and stream sources make this collection and player possible.

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
