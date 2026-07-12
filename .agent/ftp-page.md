# Developer & Agent Guide: FTP Page

This document explains the BDIX FTP Servers list layout and statistics panel configuration.

## 📂 File Map
* **FTP Page Component**: [app/ftp/page.tsx](../app/ftp/page.tsx)

---

## 1. Overview
The `/ftp` page provides links to local BDIX-connected entertainment FTP portals offering low-latency downloads and streaming for peered ISP connections.

---

## 2. Server Configuration Schema
The page defines `ftpServers`, a static JSON list of servers with specific attributes:
* `name`: Server label (e.g. `BDIX Server 1`, `FTPBD Server`).
* `host` & `url`: Server network host addresses.
* `description`: Overview of media archives.
* `badge` & `speed`: Speed ratings and tier classifications (e.g. `Multi-Gigabit`, `100 Mbps+`).
* `icon`: Associated Lucide icon (e.g. `Database`, `Network`).
* `gradient`, `borderHover`, `iconBg`, `btnGradient`: Custom tailored dark theme tailwind CSS color styles matching the glassmorphism aesthetic.

---

## 3. Network Statistics Indicators
Displays general statistics card grids representing overall BDIX availability:
* `Network`: BDIX
* `Avg Speed`: 100 Mbps+
* `Servers`: Active counts
* `Content`: Storage directories indicators
