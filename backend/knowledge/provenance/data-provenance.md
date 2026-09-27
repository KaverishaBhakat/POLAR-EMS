---
documentId: "provenance-data-provenance"
title: "Data Provenance Standards and Scientific Classification"
category: "PROVENANCE"
station: "ALL"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "backend/src/services/solar-generation-history.service.js"
---

# Data Provenance Standards in POLAR-EMS

## 1. Principle of Scientific Integrity
POLAR-EMS enforces strict provenance tagging across all database tables, API responses, and frontend visualizations to guarantee scientific transparency for Antarctic operations and SIH evaluation. Under no circumstances is simulated or modeled data misrepresented as empirical sensor telemetry.

## 2. Standard Provenance Classifications
1. **REAL / MEASURED**:
   - Continuous empirical observations recorded by physical station sensors and SCADA telemetry.
   - Example: Maitri 2019 AWS weather data (`weather_data` table, 8,760 hourly records from IMD/NCPOR archives).
2. **REAL CLIMATOLOGY**:
   - Long-term monthly-hourly averaged historical observations from physical stations.
   - Example: 1985–2000 IMD global solar radiation climatology table (`solar_radiation_climatology`).
3. **MODELED / SCENARIO**:
   - Mathematically generated or simulated time-series based on deterministic physics, IEC formulas, or OR-Tools optimization.
   - Example: `solar_generation_history` (8,760 hourly PV generation records modeled from climatological radiation priors and 50 kW PV capacity), resilience simulation outputs, and 24-hour dispatch schedules.
4. **ENGINEERING ASSUMPTION**:
   - Hardware ratings, thermal loss coefficients, fuel consumption slopes, and operational constraints calibrated from polar engineering literature.
   - Example: 350 kWh BESS capacity, 42.5 kW critical life-support baseline, 1.8 kW/°C sub-zero heating factor.
5. **UNAVAILABLE**:
   - Periods or parameters where sensor data is missing or physical conditions prevent observation.
   - Example: Solar radiation during June polar night where sun is obscured below the horizon.

## 3. Provenance Preservation in RAG
When retrieving knowledge documents, the RAG subsystem preserves the original document's provenance label. A `MODELED / SCENARIO` document never becomes `REAL / MEASURED` simply because it was indexed or retrieved.
