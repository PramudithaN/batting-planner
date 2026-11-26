# Batting Practice Planner (Sri Lanka Cricket)

A tablet- and mobile-first **Progressive Web App (PWA)** for Sri Lanka Cricket High Performance batting practice planning, live ball-by-ball scoring, wagon-wheel visualization, and Excel reporting.

## Features
- **Coach Sign-In & Role-Based Access:** Supports `master`, `coach`, and `viewer` roles with 4-digit PIN sign-in.
- **Day Setup (`Day setup`):** Time-slotted sessions, searchable 35-player squad pool, custom player addition, and full CRUD for stations/nets.
- **Live Stations (`Live stations`):** Active `(station, player)` locking to prevent concurrent overwrites, 1-tap Pitch Map (`Length x Line`), sticky Bowling Style, grouped Shot Types, interactive SVG Wagon Wheel, Undo, and Coach Completion ratings (`0-10`).
- **Reports (`Reports`):** On-screen KPIs (`Total Balls`, `Solid %`, `Completed Records`), filterable Saved Wagon Wheels, and lazy-loaded `.xlsx` exports (`Batting_Day_YYYY-MM-DD.xlsx` and `Batting_Player_Report.xlsx`).
- **PWA & Offline Queue:** Installs to iPad/Android home screens with automatic offline queuing and multi-tab sync.

## Getting Started

```bash
npm install
npm run dev
```

### Environment Variables (Optional Supabase Live Sync)
Copy `.env.example` to `.env` and add your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
Run `supabase/schema.sql` in the Supabase SQL Editor to provision PostgreSQL tables, RLS policies, and Realtime channels. Without `.env`, the app runs in local/offline-first mode using `localStorage` and `BroadcastChannel`.

## Build & Verify
```bash
npm run typecheck
npm run build
```
