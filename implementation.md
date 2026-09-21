# POLAR-EMS — System Implementation & Architecture Report

**Project**: AI-Driven Smart Microgrid & Energy Management System for Antarctic Research Stations (Maitri & Bharati)  
**Status**: Step 5 of 16 Complete (Full End-to-End Dashboard & SCADA Ingestion Connected to Neon PostgreSQL)  
**Last Updated**: September 22, 2026  

---

## 1. Executive Summary & Current Architecture

POLAR-EMS is an autonomous, mission-critical energy management system engineered for extreme polar environments (-50°C, 150 km/h katabatic blizzards, multi-month polar nights). It ensures 100% uninterrupted power to life support, medical bays, cryogenic sample storage, and SATCOM systems by coordinating diesel generators, bifacial photovoltaic solar arrays, high-latitude wind turbines, and Battery Energy Storage Systems (BESS).

### Core Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 14)                         │
│  - App Router (/dashboard, /stations, /data-upload, /weather, etc.)     │
│  - Real-time SCADA HUD, KPI Cards, Recharts 24-Hour Microgrid Charts    │
│  - Station Switcher (Maitri / Bharati) & Live Database Ingestion Hub    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / REST (apiClient)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node/Express :8000)                  │
│  - Express REST API with Helmet, CORS, Morgan, Rate Limiting            │
│  - Calculation Engines: Renewable Penetration, Stress Margin, Risk Eval │
│  - SCADA Ingestion Pipeline: Single-Packet & CSV/JSON Batch Importer    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Prisma ORM (PgBouncer Mode)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATABASE (Neon Serverless PostgreSQL)                │
│  - Tables: stations, weather_data, energy_loads, renewable_generation,  │
│    generators, generator_readings, batteries, battery_readings,         │
│    critical_loads, alerts, simulations, simulation_results, users       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Work Completed Till Now (Chronological Breakdown)

### Phase 1: High-Fidelity Frontend UI & Antarctic Design System
- Built modern Next.js 14 dashboard using Tailwind CSS and dark glassmorphic styling optimized for polar operations.
- Designed key microgrid views:
  - **Energy Operations Center** (`/dashboard`): 6 core KPI metrics, 24-Hour demand/generation chart, power distribution flow diagram, Cummins diesel generator fleet telemetry (`G1`–`G4`), and prioritized critical load allocation.
  - **Multi-Station View** (`/stations`): Geographic and operational comparison between Maitri (Schirmacher Oasis) and Bharati (Larsemann Hills).
  - **Meteorology Center** (`/weather`): Extreme weather gauges, katabatic wind tracking, wind chill computation, and blizzard risk classification.
  - **Power Flow & Energy** (`/energy`): Busbar balance, renewable penetration percentage, and battery state-of-charge.
  - **Generator Fleet** (`/generators`): Real-time load percentage, specific fuel consumption curves, oil pressure, and runtime hours.
  - **Life-Support Critical Loads** (`/critical-loads`): Tiered priority (Tier 1 Life Support / Tier 2 Mission Research / Tier 3 Flexible).
  - **Alerts & Diagnostics** (`/alerts`): Audio-visual alarm console with severity levels (`CRITICAL`, `WARNING`, `INFO`).
  - **Historical Analytics** (`/analytics`): Multi-day fuel savings trends, carbon displacement, and efficiency analysis.
  - **What-If Scenario Simulator** (`/simulation`): Stress testing generator trips, blizzard wind gusts, and battery depletion.

### Phase 2: Production-Ready Express Backend & Architecture
- Created modular Express backend (`backend/src`) with structured layers:
  - `config/`: Environment configuration (`env.js`), PostgreSQL Prisma client pool (`database.js`).
  - `controllers/`: Request handling and validation for 13 microgrid domains.
  - `services/`: Business logic, domain calculations, risk assessment algorithms, and DB queries.
  - `routes/`: Modular REST route endpoints mounted under `/api/*`.
  - `middleware/`: Centralized error handling (`error.middleware.js`), 404 handler, JWT authentication, and RBAC authorization guards.
  - `utils/`: Microgrid physics calculations (`calculations.js`), API response formatter (`apiResponse.js`).

### Phase 3: PostgreSQL Schema & Database Integration (Neon)
- Defined comprehensive relational schema in `prisma/schema.prisma`:
  - 13 mapped relational tables (`stations`, `weather_data`, `energy_loads`, `renewable_generation`, `generators`, `generator_readings`, `batteries`, `battery_readings`, `critical_loads`, `alerts`, `simulations`, `simulation_results`, `users`).
  - Provisioned cloud Neon Serverless PostgreSQL with PgBouncer connection pooling and direct connection fallbacks.

### Phase 4: Purge Synthetic Demo Data & Clean Zero-Baseline Architecture
- **Purge Execution**: Created and ran `backend/scripts/purge_demo_data.js`, removing all 674 rows of synthetic time-series data while safely preserving core physical stations, users, generators, batteries, and critical circuits.
- **Seeder Refactor**: Cleaned `backend/prisma/seed.js` to eliminate fake historical loops so database initializations always produce clean baseline assets.
- **Standby Detection**: Added `hasTelemetryData` flag to the dashboard API, enabling the UI to distinguish between empty clean state and active live data.

### Phase 5: SCADA Telemetry Ingestion Hub (`/data-upload`)
- **Ingestion API**: Built `backend/src/services/ingest.service.js` and mounted routes under `/api/ingest`:
  - `POST /api/ingest/:stationId/telemetry`: Ingests single live SCADA readings into PostgreSQL with automated risk & katabatic alert triggering.
  - `POST /api/ingest/:stationId/batch`: Bulk-inserts parsed CSV/JSON time-series records.
  - `GET /api/ingest/status`: Live record counter across all database tables.
  - `POST /api/ingest/purge`: On-demand database telemetry reset.
  - `GET /api/ingest/template/:type`: Generates CSV templates for download.
- **Frontend Ingestion Hub** (`frontend/src/app/(dashboard)/data-upload/page.tsx`):
  - Real-time PostgreSQL database counter cards.
  - Manual telemetry injection form with 1-click Polar Presets (*Austral Summer*, *Katabatic Blizzard*, *Polar Night*).
  - Drag-and-drop CSV/JSON batch file upload with in-browser data preview table before committing.
  - Downloadable sample CSV templates.
  - Added "Data Ingestion" to the sidebar navigation.

### Phase 6: Dashboard End-to-End Real Database Connection (Completed Step 5)
- Modified `frontend/src/app/(dashboard)/dashboard/page.tsx`:
  - Completely removed mock fetchers (`apiClient.getGenerators()`, `apiClient.getCriticalLoads()`, `apiClient.getForecast()`).
  - Integrated `apiClient.getDashboardData(activeStationId)` as the single source of truth.
  - Mapped PostgreSQL data directly into component states:
    - Generators (`G1`–`G4`) with real outputs, runtime, and fuel levels.
    - 8 real critical circuits per station.
    - Real database time-series points into the 24-hour chart.
    - Dynamic operational AI advisory generated from real alerts and system metrics.
    - Wired `EnergyFlow` and top KPI cards to live database values (`64 kW` Load, `50 kW` Renewables, `75%` SOC, `79%` Fuel).
  - Tested and verified in browser with live recordings.

---

## 3. Existing Project File Structure

```text
SIH61/
├── .env.local
├── .neon
├── README.md
├── implementation.md                      <-- (This Document)
│
├── backend/
│   ├── .env                              <-- Database URL & Server config
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma                 <-- 13 PostgreSQL Database Models
│   │   └── seed.js                       <-- Clean baseline seeder
│   ├── scripts/
│   │   └── purge_demo_data.js            <-- Script to purge synthetic rows
│   └── src/
│       ├── app.js                        <-- Express application & route mounts
│       ├── server.js                     <-- HTTP listener & DB connection
│       ├── config/
│       │   ├── database.js               <-- Prisma Client instance & healthcheck
│       │   └── env.js                    <-- Environment variable parser & validator
│       ├── controllers/
│       │   ├── alert.controller.js
│       │   ├── analytics.controller.js
│       │   ├── auth.controller.js
│       │   ├── battery.controller.js
│       │   ├── criticalLoad.controller.js
│       │   ├── dashboard.controller.js
│       │   ├── energy.controller.js
│       │   ├── generator.controller.js
│       │   ├── ingest.controller.js      <-- Telemetry & batch ingest handler
│       │   ├── renewable.controller.js
│       │   ├── simulation.controller.js
│       │   ├── station.controller.js
│       │   └── weather.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js        <-- JWT verification & RBAC
│       │   ├── error.middleware.js       <-- Centralized error handling
│       │   └── notFound.middleware.js    <-- 404 handler
│       ├── routes/
│       │   ├── alert.routes.js
│       │   ├── analytics.routes.js
│       │   ├── auth.routes.js
│       │   ├── battery.routes.js
│       │   ├── criticalLoad.routes.js
│       │   ├── dashboard.routes.js       <-- Consolidates microgrid telemetry
│       │   ├── energy.routes.js
│       │   ├── generator.routes.js
│       │   ├── ingest.routes.js          <-- Ingestion API routes
│       │   ├── renewable.routes.js
│       │   ├── simulation.routes.js
│       │   ├── station.routes.js
│       │   └── weather.routes.js
│       ├── services/
│       │   ├── alert.service.js
│       │   ├── analytics.service.js
│       │   ├── auth.service.js
│       │   ├── battery.service.js
│       │   ├── criticalLoad.service.js
│       │   ├── dashboard.service.js      <-- Computes KPIs & balance from DB
│       │   ├── energy.service.js
│       │   ├── forecast.service.js       <-- Placeholder for Python ML model
│       │   ├── generator.service.js
│       │   ├── ingest.service.js         <-- Ingestion service for SCADA
│       │   ├── optimization.service.js   <-- Placeholder for OR-Tools MILP
│       │   ├── renewable.service.js
│       │   ├── simulation.service.js
│       │   ├── station.service.js
│       │   └── weather.service.js
│       └── utils/
│           ├── apiResponse.js            <-- Standardized JSON response envelope
│           └── calculations.js           <-- Microgrid formulas (penetration, stress)
│
└── frontend/
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.js
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx                <-- Root layout (fonts, providers)
        │   ├── globals.css               <-- Base styles & animations
        │   ├── loading.tsx               <-- Global loading skeleton
        │   ├── not-found.tsx             <-- 404 page
        │   ├── page.tsx                  <-- Redirects to /dashboard
        │   ├── login/page.tsx            <-- Login view
        │   ├── signup/page.tsx           <-- Signup view
        │   └── (dashboard)/
        │       ├── layout.tsx            <-- Dashboard shell with Sidebar & Header
        │       ├── dashboard/page.tsx    <-- MAIN DASHBOARD (Connected to Real DB)
        │       ├── data-upload/page.tsx  <-- INGESTION HUB (Telemetry & Batch CSV)
        │       ├── stations/page.tsx     <-- Multi-station overview
        │       ├── weather/page.tsx      <-- Meteorology & Blizzard tracking
        │       ├── energy/page.tsx       <-- Energy balance & SCADA flow
        │       ├── generators/page.tsx   <-- Genset telemetry & fuel status
        │       ├── alerts/page.tsx       <-- Alert management console
        │       ├── analytics/page.tsx    <-- Historical trends & carbon offset
        │       ├── forecast/page.tsx     <-- AI Load & Renewable Forecasting
        │       ├── optimization/page.tsx <-- MILP Dispatch Schedule
        │       ├── simulation/page.tsx   <-- Scenario & Stress Simulator
        │       └── settings/page.tsx     <-- System & Station configuration
        ├── components/
        │   ├── common/
        │   │   ├── StatusBadge.tsx       <-- Color-coded state indicator
        │   │   └── Toast.tsx             <-- Notification toast system
        │   ├── layout/
        │   │   ├── Header.tsx            <-- Top bar with weather, time, user
        │   │   └── Sidebar.tsx           <-- Navigation menu
        │   ├── dashboard/
        │   │   ├── AIInsight.tsx         <-- Dynamic Operational Advisory
        │   │   ├── CriticalLoads.tsx     <-- Life-support circuit status
        │   │   ├── EnergyFlow.tsx        <-- Interactive SCADA flow diagram
        │   │   ├── GeneratorStatus.tsx   <-- Cummins G1–G4 cards
        │   │   └── KPICard.tsx           <-- Reusable KPI metric card
        │   └── charts/
        │       ├── EnergyOverviewChart.tsx <-- 24-Hour Composed Recharts
        │       ├── DispatchScheduleChart.tsx
        │       ├── ForecastAccuracyChart.tsx
        │       ├── HistoricalFuelChart.tsx
        │       └── RenewableTrendChart.tsx
        ├── lib/
        │   ├── api/
        │   │   └── client.ts             <-- API client with backend & fallback endpoints
        │   ├── context/
        │   │   └── StationContext.tsx    <-- Global state (station, alerts, user)
        │   └── types/
        │       └── index.ts              <-- TypeScript data types & interfaces
        └── mock-data/                    <-- Fallback/reference fixtures
```

---

## 4. Backend Route Status & Complete API Specification

The Express backend runs on `http://localhost:8000/api`. All endpoints return a standardized JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive status",
  "meta": { "timestamp": "ISO8601" }
}
```

### Route Inventory & Live Status Table

| Domain | Method | Endpoint | Description | DB Source | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/health` | Healthcheck & DB connection status | PostgreSQL Ping | ✅ **Active** |
| **Auth** | `POST` | `/api/auth/register` | Register new user account | `users` | ✅ **Active** |
| **Auth** | `POST` | `/api/auth/login` | Login with JWT generation | `users` | ✅ **Active** |
| **Auth** | `GET` | `/api/auth/me` | Current authenticated user profile | `users` | ✅ **Active** (Protected) |
| **Dashboard**| `GET` | `/api/dashboard/:stationId` | Consolidated real-time snapshot & KPIs | Multi-table join | ✅ **Active** |
| **Ingest** | `POST` | `/api/ingest/:stationId/telemetry` | Ingest single SCADA telemetry packet | Multi-table insert | ✅ **Active** |
| **Ingest** | `POST` | `/api/ingest/:stationId/batch` | Bulk insert CSV/JSON time-series | `weather`/`energy`/`renew` | ✅ **Active** |
| **Ingest** | `GET` | `/api/ingest/status` | Real-time database row counts | `COUNT(*)` queries | ✅ **Active** |
| **Ingest** | `POST` | `/api/ingest/purge` | Purge station readings to zero state | Cascade delete | ✅ **Active** |
| **Ingest** | `GET` | `/api/ingest/template/:type` | Returns required CSV header formats | Static schema | ✅ **Active** |
| **Stations** | `GET` | `/api/stations` | List all research stations | `stations` | ✅ **Active** |
| **Stations** | `GET` | `/api/stations/:id` | Get single station details | `stations` | ✅ **Active** |
| **Stations** | `POST` | `/api/stations` | Create research station | `stations` | ✅ **Active** (Admin) |
| **Weather** | `GET` | `/api/weather/:stationId/current`| Latest meteorology snapshot | `weather_data` | ✅ **Active** |
| **Weather** | `GET` | `/api/weather/:stationId/history`| Historical weather time-series | `weather_data` | ✅ **Active** |
| **Weather** | `POST` | `/api/weather/:stationId` | Record weather observation | `weather_data` | ✅ **Active** |
| **Energy** | `GET` | `/api/energy/:stationId/current` | Latest station load demand | `energy_loads` | ✅ **Active** |
| **Energy** | `GET` | `/api/energy/:stationId/history` | Historical load demand records | `energy_loads` | ✅ **Active** |
| **Energy** | `POST` | `/api/energy/:stationId` | Record electrical load reading | `energy_loads` | ✅ **Active** |
| **Renewable**| `GET` | `/api/renewable/:stationId/current`| Latest solar/wind generation | `renewable_generation` | ✅ **Active** |
| **Renewable**| `GET` | `/api/renewable/:stationId/history`| Historical generation curves | `renewable_generation` | ✅ **Active** |
| **Renewable**| `POST` | `/api/renewable/:stationId` | Record solar & wind generation | `renewable_generation` | ✅ **Active** |
| **Generators**| `GET`| `/api/generators/:stationId` | List generators with latest status | `generators` + readings | ✅ **Active** |
| **Generators**| `GET`| `/api/generators/unit/:id` | Specific generator details & readings | `generators` | ✅ **Active** |
| **Generators**| `POST`| `/api/generators/:id/reading` | Record generator output & fuel draw | `generator_readings` | ✅ **Active** |
| **Generators**| `PATCH`| `/api/generators/:id/status` | Update status (RUNNING/STOPPED/MAINT) | `generators` | ✅ **Active** |
| **Batteries**| `GET` | `/api/batteries/:stationId` | BESS containers & latest SOC | `batteries` + readings | ✅ **Active** |
| **Batteries**| `POST`| `/api/batteries/:id/reading` | Record battery charge/discharge | `battery_readings` | ✅ **Active** |
| **Critical** | `GET` | `/api/critical-loads/:stationId` | List critical load circuits | `critical_loads` | ✅ **Active** |
| **Critical** | `POST`| `/api/critical-loads/:stationId` | Create critical load circuit | `critical_loads` | ✅ **Active** |
| **Critical** | `PATCH`| `/api/critical-loads/:id` | Update circuit status/consumption | `critical_loads` | ✅ **Active** |
| **Alerts** | `GET` | `/api/alerts/:stationId` | List active & historic alarms | `alerts` | ✅ **Active** |
| **Alerts** | `PATCH`| `/api/alerts/:id/acknowledge` | Acknowledge alarm | `alerts` | ✅ **Active** |
| **Analytics**| `GET` | `/api/analytics/:stationId` | Aggregated efficiency & fuel metrics | Multi-table aggregations | ✅ **Active** |
| **Simulation**|`POST`| `/api/simulation/run` | Execute microgrid stress scenario | `simulations` | ✅ **Active** |
| **Simulation**|`GET` | `/api/simulation/history/:stationId`| List previous simulation runs | `simulations` | ✅ **Active** |
| **Forecast** | `GET` | `/api/forecast/:stationId` | 24-hr load/renewable AI forecast | ML Service / Fallback | 🔄 Next (Python ML) |
| **Optimizer**| `GET` | `/api/optimization/:stationId` | MILP optimal generator dispatch | OR-Tools / Fallback | 🔄 Next (Phase 2) |

---

## 5. Frontend Routes & Module Status

| Route Path | Module Name | Primary Component File | Data Source | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Landing / Redirect | `frontend/src/app/page.tsx` | Next.js Router | ✅ Completed |
| `/dashboard` | Energy Operations Center | `src/app/(dashboard)/dashboard/page.tsx` | **Live Backend** (`/api/dashboard/:stationId`) | ✅ **Connected to DB** |
| `/data-upload`| SCADA Ingestion Hub | `src/app/(dashboard)/data-upload/page.tsx` | **Live Backend** (`/api/ingest/*`) | ✅ **Connected to DB** |
| `/stations` | Multi-Station Compare | `src/app/(dashboard)/stations/page.tsx` | Mock Client (`client.ts`) | 🔄 Next to connect (`/api/stations`) |
| `/weather` | Meteorology & Blizzard | `src/app/(dashboard)/weather/page.tsx` | Mock Client (`client.ts`) | ⬜ Scheduled (`/api/weather/*`) |
| `/energy` | Energy Flow & Balance | `src/app/(dashboard)/energy/page.tsx` | Mock Client (`client.ts`) | ⬜ Scheduled (`/api/energy/*`) |
| `/generators`| Diesel Fleet Telemetry | `src/app/(dashboard)/generators/page.tsx` | Mock Client (`client.ts`) | ⬜ Scheduled (`/api/generators/*`) |
| `/alerts` | Alarm & Event Console | `src/app/(dashboard)/alerts/page.tsx` | In-memory Client | ⬜ Scheduled (`/api/alerts/*`) |
| `/analytics` | Historical Efficiency | `src/app/(dashboard)/analytics/page.tsx` | Mock Client (`client.ts`) | ⬜ Scheduled (`/api/analytics/*`) |
| `/simulation`| Contingency Simulator | `src/app/(dashboard)/simulation/page.tsx`| Client Calculation | ⬜ Scheduled (`/api/simulation/*`) |
| `/forecast` | AI Forecast Engine | `src/app/(dashboard)/forecast/page.tsx` | Mock Client (`client.ts`) | ⬜ Scheduled (Python ML Service) |
| `/optimization`| MILP Smart Dispatch | `src/app/(dashboard)/optimization/page.tsx`| Mock Client (`client.ts`) | ⬜ Scheduled (OR-Tools Engine) |
| `/settings` | System Configuration | `src/app/(dashboard)/settings/page.tsx` | Local Storage | ✅ Functional |
| `/login` | Authentication Login | `src/app/login/page.tsx` | **Live Backend** (`/api/auth/login`) | ✅ Ready |
| `/signup` | User Registration | `src/app/signup/page.tsx` | **Live Backend** (`/api/auth/register`) | ✅ Ready |

---

## 6. End-to-End Roadmap Status

```text
✅ 1. Frontend UI & Antarctic Design System
✅ 2. Backend Express REST API & Domain Layer
✅ 3. PostgreSQL Database with Prisma ORM (Neon Serverless)
✅ 4. Seed Clean Baseline & Purge Synthetic Data
✅ 5. Connect Frontend Dashboard → Backend Database
🔄 6. Connect ALL Dashboard Modules to Backend
     ├── Stations (/stations) ────────► NEXT STEP
     ├── Weather (/weather)
     ├── Energy (/energy)
     ├── Generators (/generators)
     ├── Alerts (/alerts)
     └── Analytics (/analytics)
⬜ 7. Add real-time streaming / historical time-series aggregation
⬜ 8. Python ML forecasting engine (LightGBM / Transformer-LSTM)
⬜ 9. OR-Tools MILP optimization dispatch engine
⬜ 10. RAG microgrid operational manual knowledge base
⬜ 11. Gemini / Groq AI Assistant integration
⬜ 12. Scenario & Contingency stress engine
⬜ 13. System audio-visual alerts & escalation webhooks
⬜ 14. Authentication, session management & RBAC guards
⬜ 15. End-to-end integration tests & containerized deployment
⬜ 16. Final SIH Demonstration & Evaluation Pack
```
