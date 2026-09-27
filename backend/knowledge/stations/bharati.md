---
documentId: "stations-bharati"
title: "Bharati Station Overview and Microgrid Specifications"
category: "STATIONS"
station: "BHARATI"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "backend/prisma/seed.js"
---

# Bharati Antarctic Research Station

## 1. Geographical and Operational Profile
- **Station Name**: Bharati Station (India's third permanent Antarctic research base, commissioned in 2012)
- **Station Code**: `BHARATI`
- **Location**: Larsemann Hills, East Antarctica
- **Coordinates**: Latitude 69.4072° S, Longitude 76.1872° E
- **Elevation**: 35 meters above sea level
- **Personnel Capacity**: Summer expedition ~45–50 persons; Winter-over team ~20 persons
- **Environment**: Modern coastal promontory with maritime-polar climate, strong katabatic winds, and continuous satellite communication responsibilities.

## 2. Microgrid Hardware Architecture
- **Modern Integrated Energy System**: Built with modern high-efficiency building insulation and centralized combined heat and power (CHP).
- **Baseline Demand**: Base electrical load is approximately 75 kW to 90 kW, with winter heating and air handling peaks up to 120 kW.
- **Critical Load Threshold**: 50 kW guaranteed critical power (oceanographic sensors, satellite downlink, and life support).
- **Renewable Energy Integration**:
  - Solar PV: 60 kW installed DC array with high-efficiency bifacial modules to exploit high snow albedo.
  - Wind Turbines: 75 kW ruggedized polar turbine array with anti-icing leading-edge heating.
- **Energy Storage (BESS)**:
  - Capacity: 400 kWh cold-climate containerized battery bank with active thermal management.
  - SOC Operating Limits: 20% to 90% SOC reserve.
- **Generator Fleet**:
  - Triple modular diesel gensets (3 x 100 kW units) with automated synchronizing switchgear.
  - Heat recovery exchangers capturing generator jacket water and exhaust for station space heating and snow melting.

## 3. Data Status in POLAR-EMS
- **Telemetry Availability**: Station records configured in database; historical continuous dataset is in demonstration/modeled telemetry stage (`MODELED / SCENARIO`).
- **Solar Resource**: Climatological models parameterized for latitude 69.4° S.
