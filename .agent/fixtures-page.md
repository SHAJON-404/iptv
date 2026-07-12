# Developer & Agent Guide: FIFA Fixtures & Bracket Page

This document explains the interactive tournament brackets, scheduling updates, and BST timezone helper integrations.

## 📂 File Map
* **Page Route**: [app/fixtures/page.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/fixtures/page.tsx)
* **Client Root**: [app/fixtures/FixturesClient.tsx](file:///d:/GitHub-Projects/project-iptv/iptv/app/fixtures/FixturesClient.tsx)
* **Custom hook**: [app/fixtures/hooks/useFixtures.ts](file:///d:/GitHub-Projects/project-iptv/iptv/app/fixtures/hooks/useFixtures.ts)
* **UI Components**:
  - `MatchCard`: Displays single match stats, teams, scores, flag icons, and dates.
  - `BracketMatchCard`: Displays matches formatted inside the grid tree branches.
  - `Connectors`: SVG path vectors linking match nodes in the bracket tree.

---

## 1. Overview
The `/fixtures` page hosts a dashboard showing match dates, scores, and groups for the FIFA World Cup 2026. The view is converted to Bangladesh Standard Time (BST, `Asia/Dhaka`).

---

## 2. Interactive Tournament Bracket Tree
The bracket tree displays the knockout schedule in a balanced, dual-column structure:
* **Left Side (leading to Semi-final 101)**:
  * Round of 32 IDs: `[74, 77, 73, 75, 83, 84, 81, 82]`
  * Round of 16 IDs: `[89, 90, 93, 94]`
  * Quarter-finals IDs: `[97, 98]`
* **Right Side (leading to Semi-final 102)**:
  * Round of 32 IDs: `[76, 78, 79, 80, 86, 88, 85, 87]`
  * Round of 16 IDs: `[91, 92, 95, 96]`
  * Quarter-finals IDs: `[99, 100]`

---

## 3. Data Orchestration (`useFixtures.ts`)
The `useFixtures` state hook manages:
* Fetching match lists from static JSONs (or API endpoints if loaded).
* Calculations for group tables (wins, losses, goals difference, points) based on match scores.
* Live filter criteria: group name, query string matching country names, match status (Scheduled, Live, Completed).
* Methods like `getKnockoutMatch(matchId)` returning structural records matching bracket leaf layouts.
