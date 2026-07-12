# Developer & Agent Guide: Viewer Tracking API

This guide documents the viewer tracking flow, heartbeat triggers, and the session aggregation API.

## 📂 File Map
* **Client tracker**: [app/components/ViewerTracker.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/components/ViewerTracker.tsx)
* **Backend target**: `/api/iptv/stats` (hosted on the web hub `iptv-web` workspace)

---

## 1. Client-Side Tracking Lifecycle (`ViewerTracker.tsx`)
The `ViewerTracker` is a logic-only React component mounted globally on the layout page. It operates as follows:

### A. Unique Session ID Generation
* Retrieves a persistent UUID from `localStorage` (`iptv_unique_viewer_id`).
* If not present, it generates one dynamically using `crypto.randomUUID()` (or a fallback pseudo-random generator in older browsers) and saves it to storage.

### B. Heartbeat Loop
* **Interval**: Sends a POST request every 15 seconds.
* **Instant Triggers**: Immediately fires heartbeats upon:
  * Component mount.
  * Browser visibility status changes (from background back to `visible` state).
  * Selection change of channels (captures custom `iptv-channel-changed` event dispatches).

### C. Payload Structure
The POST body maps to the schema:
* `sessionId`: Client UUID.
* `playingNow`: Metadata of the active channel. Includes channel logo, name, group, proxy usage, referer override, custom headers, and browser user-agent.

### D. UI Event Synchronization
On successful responses, the tracker receives aggregate counts. It dispatches a custom window event `iptv-viewer-count` carrying:
* `count`: Global concurrent viewers count.
* `topChannels`: List of top channels with active counts, updating the trending lists in the UI.

---

## 2. Web Hub Statistics Backend (`/api/iptv/stats`)
The tracking target processes client payloads at the central server:
* Groups viewer sessions in memory by lowercase channel name.
* Aggregates active sessions (filtering out dead heartbeats).
* Returns active player counts and the list of the top 10 channels sorted by viewer count.
