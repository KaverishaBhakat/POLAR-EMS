---
documentId: "renewable-solar-model"
title: "Solar Photovoltaic Modeling and IEC-61724-1 Yield Calculations"
category: "RENEWABLE"
station: "MAITRI"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "MODELED / SCENARIO"
version: "1.0"
source: "backend/src/services/pv-generation.service.js"
---

# Solar Photovoltaic Modeling in POLAR-EMS

## 1. Physical Principle & Yield Equation
POLAR-EMS computes photovoltaic power generation estimates using the international standard IEC/WMO photovoltaic yield formula (IEC 61724-1):

$$P_{\text{PV}}(t) = \frac{G(t) \times P_{\text{DC,rated}} \times \text{PR}}{G_{\text{STC}}}$$

Where:
- $G(t)$: Global horizontal or plane-of-array solar irradiance in $\text{W/m}^2$.
- $P_{\text{DC,rated}}$: Installed DC photovoltaic array capacity in $\text{kW}$ (default: $50.0\text{ kW}$ for historical dataset, configurable up to $100.0\text{ kW}$).
- $\text{PR}$: System Performance Ratio (default: $0.80$, representing combined inverter efficiency, thermal derating, cable loss, and Antarctic snow/albedo factors).
- $G_{\text{STC}}$: Standard Test Condition reference irradiance ($1000\text{ W/m}^2$).

## 2. Polar Radiation Dynamics
- **Summer Midnight Sun (November to January)**: 24-hour continuous solar insolation with peak midday irradiance reaching $750 - 850\text{ W/m}^2$. High albedo from surrounding ice sheets increases bifacial panel yield.
- **Equinox Transitions (March, September)**: Rapid reduction in daily sunshine hours.
- **Winter Polar Night (Late May to Late July)**: Solar elevation angle remains below the horizon ($G(t) = 0.0\text{ W/m}^2$). Solar generation is $0.0\text{ kW}$ for all 24 hours.

## 3. Data Provenance and Separation
- **Historical Solar Generation Table (`solar_generation_history`)**: Contains 8,760 hourly modeled records for the full calendar year 2019 at Maitri Station.
- **Classification**: Tagged strictly as `CLIMATOLOGICAL_ESTIMATE` / `MODELED / SCENARIO`.
- **Live Telemetry Table (`renewable_generation`)**: Reserved solely for empirical, real-time SCADA telemetry measurements (`REAL / MEASURED`).
- **Solar Resource Climatology (`solar_radiation_climatology`)**: 1985–2000 IMD/Antarctic expedition solar archives (`REAL CLIMATOLOGY`).
