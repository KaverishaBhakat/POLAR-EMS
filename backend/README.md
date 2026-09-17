# POLAR-EMS: Core Backend
**AI-Driven Smart Energy Management System for Polar Research Stations**

> **Phase 1: Core Application Backend**
> Layered, production-ready REST API built with Node.js, Express.js, PostgreSQL, and Prisma ORM for Indian Antarctic Research Stations (**Maitri** and **Bharati**).

---

## 1. Project Overview & Architecture

POLAR-EMS provides supervisory control, real-time energy balance monitoring, and life-support reliability tracking for isolated polar microgrids operating under extreme Antarctic conditions.

### Architectural Layering

```
Request
   ↓
Route (/api/*)
   ↓
Middleware (Auth / RBAC / Zod Validator / Rate Limit)
   ↓
Controller (Thin Request/Response Adapter)
   ↓
Service (Domain Logic / Deterministic Physical Modeling / Aggregations)
   ↓
Prisma Client ORM
   ↓
PostgreSQL Relational Database
```

### Future AI/ML & Optimization Microservices Integration
As required for SIH Phase 1:
- **Zero fake AI**: No ML or mathematical optimization libraries are implemented at this stage. All calculations and simulations are deterministic, rule-based thermodynamic and aerodynamic equations labeled as **"Rule-Based Simulation"**.
- Clean service contracts ([`forecast.service.js`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/backend/src/services/forecast.service.js) and [`optimization.service.js`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/backend/src/services/optimization.service.js)) exist as architectural placeholders ready to connect to Python FastAPI microservices running **XGBoost** (for wind/solar/load forecasting) and **Google OR-Tools / Pyomo** (for MILP dispatch optimization) in Phase 2 without changing the Node.js API interface.

---

## 2. Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: JavaScript
- **Database**: PostgreSQL 15+
- **ORM**: Prisma Client & Prisma CLI
- **Authentication**: JSON Web Tokens (JWT) + bcryptjs password hashing
- **Validation**: Zod (strict schema validation across `req.body`, `req.query`, and `req.params`)
- **Security**: Helmet, CORS (configured for Next.js), Express Rate Limiting
- **Logging**: Morgan HTTP access logger
- **Testing**: Jest + Supertest

---

## 3. Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js            # Prisma client singleton & connection checker
│   │   └── env.js                 # Environment variable parser & validator
│   ├── controllers/               # Thin HTTP controllers
│   │   ├── alert.controller.js
│   │   ├── analytics.controller.js
│   │   ├── auth.controller.js
│   │   ├── battery.controller.js
│   │   ├── criticalLoad.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── energy.controller.js
│   │   ├── generator.controller.js
│   │   ├── renewable.controller.js
│   │   ├── simulation.controller.js
│   │   ├── station.controller.js
│   │   └── weather.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js     # JWT verification & RBAC authorization
│   │   ├── error.middleware.js    # Standardized JSON error response handler
│   │   ├── notFound.middleware.js # 404 handler
│   │   └── validation.middleware.js # Zod schema middleware
│   ├── routes/                    # REST route definitions
│   │   ├── alert.routes.js
│   │   ├── analytics.routes.js
│   │   ├── auth.routes.js
│   │   ├── battery.routes.js
│   │   ├── criticalLoad.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── energy.routes.js
│   │   ├── generator.routes.js
│   │   ├── renewable.routes.js
│   │   ├── simulation.routes.js
│   │   ├── station.routes.js
│   │   └── weather.routes.js
│   ├── services/                  # Business logic & DB queries
│   │   ├── alert.service.js
│   │   ├── analytics.service.js
│   │   ├── auth.service.js
│   │   ├── battery.service.js
│   │   ├── criticalLoad.service.js
│   │   ├── dashboard.service.js
│   │   ├── energy.service.js
│   │   ├── forecast.service.js    # Future AI forecasting interface
│   │   ├── generator.service.js
│   │   ├── optimization.service.js# Future AI optimization interface
│   │   ├── renewable.service.js
│   │   ├── simulation.service.js
│   │   ├── station.service.js
│   │   └── weather.service.js
│   ├── utils/
│   │   ├── ApiError.js            # Standardized API error class
│   │   ├── asyncHandler.js        # Controller error wrapper
│   │   ├── calculations.js        # Microgrid physical equations & simulator
│   │   └── pagination.js          # Query pagination helper
│   ├── validators/                # Zod schemas
│   │   ├── alert.validator.js
│   │   ├── auth.validator.js
│   │   ├── battery.validator.js
│   │   ├── energy.validator.js
│   │   ├── generator.validator.js
│   │   ├── simulation.validator.js
│   │   ├── station.validator.js
│   │   └── weather.validator.js
│   ├── app.js                     # Express app configuration
│   └── server.js                  # HTTP server & graceful shutdown
├── prisma/
│   ├── schema.prisma              # 13 normalized entities with B-tree indexes
│   └── seed.js                    # 14 days of realistic diurnal Antarctic data
├── tests/                         # Integration and unit tests
├── docker-compose.yml             # PostgreSQL 15 container
├── .env.example
├── .env
├── package.json
└── README.md
```

---

## 4. Setup & Running Instructions

### 4.1 Prerequisites
- Node.js (v18 or higher) & npm
- PostgreSQL database (either running locally or via Docker Compose)

### 4.2 Starting PostgreSQL with Docker (Optional)
If you don't have a local PostgreSQL instance running:
```bash
docker compose up -d
```

### 4.3 Configure Environment Variables
Copy `.env.example` to `.env` and configure your database connection string:
```env
PORT=8000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/polar_ems?schema=public"
JWT_SECRET=polar_ems_secure_secret_key_sih2024_antarctica_station_energy_system
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

### 4.4 Install Dependencies & Generate Prisma Client
```bash
npm install
npm run prisma:generate
```

### 4.5 Apply Database Schema & Seed Data
```bash
# Push schema changes to PostgreSQL
npm run prisma:push

# Or run Prisma migrations
npm run prisma:migrate

# Seed demo users, research stations, equipment, and 14 days of telemetry
npm run prisma:seed
```

### 4.6 Start the Backend Server
```bash
# Development mode with hot reloading (nodemon):
npm run dev

# Production mode:
npm start
```

### 4.7 Run Automated Tests
```bash
npm test
```

---

## 5. Seeded Demo Accounts (Credentials)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@polar-ems.ncpor.res.in` | `Admin@123` | Full control over stations, users, equipment, system data |
| **OPERATOR**| `operator@polar-ems.ncpor.res.in` | `Operator@123` | Control gensets, acknowledge alerts, run simulations |
| **VIEWER** | `viewer@polar-ems.ncpor.res.in` | `Viewer@123` | Read-only access to dashboard, telemetry, analytics |

*Note: Passwords are securely hashed with bcrypt (10 rounds). Plaintext passwords are never stored or logged.*

---

## 6. Complete API Reference

Base URL: `http://localhost:8000/api`

### 6.1 System & Health
- `GET /api/health` — System status and live PostgreSQL connectivity check.

### 6.2 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new account (`name`, `email`, `password`, `role`).
- `POST /api/auth/login` — Login and obtain JWT token.
- `GET /api/auth/me` — Protected endpoint to retrieve authenticated user profile.

### 6.3 Stations (`/api/stations`)
- `GET /api/stations` — List all stations (Maitri & Bharati).
- `GET /api/stations/:id` — Get station by ID or code (`MAITRI`, `BHARATI`).
- `GET /api/stations/:id/summary` — Station summary with latest telemetry and equipment.
- `POST /api/stations` — Create station (`ADMIN` only).
- `PUT /api/stations/:id` — Update station (`ADMIN` only).
- `DELETE /api/stations/:id` — Delete station (`ADMIN` only).

### 6.4 Weather Telemetry (`/api/weather`)
- `GET /api/weather/:stationId/latest` — Latest temperature, wind, solar radiation, pressure.
- `GET /api/weather/:stationId/history?limit=50&page=1` — Historical paginated observations.
- `GET /api/weather/:stationId/range?start=...&end=...` — Filter by time window.
- `POST /api/weather` — Ingest new weather observation (`ADMIN`, `OPERATOR`).

### 6.5 Energy Load Telemetry (`/api/energy`)
- `GET /api/energy/:stationId/latest` — Latest total load and sub-circuit breakdown (kW).
- `GET /api/energy/:stationId/history?limit=50&page=1` — Historical demand load readings.
- `GET /api/energy/:stationId/range?start=...&end=...` — Time window range.
- `POST /api/energy` — Record new load reading (`ADMIN`, `OPERATOR`).

### 6.6 Renewable Generation (`/api/renewable`)
- `GET /api/renewable/:stationId/latest` — Latest solar and wind power output (kW).
- `GET /api/renewable/:stationId/history` — Historical renewable generation.
- `GET /api/renewable/:stationId/range` — Range query.
- `POST /api/renewable` — Ingest renewable generation reading (`ADMIN`, `OPERATOR`).

### 6.7 Generators (`/api/generators`)
- `GET /api/generators/:stationId` — List all diesel gensets for a station.
- `GET /api/generators/detail/:id` — Single generator details.
- `POST /api/generators` — Add a new generator (`ADMIN`, `OPERATOR`).
- `PUT /api/generators/:id` — Update generator specs (`ADMIN`, `OPERATOR`).
- `PATCH /api/generators/:id/status` — Update operational status (`RUNNING`, `STOPPED`, `MAINTENANCE`, `FAULT`).
- `GET /api/generators/:id/readings` — Reading history.
- `POST /api/generators/:id/readings` — Post power output, fuel consumed, and runtime.

### 6.8 Battery Energy Storage (BESS) (`/api/batteries`)
- `GET /api/batteries/:stationId` — List batteries with current SOC and health.
- `GET /api/batteries/detail/:id` — Single battery unit details.
- `PUT /api/batteries/:id` — Update BESS capacity and SOC limits.
- `GET /api/batteries/:id/readings` — History of charge/discharge cycles.
- `POST /api/batteries/:id/readings` — Post SOC and power flow telemetry.

### 6.9 Critical Life-Support Loads (`/api/critical-loads`)
- `GET /api/critical-loads/:stationId` — List circuits with priority ranking (`CRITICAL`, `IMPORTANT`, `FLEXIBLE`).
- `GET /api/critical-loads/detail/:id` — Single load details.
- `POST /api/critical-loads` — Register circuit.
- `PUT /api/critical-loads/:id` — Update rated power.
- `PATCH /api/critical-loads/:id/status` — Status (`ONLINE`, `SHED`, `STANDBY`).

### 6.10 Operational Alerts (`/api/alerts`)
- `GET /api/alerts/:stationId` — All station alerts.
- `GET /api/alerts/:stationId/active` — Active unresolved alerts.
- `POST /api/alerts` — Create alert event.
- `PATCH /api/alerts/:id/acknowledge` — Mark alert as acknowledged.
- `PATCH /api/alerts/:id/resolve` — Mark alert as resolved.

### 6.11 Consolidated Dashboard (`/api/dashboard`)
- `GET /api/dashboard/:stationId` — High-performance single endpoint providing real-time data for:
  - Station metadata
  - Latest weather
  - Instantaneous demand load
  - Solar & wind renewable generation
  - Battery SOC & flow
  - Generator array outputs
  - Critical load statuses
  - Active alerts
  - Live calculated metrics: `renewablePercentage`, `energyBalance`, `riskAssessment` (`energyStress`, `criticalLoadRisk`).

### 6.12 Analytics for Charts (`/api/analytics`)
- `GET /api/analytics/:stationId/energy?range=7d` — Daily load trends, peak load, critical load share.
- `GET /api/analytics/:stationId/fuel?range=7d` — Daily diesel consumed, estimated fuel savings, baseline comparison.
- `GET /api/analytics/:stationId/renewable?range=7d` — Solar vs. wind breakdown and daily clean energy penetration.
- `GET /api/analytics/:stationId/generator?range=7d` — Genset runtime and generation efficiency.
- `GET /api/analytics/:stationId/battery?range=7d` — Battery SOC range and daily charge/discharge energy.

### 6.13 What-If Scenario Simulation (`/api/simulation`)
- `POST /api/simulation/run` — Run deterministic microgrid simulation scenario.
- `GET /api/simulation/:id` — Retrieve scenario inputs, outputs, and rule-based recommendation.
- `GET /api/simulation/:stationId/history` — List past scenarios.

---

## 7. Next.js Frontend Integration Guide

The companion frontend in `frontend/` (Next.js 14 App Router, TypeScript, Tailwind CSS, Recharts) integrates seamlessly:

1. Configure in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```
2. For authenticated requests, store the JWT returned by `POST /api/auth/login` in `localStorage` or `httpOnly` cookie:
   ```typescript
   const res = await fetch('http://localhost:8000/api/dashboard/maitri', {
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${token}`
     }
   });
   const data = await res.json();
   ```
3. Endpoints accept both station UUIDs or station codes (`maitri`, `bharati`, `MAITRI`, `BHARATI`).
