# 📺 IPTV Player — Watch Live TV Channels

A modern, high-performance, and premium web-based IPTV player built with **Next.js 16**, **React 19**, **Three.js**, and **Tailwind CSS v4**. Stream high-quality live TV channels directly from official broadcast sources with a cinematic user interface.

Web Players:
- **Dedicated Web Player**: https://tv.shajon.dev
- **Tools Web Player**: https://tools.shajon.dev/iptv

---

## ✨ Features

- 📺 **Cinematic Video Player**: Large, center-aligned, aspect-ratio locked media container utilizing HLS.js and native iOS Safari player engines. Supports Picture-in-Picture (PiP), custom volume controls, double-tap seek, and auto-fallback muted play.
- 🌌 **Three.js Cybernetic Background**: Dynamic WebGL particle flow field featuring parallax camera coordinates responsive to mouse movements, a moving neon grid floor, and glowing orbital space structures.
- 🔍 **Interactive Channel Grid**: Filter and search through thousands of Bangla and international live TV channels in real-time. Responsive grid display dynamically adjusts for mobile, tablet, and desktop viewports.
- ⚡ **Full Skeleton UI Loading States**: Fully unified, custom-designed pulsing skeleton templates for every card element (Player, Details, Developer Info, Total Channels, and Channel List grid) to prevent layout shifts.
- 🧭 **Glassmorphic Sticky Header**: A tall, luxurious sticky header with brand identification, active live broadcast pulsing status, and developer contact badges.

---

## 🌍 Live TV Channels Database

If you want to use the curated, lightweight IPTV channel database (containing 6800+ channels) in another project, media player, or Android TV, you can fetch the raw files directly:

- **JSON Format**:
  ```
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/channels.json
  ```

- **M3U Playlist Format** (For Android TV, VLC, Kodi, or any IPTV Player):
  ```
  https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/channels.m3u
  ```

> [!IMPORTANT]
> **License & Credit Notice**: If you use this channel database or stream source list in your own projects, you **must share and display proper credit** to the original developer (**S. SHAJON**) along with a link back to this repository.

---

## 🛠️ M3U Playlist Converter

If you need the channel database in standard M3U format, you can use the built-in Node.js conversion script.

### Usage

1. **Quick Conversion** (using defaults: `app/data/channels.json` ➔ `app/data/channels.m3u`):
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
- **3D Graphics**: [Three.js](https://threejs.org/) (for WebGL background effects)
- **Animations**: [Motion](https://motion.dev/) (formerly Framer Motion)
- **Stream Engine**: [HLS.js](https://github.com/video-dev/hls.js/)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Node.js** (v18.x or newer) installed.

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/SHAJON-404/iptv.git
   cd iptv
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Production Build

To build the application for production:
```bash
npm run build
npm start
```

---

## ⚠️ Disclaimer

This repository does not host, store, retransmit, or own any television channels or media content. The JSON file and web player only reference publicly available stream links collected from open-source IPTV playlists and public internet sources. Channel availability may change, expire, or stop working at any time.

If you are the copyright owner of any content and would like it removed, please open an issue or contact the developer.

---

## ❤️ Credits

Special thanks to all IPTV open-source repository maintainers and contributors whose publicly available playlists and stream sources make this collection and player possible.

---

## 📄 License & Compliance

This project is open-source software licensed under the **GNU General Public License v3 (GPLv3)**.

### Open Source Compliance Guidelines:
1. **Copyleft Protection**: Any extensions, improvements, or derivative works built on top of this codebase must also be open-sourced and distributed under the same GPLv3 license.
2. **Preserve Developer Attribution**: You must preserve all S. SHAJON copyright, developer profile links (GitHub, Telegram, Facebook), and licensing labels in both the user interface and code files.

Developed with ♥ by [S. SHAJON](https://t.me/SHAJON). Follow [GitHub Profile](https://github.com/SHAJON-404) for updates.
