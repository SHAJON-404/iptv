# Developer & Agent Guide: FAQ Page

This document explains the structural layout and content categories of the Frequently Asked Questions (FAQ) page.

## 📂 File Map
* **FAQ Page Component**: [app/faq/page.tsx](../app/faq/page.tsx)

---

## 1. Overview
The `/faq` page houses help guides, troubleshoot explanations, and legal disclaimers for the IPTV player. It features an accordion-based layout built with glassmorphic cards and micro-animations.

---

## 2. Accordion Component Architecture
The accordion uses:
* **State**: `activeFaq` tracks the current expanded FAQ item string ID (mutually exclusive accordion toggle logic).
* **Animations**:
  * Staggered entry transitions on mount using Framer Motion (`initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`).
  * Smooth height expansion/collapse using `AnimatePresence` and CSS height transitions (`initial={{ height: 0, opacity: 0 }}` to `animate={{ height: "auto", opacity: 1 }}`).
* **Icons mapping**: Maps a distinct Lucide icon component to each question item card (e.g. `HelpCircle`, `Tv`, `ListPlus`, `Scale`, etc.).

---

## 3. Disclaimers & Guidelines (Important)
* **Copyright/DMCA**: Explains that this player is client-only. It does not distribute, sell, or host any streaming content.
* **Community Playlists**: Explicitly outlines that third-party Telegram or Discord playlists are not affiliated with or supported by this player's development.
