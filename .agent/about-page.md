# Developer & Agent Guide: About Page

This document explains the structural details of the `/about` route and the interactive updates checker.

## 📂 File Map
* **Page Route**: [app/about/page.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/about/page.tsx)
* **Main View**: [app/components/AboutView.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/components/AboutView.tsx)

---

## 1. Overview
The `/about` page renders a detailed view of the application version, developer info (S. SHAJON), donation addresses, and social contact media.

---

## 2. Dynamic Update Mechanism
The view contains an interactive update checker button that behaves differently depending on the runtime environment (Electron vs. Web):

### A. Desktop (Electron) Context:
* It checks if `window.electronAPI` is available.
* If present, it invokes `electronAPI.checkForUpdates()` to talk to the Electron main process, which performs GitHub Release queries and parses results.

### B. Web Browser Context:
* It falls back to direct client-side requests using the public GitHub API:
  `https://api.github.com/repos/SHAJON-404/iptv/releases/latest`
* It compares SemVer tags (e.g. `v3.3.0` vs `v3.2.0`) client-side to determine if there is an update.

---

## 3. Copy-to-Clipboard Actions
For copy actions (e.g., BTC, ETH, USDT, Bkash, Nagad donation accounts), the view uses a copy utility with transient feedback state `copiedText`, resetting after 2 seconds to revert indicators.

---

## 4. Layout & Aesthetics
* **Transitions**: Integrated with Framer Motion layout transitions (`initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}`).
* **Glassmorphism**: Implements semi-transparent background sheets `bg-white/[0.015]` with fine border frames `border-white/5` or `border-white/10`.
