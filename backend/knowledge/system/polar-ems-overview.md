---
documentId: "system-polar-ems-overview"
title: "POLAR-EMS System Overview and Objectives"
category: "SYSTEM"
station: "ALL"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "backend/README.md"
---

# POLAR-EMS System Overview

## 1. Executive Summary
POLAR-EMS is an AI-driven, high-reliability microgrid Energy Management System designed specifically for Indian Antarctic research stations (Maitri and Bharati). The system orchestrates renewable energy generation (solar photovoltaic and wind turbines), battery energy storage systems (BESS), and multi-unit diesel gensets under extreme sub-zero conditions (-50°C to +10°C).

## 2. Core Operational Goals
1. **Critical Life-Support Preservation**: Guarantee 100% continuous power reliability to life-support systems, environmental heating, satellite communication, and medical facilities.
2. **Fuel Consumption Minimization**: Reduce diesel fuel burn by 15% to 25% through optimal renewable penetration and intelligent battery storage dispatch.
3. **Equipment Lifetime Extension**: Avoid short-cycling diesel generators, prevent thermal shock in sub-zero start-ups, and operate batteries within safe degradation envelopes.
4. **Resilience under Extreme Weather**: Provide automated contingency handling during polar nights, katabatic blizzards, generator trips, and renewable forecast errors.

## 3. High-Level Architecture
POLAR-EMS consists of three core tiers:
- **Core Node.js/Express Backend**: Telemetry ingestion, REST API endpoints, time-series data storage in PostgreSQL (Neon), and authentication.
- **Python ML/Optimization Microservice (Port 8001)**: 24-hour ahead ambient weather forecasting (HistGradientBoostingRegressor), 24-hour MILP economic dispatch (Google OR-Tools), and what-if resilience simulation engine.
- **Next.js Real-Time Frontend (Port 3000)**: SCADA-grade visualization dashboard, renewable penetration meters, resilience simulation workbench, and historical data provenance viewers.

## 4. Operational Classification and Provenance
POLAR-EMS maintains strict separation between:
- **REAL / MEASURED**: Live SCADA telemetry and calibrated historical weather station records.
- **REAL CLIMATOLOGY**: Long-term monthly-hourly meteorological radiation archives (1985–2000).
- **MODELED / SCENARIO**: Deterministic physics-based energy simulations, IEC-61724-1 PV modeling, and OR-Tools optimization schedules.
- **ENGINEERING ASSUMPTION**: Baseline hardware capacities, fuel curve slopes, and thermal loss coefficients configured for polar stations.
