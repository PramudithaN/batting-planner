# Sri Lanka Cricket: Batting Practice Planner

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
[![GitHub Pages](https://img.shields.io/github/actions/workflow/status/PramudithaN/batting-planner/deploy-pages.yml?branch=main&style=for-the-badge&logo=github&label=GitHub%20Pages)](https://github.com/PramudithaN/batting-planner/actions/workflows/deploy-pages.yml)

A mobile-first PWA for Sri Lanka Cricket batting practice planning, live ball-by-ball scoring, 3D wagon wheels, and Excel reports.

**Live Deployment (GitHub Pages):** https://pramudithan.github.io/batting-planner/

---

## Key Features

- **Role-Based PIN Authentication:** Supports `master`, `coach`, and `viewer` profiles with a 1-tap profile selector and auto-submitting 4-digit PIN pad.
- **Guided 2-Step Day Setup (`Day Setup`):**
  - Practice date selection and custom time-slot management.
  - Searchable 35-player squad pool with official headshots, custom guest player support, and 1-tap squad quick-select (`ODI`, `T20I`, `Test`, `Sri Lanka A`).
  - Net station builder with 1-tap presets (`Pace Net`, `Spin Net`, `Center Wicket`), inline editing, and confirmation dialogs before deletion.
- **Live Ball-by-Ball Scoring (`Live Nets`):**
  - Concurrent `(station, player)` locking with takeover support to prevent multi-coach overwrites.
  - 1-tap Pitch Map (`Length x Line`), sticky Bowling Style, categorized Shot Types, Runs, and Contact Outcomes with optional **1-Tap Save** mode.
  - **Interactive 3D Wagon Wheel (Three.js):** Real-time WebGL cricket stadium with orbit/tilt/zoom controls, `Broadcast 3D` / `Top View` / `Low Angle` camera presets, `RHB / LHB` stance toggle, and 3D parabolic shot trajectories.
  - Live Broadcast Player Stat Card (`Runs`, `Balls`, `S. Rate`, `4s / 6s`, `Solid %`) and delivery-by-delivery ticker.
- **Live Analytics Dashboard & Reports (`Reports`):**
  - Filterable by station, player, and bowling style.
  - Live charts for **Contact Outcome Distribution**, **Solid % by Bowling Style**, and **Top Shot Types**.
  - Broadcast **SCORE CARD** with expandable coach remarks, net breakdown table, and formatted `.xlsx` exports (`Batting_Day_YYYY-MM-DD.xlsx` and `Batting_Player_Report.xlsx`).
- **Offline-First PWA & Adaptive Theme:**
  - Daylight and Floodlight (dark) themes, spring-physics toast notifications, first-time contextual guide tooltips, offline mutation queuing, and multi-tab `BroadcastChannel` sync.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **3D Visualization:** Three.js (`OrbitControls`, `TubeGeometry`, `Raycaster`)
- **Validation & Exports:** Zod v4, ExcelJS
- **Backend (Optional):** Supabase (PostgreSQL, RLS, Realtime)

---

## Getting Started

```bash
bun install
bun run dev
```

### Build & GitHub Pages Deployment

The production build outputs to `dist/` (gitignored) and is deployed automatically to GitHub Pages via `.github/workflows/deploy-pages.yml` using Bun on every push to `main`:

```bash
bun run typecheck
bun run build
bun run preview
```

---

## Environment Variables (Optional Supabase Live Sync)

Copy `.env.example` to `.env` and add your Supabase project credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run `supabase/schema.sql` in the Supabase SQL Editor to provision PostgreSQL tables, RLS policies, and Realtime channels. Without `.env`, the application runs in local/offline-first mode using `localStorage` and `BroadcastChannel`.

---

## Demo Profiles (Local Mode)

| Role | PIN | Access |
| :--- | :--- | :--- |
| **Master** | `1111` | Full setup, live scoring, reports, and history management |
| **Coach** | `2222` to `5555` | Day setup, live scoring, and reports |
| **Viewer** | `0000` | Read-only access across all views |
