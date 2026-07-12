# AI Agent & Developer Hub for IPTV Project

Welcome to the **IPTV** project workspace. This document serves as the central directory mapping to topic-specific manuals, followed by key development rules and workflow standards.

---

## 🗺️ Documentation Directory Hub

### Page Implementation Manuals
* 📺 **[Video Player (Home Route)](video-player.md)**: Main player page layout, component structure, custom overlay controls, and settings menus.
* ℹ️ **[About Route Guide](about-page.md)**: Contact channels, profile pages, and hybrid update checking logic (Electron API vs public GitHub fetch).
* 🏆 **[Fixtures & Bracket](fixtures-page.md)**: FIFA World Cup 2026 scheduling, tournament grids, connect paths, and BST timezone conversion calculations.
* 💬 **[FAQ Accordions](faq-page.md)**: Interactive accordion animation behaviors, user guides, and copyright/DMCA disclaimers.
* 📁 **[FTP Portals Mapping](ftp-page.md)**: High-speed BDIX local FTP servers mapping, link metadata, and badge stylings.

### Core Architectural Subsystems
* 💻 **[Electron Integration](electron-app.md)**: Main/preload scripts, socket-based dynamic port bindings, writable mirrored paths for AppImage, and sleep blocker handlers.
* ⚙️ **[Streaming Engines](video-engines.md)**: Integrations for HLS.js, Shaka Player, and mpegts.js, dynamic quality level scanning, and the core hook state.
* 🗄️ **[Playlist Parsing & Caching](playlist-management.md)**: Custom M3U options parser, client IndexedDB cache validation, and server-side cache hashing rules.
* 🛡️ **[Proxy Routing & Stream Guardian](stream-guardian-and-proxy.md)**: Anti-SSRF domain validation, legacy TLS fallback configuration, manifest manipulation, and stream health diagnostics.
* 📈 **[Viewer Session Heartbeats](viewer-tracking-api.md)**: Client UUID generation, visibility states tracking, and active session counters integration.

---

## 📌 Project Overview
This project is a modern, responsive, and high-performance IPTV web player built with Next.js. It supports **HLS (.m3u8)**, **DASH (.mpd)**, and legacy **MPEG-TS (.ts)** live streams. It parses custom `.m3u` and `.json` playlists locally, and features a sleek, premium, glassmorphism-inspired UI with YouTube-like video controls and quality selection.

## 🛠️ Technology Stack
- **Framework:** Next.js 16.x (App Router)
- **Library:** React 19
- **Language:** TypeScript
- **Styling:** TailwindCSS v4 (using `@tailwindcss/postcss`)
- **Video Players / Engines:** 
  - `hls.js` (for HTTP Live Streaming)
  - `shaka-player` (for DASH and DRM-encrypted streams)
  - `mpegts.js` (for legacy MPEG-TS streams)
  - `video.js` (for standard video playback wrappers and fallback streams)
- **HTTP Client:** Undici (for secure proxy streaming)
- **Animations:** `motion` (Framer Motion)
- **Icons:** `lucide-react`, `react-icons`

## 📜 Coding Standards & Rules

### 1. TypeScript & Strictness
- Write strict TypeScript.
- **Avoid `any`**: Do not use `any`. If interacting with untyped third-party libraries (like Shaka Player events), use `unknown` and cast safely, or explicitly use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` only if absolutely necessary.
- Define explicit `interface` or `type` for all component props and state objects.

### 2. React Best Practices
- Use **Functional Components** exclusively.
- Use Next.js `"use client"` directive at the top of files that utilize React hooks (`useState`, `useEffect`, `useRef`).
- Extract complex state logic into custom hooks (e.g., `useVideoPlayer.ts`).
- Memoize heavy computations using `useMemo` and wrap callback functions in `useCallback` to prevent unnecessary re-renders.

### 3. Styling & UI Design (Aesthetics)
- **Premium Feel:** The UI is designed to be modern, vibrant, and sleek. Always utilize glassmorphism effects (e.g., `bg-black/90 backdrop-blur-xl border border-white/10`).
- **TailwindCSS v4:** Use standard Tailwind utility classes.
- **Animations:** Use Framer Motion (`motion.div`, `AnimatePresence`) for micro-interactions, popovers, and smooth state transitions. Do not use generic blocky UI.

### 4. Video Player Integration
- **Do not use native HTML5 player alone** for `.m3u8`, `.mpd`, or `.ts` files (unless on iOS where native HLS is supported). 
- Rely on the centralized `useVideoPlayer.ts` hook for stream initialization.
- **Quality Selection:** Quality state is dynamic and must be re-fetched whenever a channel changes. `availableQualities` are extracted directly from the HLS `levels` or Shaka Player `variantTracks`.
- Ensure all video controls (play, pause, volume, pip, fullscreen, settings) are managed via custom overlays, hiding the native video controls.

### 5. Backend, Next.js APIs, & Security
- Use Next.js Route Handlers (`app/api/route.ts`).
- When dealing with CORS issues on live streams, route the streams through the built-in proxy (`/api/iptv/proxy`).
- **Dynamic Default Playlists & Hashing**: The playlist cards and channels lists are dynamic. The server retrieves playlist indexes from `PLAYLIST_DOMAIN` (from environment variables) at `/api/iptv/channels` and `/api/iptv/channels/hash`. The server checks, computes SHA-256 hashes of channel JSONs, and caches them in memory.
- **Client-Side Hashing & Caching**: The client uses IndexedDB cache (`iptv-cache` database) to load playlist structures and channels instantly. It checks server hashes (`/api/iptv/channels/hash`) in the background on mount and periodically (every 15 minutes), only updating cache and state if a change is detected.
- Ensure proxy routes (`Undici`) maintain anti-SSRF protections and handle URL/query parameter propagation correctly.

### 6. Electron & Desktop Application Context
- **Standalone server**: In production, Electron spawns the built Next.js server locally (`.next/standalone/server.js`) on a dynamic free port.
- **Environment variables**: Config settings are read from a `.env` file located in the user's AppData directory or next to the executable.

## 🤝 AI Agent Workflow
When asked to implement a feature or fix a bug:
1. **Analyze:** Check `useVideoPlayer.ts`, `useIPTVPlaylists.ts`, or `useAuth.ts` before creating new state to see if it belongs there.
2. **Design:** Ensure any new UI matches the dark, glassmorphic theme.
3. **Verify:** Check for linting errors using `npm run lint`.
4. **Communicate:** Keep explanations concise and use GitHub-flavored markdown.
