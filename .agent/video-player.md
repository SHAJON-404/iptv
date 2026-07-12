# Developer & Agent Guide: IPTV Video Player

This document explains the entry page (`/`), the main `IPTVPlayer` container, and the modular video playback UI controls.

## 📂 File Map
* **Page Entry**: [app/page.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/page.tsx)
* **Main Container**: [app/components/IPTVPlayer.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/components/IPTVPlayer.tsx)
* **Custom Video View**: [app/components/player/VideoPlayerView.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/components/player/VideoPlayerView.tsx)
* **Sub-components**: 
  - [app/components/player/ChannelListView.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/components/player/ChannelListView.tsx)
  - [app/components/player/ChannelStats.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/components/player/ChannelStats.tsx)
  - [app/components/player/TrendingChannels.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/components/player/TrendingChannels.tsx)
  - [app/components/player/PlaylistSidebarView.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/components/player/PlaylistSidebarView.tsx)

---

## 1. Page Entry & Main Layout
The home page `page.tsx` mounts a client-side layout consisting of:
* `BackgroundScene`: A customized backdrop rendering ambient glow gradients.
* `Header`: Navigation, update notifications, and external social community links.
* `IPTVPlayer`: The core interactive workspace container.

---

## 2. Main Container: `IPTVPlayer.tsx`
This orchestrates state across all UI views and binds them to the state hooks:
* **Playlists state (`useIPTVPlaylists`)**: Channels, playlists configurations, current active categories, dragging, importing, name filters.
* **Video engine state (`useVideoPlayer`)**: Buffering, volume, fullscreen, PIP, resolution, settings toggles, quality selectors.
* **Syncs channel change events**: Dispatches `iptv-channel-changed` custom event to trigger `ViewerTracker`.

---

## 3. Video Player UI: `VideoPlayerView.tsx`
Renders the custom HTML5 video player and overlays controls. Native controls are hidden entirely.

### Core Features:
* **Resolution Mapping**: Maps pixel height to badges (e.g. `width x height`):
  * `height >= 2160` -> `4K` (rose badge)
  * `height >= 1440` -> `2K` (amber badge)
  * `height >= 1080` -> `FHD` (purple badge)
  * `height >= 720` -> `HD` (blue badge)
  * `height < 720` -> `SD` (zinc badge)
* **Error Friendly Messages**: Translates raw engine error strings into descriptive cards (CORS blocks, 403 Forbidden, 404 dead links, DRM limitations, and iOS DASH restrictions).
* **Interactive Control Overlays**:
  * Double-click on the left/right sections triggers seek gestures (10s back/forward) with floating motion chevron indicators.
  * Custom volume sliders, sound toggles, PIP actions, and full-screen state bindings.
  * Settings menu for changing audio tracks, subtitles, quality levels, and player engines (`hls.js`, `shaka-player`, `mpegts.js`).
