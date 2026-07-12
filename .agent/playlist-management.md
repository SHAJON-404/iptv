# Developer & Agent Guide: Playlist Caching & Parsing

This document explains the custom parsing rules for M3U and JSON playlists, IndexedDB cache managers, and API routes.

## 📂 File Map
* **Playlist State Hook**: [app/hooks/useIPTVPlaylists.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/hooks/useIPTVPlaylists.ts)
* **Playlist Parsers**: [app/lib/playlistParser.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/lib/playlistParser.ts)
* **API Endpoints**:
  - [app/api/iptv/playlists/available/route.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/api/iptv/playlists/available/route.ts)
  - [app/api/iptv/channels/route.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/api/iptv/channels/route.ts)
  - [app/api/iptv/channels/hash/route.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/api/iptv/channels/hash/route.ts)
  - [app/api/iptv/channels/helper.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/api/iptv/channels/helper.ts)

---

## 1. Playlist Parsing Engine (`playlistParser.ts`)

### A. M3U Parser (`parseM3U`)
Scans file content line-by-line:
* `#EXTINF:`: Extracts metadata including logo URL (via `tvg-logo` or `logo` attributes), category group (via `group-title`, `tvg-group`, or `group` attributes), and the channel name (following the last comma `,`).
* `#EXTVLCOPT:`: Extracts stream-specific custom parameters (such as `http-referrer`, `http-user-agent`, and `http-origin`) and registers them in the channel's `customHeaders` object.
* Matches standard URLs to construct full Channel interfaces.

### B. JSON Parser (`parseJSON`)
* Accepts lists of raw channels.
* Normalizes alternate fields (e.g. mapping `streamUrl` / `link` to `url`, and `logoUrl` / `image` to `logo`).
* Extracts specific header flags (`user-agent`, `origin`, `x-playback-session-id`) for forwarding.

---

## 2. Client-Side Cache (IndexedDB & State)
`useIPTVPlaylists.ts` implements instant content loading and periodic consistency checks:
* **IndexedDB Store (`iptv-cache`)**: Stores playlist arrays, categories, and channels configurations. It allows the player to load the entire channel list instantly on application mount instead of fetching lists from the server every time.
* **Update Consistency Checks**: On application mount, and every 15 minutes thereafter, the client fetches hashes (`/api/iptv/channels/hash`) from the server. It compares them against local IndexedDB hash values, only fetching updated playlist contents if a difference is identified.
* **Import Modes**: Supports file selection uploads (reading text in-browser), drag-and-drop file ingestion, or direct URL imports.

---

## 3. Server-Side Hashing & Cache (`/api/iptv/channels`)
To avoid overloading BDIX or remote servers, the Next.js server caches fetched channels:
* **In-Memory Cache**: The server cache stores fetched playlist details (`serverCache`) until the cached expiry timestamp is exceeded (`CACHE_EXPIRY_MS`).
* **SHA-256 Hashing**: Generates SHA-256 hashes of channel JSON data structure strings. The client calls `/api/iptv/channels/hash` to compare local records against this hash without needing to download megabytes of raw playlist files.
