---
documentId: "system-data-architecture"
title: "POLAR-EMS Data Architecture and Storage Schema"
category: "SYSTEM"
station: "ALL"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "backend/prisma/schema.prisma"
---

# POLAR-EMS Data Architecture

## 1. Storage Infrastructure
The persistent storage layer uses PostgreSQL hosted on Neon with connection pooling via PgBouncer. The system incorporates the `pgvector` extension to facilitate vector similarity retrieval for Retrieval-Augmented Generation (RAG).

## 2. Core Relational Entities
- **stations**: Master metadata for polar research bases (`id`, `name`, `code`, `latitude`, `longitude`, `status`).
- **weather_data**: Historical and real-time environmental observations (`temperature`, `pressure`, `humidity`, `windSpeed`, `windDirection`, `solarRadiation`).
- **energy_loads**: Granular electrical demand breakdowns (`totalLoad`, `heatingLoad`, `waterLoad`, `communicationLoad`, `laboratoryLoad`, `refrigerationLoad`, `flexibleLoad`).
- **renewable_generation**: Measured/live SCADA renewable telemetry (`solarPower`, `windPower`, `totalRenewable`).
- **solar_radiation_climatology**: 1985–2000 IMD/Antarctic expedition hourly global solar irradiance baselines.
- **solar_generation_history**: 8,760 hourly modeled PV time series derived via IEC-61724-1 equations from meteorological timestamps and climatological radiation priors.
- **generators & generator_readings**: Fuel levels, electrical power output, runtime hours, and fuel consumption rates.
- **batteries & battery_readings**: Battery capacity, state of charge (SOC), charge power, and discharge power.
- **critical_loads**: Prioritized life-support circuits with priority tiers (Priority 1 = Life Support/Medical, Priority 2 = Comms/Heating, Priority 3 = Scientific Research).
- **simulations & simulation_results**: Saved what-if scenario runs with stress and critical load risk assessments.
- **rag_knowledge_chunks**: Knowledge document chunks and 768-dimensional vector embeddings for AI assistant retrieval.

## 3. Telemetry Ingestion vs Modeled Time Series
Telemetry data ingested via `/api/ingest` represents discrete real or simulated station snapshots. Modeled historical series (such as `solar_generation_history`) are isolated in dedicated tables to prevent scientific conflation between empirical measurements and modeled estimates.
