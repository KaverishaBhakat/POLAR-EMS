# Maitri PV Electrical-Generation Model Assumptions & Specification

**Target Station**: Maitri Station, Antarctica (70°46′00″S, 11°43′56″E)  
**Pipeline Layer**: Layer 2 — Parameterized PV Electrical Generation  
**Execution Mode**: `SCENARIO`  
**Model Date**: 2026-09-26  

---

## 1. Executive Summary & Scientific Distinction

> [!IMPORTANT]
> **CRITICAL SCIENTIFIC DISTINCTION**:
> This dataset provides **modeled, parameterized PV electrical generation** derived from historical surface radiation observations.
> - The solar resource data is historical measured surface radiation (IMD / NCPOR, 1985–2000).
> - The PV generation values are **simulated engineering estimates** under explicit scenario parameters.
> - These values are **NOT** measured inverter or panel telemetry.
> - The 100 kW PV capacity parameter is a **demonstration scenario baseline** for the OR-Tools optimization engine and must be substituted with verified station installation specifications when available.

---

## 2. Source Data & Conversions

1. **Source Raw Radiation File**: `ml-service/datasets/raw/maitri/radiation/1985-2000/radiation.txt`
2. **Processed Surface Irradiance**: `ml-service/datasets/processed/maitri/solar/maitri_solar_hourly.csv`
3. **Source Physical Unit**: MJ/m² per hourly observation
4. **Irradiance Conversion Formula**:
   Irradiance (W/m²) = (Radiation in MJ/m² * 1,000,000) / 3600 = Radiation (MJ/m²) * 277.7777778

---

## 3. Configured Scenario Assumptions

The scenario parameters are configured in [`ml-service/config/maitri_pv_config.json`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/config/maitri_pv_config.json):

| Parameter | Scenario Baseline | Engineering Rationale |
| :--- | :--- | :--- |
| **PV Nameplate Capacity (P_cap)** | **100 kW** | Standard microgrid scenario sizing for polar base peak dispatch. |
| **Performance Ratio (PR)** | **0.80 (80%)** | Accounts for standard PV losses: inverter efficiency (~96%), cabling (~2%), temperature de-rating, low irradiance response, and standard albedo/soiling. |
| **Availability Factor (AF)** | **1.00 (100%)** | Assumes full operational uptime during clear-sky availability windows. |
| **Standard Test Conditions (STC)** | 1000 W/m² | Standard industry rating reference irradiance at 25°C. |

---

## 4. PV Generation Governing Equation

```text
PV Generation (kW) = P_cap (kW) * (Irradiance (W/m²) / 1000 W/m²) * PR * AF
```

For the default 100 kW scenario (PR = 0.80, AF = 1.00):
```text
PV_kW = 100 * (Irradiance / 1000) * 0.80 = Irradiance * 0.0800
```

*Representative Validation Points*:
- 0 W/m² -> 0.0 kW
- 277.78 W/m² (1 MJ/m²) -> 22.22 kW
- 700.00 W/m² -> 56.00 kW
- 774.44 W/m² (2.788 MJ/m² historical max) -> 61.96 kW

---

## 5. Missing Data Treatment

- **602 missing hourly observations (13.07%)** in the source dataset remain strictly preserved as `NaN` (`null`).
- **No artificial zero-filling or synthetic interpolation** is applied to raw gaps.
- Downstream optimization routines receive explicit missing flags so that renewable forecasting fallbacks or reserve margins can be scheduled intentionally.

---

## 6. December 24-Hour Optimization Scenario

The 24-hour scenario in [`maitri_pv_24h_scenario.csv`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/datasets/processed/maitri/solar/maitri_pv_24h_scenario.csv) captures the climatological diurnal cycle of Austral Summer (December) at Maitri Station:

- **Scenario Month**: December
- **Minimum Modeled PV**: 1.73 kW (Hour 24 / Midnight Sun horizon dip)
- **Maximum Modeled PV**: 54.74 kW (Hour 11 Solar Noon)
- **Mean Hourly PV**: 27.38 kW
- **Estimated Daily Solar Energy**: 657.12 kWh/day

---

## 7. Model Verification Summary

- **Negative Values**: None (0 values < 0.0 kW).
- **Capacity Exceedance**: None (Max observed = 61.96 kW <= 100 kW).
- **Raw File Integrity**: SHA-256 hash verified (100% untouched).
