# Developer & Agent Guide: Stream Guardian & Proxy Router

This document explains the security, connection pooling, manifest rewriting rules, and client-side stream guardian logic.

## 📂 File Map
* **Client Hook**: [app/hooks/useStreamGuardian.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/hooks/useStreamGuardian.ts)
* **Proxy Router**: [app/api/iptv/proxy/route.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/api/iptv/proxy/route.ts)

---

## 1. Stream Proxy Router (`/api/iptv/proxy`)

### A. SSRF & DNS Protection
* Checks if target URL protocol is strictly `http:` or `https:`.
* Prevents requests to localhost, loopback names, and local IP addresses (RFC 1918 private ranges, loopback IPv4/IPv6, Unique Local, Link-Local).
* Uses `dns.promises.lookup` to resolve domain names to IPs at execution time.
* Caches DNS check validation results for 10 minutes (`DNS_CACHE_TTL`) to optimize channel switches.

### B. Connection Pooling & SSL Fallbacks
* **Standard Agent**: An Undici `Agent` instance configured with Keep-Alive timeout (15s) and connection limits (200 pools) for fast throughput.
* **Legacy SSL Agent**: Connects with legacy ciphers `DEFAULT:@SECLEVEL=0` and `minVersion: "TLSv1"` without strict TLS/SSL verification. If a standard proxy request fails with TLS handshake or cipher mismatch errors, the router automatically retries the request using this legacy SSL agent to handle older streaming servers.

### C. Manifest Rewriting Rules
* **HLS (.m3u8)**: Rewrites both inline segment URLs and attribute URIs (e.g. `URI="..."` tags for decryption keys/subtitles) to point back to the local proxy URL. Custom referer/header variables are forwarded inside rewritten segments.
* **DASH (.mpd)**: Resolves relative XML segments. It searches for `<BaseURL>` elements, rewriting relative entries to absolute paths, or injects a `<BaseURL>` entry pointing to the stream's folder right after the main `<MPD>` tag.
* **MPEG-TS (.ts) / segments**: Binary chunks are streamed back with client range headers forwarded, preserving `206 Partial Content` streams.

---

## 2. Client-Side Stream Guardian (`useStreamGuardian.ts`)
Tracks playback indicators using a mutable React `useRef` object (`streamHealthRef`) to avoid unnecessary page re-renders.

### Key Controls:
* **Stall Handling**: Stall detection triggers after 3 consecutive intervals (6s of no progress). The guardian nudges the current video time forward (`currentTime += 0.5s`) if a buffer exists, or seeks to the live edge. If stalled for >12s, it triggers a full player reload (`onForceRecovery`).
* **Unexpected Pause Protection**: Automatically calls `video.play()` if the stream is unexpectedly paused due to minor network lapses, ignoring cases where the user clicked pause manually (`isUserPaused`).
* **Memory Pressure Management**: Triggers back-buffer trimming (flushing cache behind current play position) when JavaScript heap usage exceeds 1.5 GB.
