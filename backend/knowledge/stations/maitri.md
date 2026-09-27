---
documentId: "stations-maitri"
title: "Maitri Station Overview and Microgrid Specifications"
category: "STATIONS"
station: "MAITRI"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "backend/prisma/seed.js"
---

# Maitri Antarctic Research Station

## 1. Geographical and Operational Profile
- **Station Name**: Maitri Station (India's second permanent Antarctic research base)
- **Station Code**: `MAITRI`
- **Location**: Schirmacher Oasis, Queen Maud Land, East Antarctica
- **Coordinates**: Latitude 70.7667° S, Longitude 11.7333° E
- **Elevation**: 117 meters above sea level
- **Personnel Capacity**: Summer expedition ~40–65 persons; Winter-over team ~20–25 persons
- **Environment**: Inland ice-free oasis with rocky terrain, subject to extreme katabatic winds and polar night (approx. late May to late July).

## 2. Microgrid Hardware Architecture
- **Baseline Electrical Demand**: Base electrical load is approximately 65 kW, fluctuating diurnally between 45 kW and 85 kW depending on heating, galley, and scientific instruments.
- **Critical Life-Support Baseline**: 42.5 kW guaranteed minimum load that must never be shed under any contingency.
- **Photovoltaic Generation (PV)**:
  - Installed Capacity: 50 kW to 100 kW DC array baseline.
  - Performance Ratio (PR): Configured at 0.80 (accounting for snow accumulation, albedo, wiring, and inverter losses).
- **Wind Generation**:
  - Installed Capacity: 50 kW to 60 kW wind turbine installation.
  - Aerodynamic Specs: Cut-in speed 3.5 m/s, rated speed 12.0 m/s, cut-out storm protection speed 25.0 m/s.
- **Battery Energy Storage System (BESS)**:
  - Capacity: 350 kWh Lithium Iron Phosphate (LiFePO4) or cold-tolerant chemistry.
  - Usable SOC Operating Window: 20% (minimum reserve floor) to 95% (maximum top charge limit).
  - Power Rating: 80 kW maximum charge / 80 kW maximum discharge rate.
- **Diesel Generator Fleet**:
  - Primary Generator (GEN-01): 100 kW rated capacity (minimum output 20 kW).
  - Secondary Generator (GEN-02): 80 kW rated capacity (minimum output 15 kW).
  - Backup Standby Generator (GEN-03): 60 kW standby capacity.
  - Specific Fuel Consumption: Approx. 0.26–0.28 L/kWh diesel at typical operating load factors.

## 3. Telemetry and Historical Data Status
- **2019 AWS Meteorological Dataset**: 8,760 hourly real observations from Maitri Automatic Weather Station (AWS), including ambient temperature, pressure, humidity, wind speed, and wind direction (`REAL / MEASURED`).
- **Solar Climatology**: 1985–2000 IMD global solar radiation climatology baseline (`REAL CLIMATOLOGY`).
- **Modeled 2019 Solar Series**: 8,760 hourly modeled PV outputs using IEC-61724-1 formula (`MODELED / SCENARIO`).
