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

- 🎬 **Advanced Video Engine**: Seamless playback for HLS, DASH (with ClearKey DRM), and MPEG-TS streams using native and custom engines (`hls.js`, `shaka-player`, `mpegts.js`).
- 🎛️ **Cinematic Player Experience**: Custom video quality selection with precise Mbps analytics, Picture-in-Picture (PiP), double-tap seek, and automatic 10-second error recovery channel switching.
- 🛡️ **Security & Proxy Routing**: Built-in secure proxy to bypass CORS and Geo-blocking with custom headers, protected by Anti-SSRF DNS validation and Cloudflare Turnstile Server Actions.
- ⚡ **High-Performance Architecture**: Instant loading via SHA-256 IndexedDB channel caching, smart proxy bypass for direct streams, and live real-time watcher telemetry.
- ☁️ **Cloud Playlist Sync**: Built-in Google OAuth authentication with a PostgreSQL database to securely save and sync custom M3U/JSON playlists across all your devices.
- ✨ **Premium Glassmorphic UI**: Responsive interactive channel grid, seamless skeleton loaders, sticky headers, knockout bracket cards, and a GPU-optimized 3D CSS cyber background.
- 📂 **BDIX FTP Portal**: An elegant directory for local BDIX media servers featuring real-time online status and speed diagnostics.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Authentication**: [NextAuth.js (Auth.js)](https://next-auth.js.org/) (Google Provider)
- **Database ORM**: [Prisma](https://www.prisma.io/) (PostgreSQL)
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

   # Cloudflare Turnstile Verification Configuration
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
   TURNSTILE_SECRET_KEY=your-secret-key
   NEXT_PUBLIC_DISABLE_TURNSTILE=False

   # Developer/Local Subnet Origins (CORS validation bypass)
   ALLOWED_DEV_ORIGINS=live.shajon.dev,192.168.0.57

   # Database & Authentication (For Cloud Sync)
   DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

3. Setup the database and install dependencies:
   ```bash
   npm install
   npx prisma db push
   npx prisma generate
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

### Docker Deployment

You can deploy the application using the preconfigured multi-stage `Dockerfile` (optimized for Node.js 22):
```bash
docker build -t iptv-player .
docker run -p 3000:3000 iptv-player
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
