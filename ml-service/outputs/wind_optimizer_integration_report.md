# Maitri Wind Model & Optimizer Integration Report

## 1. Executive Summary

This report documents the integration of the **Maitri 2019 Wind-Derived Electrical Generation Model** into the **POLAR-EMS OR-Tools 24-Hour Microgrid Optimizer** (`dispatcher.py`), replacing the previous unconstrained sinusoidal synthetic wind profile with real-data-derived generation.

---

## 2. Scientific & Data Provenance Structure

| Layer | Component | Description & Source | Classification |
| :--- | :--- | :--- | :--- |
| **REAL** | `wind_speed_ms` | 2019 surface weather observations from the India Meteorological Department (IMD) Automatic Weather Station (AWS) at Maitri Station, Antarctica ($70^\circ 45' 57''\text{ S}, 11^\circ 44' 09''\text{ E}$). | `REAL_MEASURED_DATA` |
| **MODELED** | `modeled_wind_power_kw` | Calculated hourly electrical power output via the aerodynamic piecewise power curve formula. | `MODELED_DATA` |
| **SCENARIO** | Turbine Parameters | Nameplate capacity: $50.0\text{ kW}$<br>Cut-in speed: $3.5\text{ m/s}$<br>Rated speed: $12.0\text{ m/s}$<br>Cut-out speed: $25.0\text{ m/s}$<br>Availability factor: $0.90$ ($90\%$). | `SCENARIO_ASSUMPTIONS` |
| **OPTIMIZATION** | Mixed-Integer Linear Program (MILP) | Google OR-Tools (SCIP) 24-hour lookahead unit commitment and economic dispatch solving generator dispatch, BESS dynamics, critical-load protection, and renewable utilization. | `OPTIMIZATION_DISPATCH` |

> [!IMPORTANT]
> **Data Authenticity Notice**:
> - The wind speed values are authentic meteorological records from Maitri Station for 2019.
> - The electrical power output is **modeled** based on engineering scenario assumptions. It is **not** measured station telemetry, and no claim is made that Maitri Station currently operates a 50 kW turbine.

---

## 3. Piecewise Wind Aerodynamic Model

The hourly power conversion from wind speed $v$ (m/s) to electrical power $P$ (kW) is governed by:

$$P_{\text{raw}}(v) = \begin{cases} 
0 & v < 3.5\text{ m/s} \quad (\text{Below Cut-in}) \\
50.0 \times \left(\frac{v - 3.5}{12.0 - 3.5}\right)^3 & 3.5\text{ m/s} \le v < 12.0\text{ m/s} \quad (\text{Partial Load Ramp}) \\
50.0 & 12.0\text{ m/s} \le v < 25.0\text{ m/s} \quad (\text{Rated Output Plateau}) \\
0 & v \ge 25.0\text{ m/s} \quad (\text{Storm Cut-out Shut-down})
\end{cases}$$

$$P_{\text{modeled}} = P_{\text{raw}}(v) \times 0.90\text{ (Availability Factor)}$$

---

## 4. Scenario Comparison: Synthetic vs. Real-Derived Maitri Wind

Comparison over the standard 24-hour December 1 lookahead horizon ($H=24$ hours):

| Metric | OLD Synthetic Wind Scenario | NEW Real-Derived Maitri Wind Scenario | Delta / Impact |
| :--- | :--- | :--- | :--- |
| **Wind Data Source** | Sinusoidal heuristic | Maitri AWS Dec 1, 2019 (Hourly) | Real meteorological physics |
| **Total Wind Available** | $625.48\text{ kWh}$ | **$159.58\text{ kWh}$** | $-465.90\text{ kWh}$ ($-74.5\%$) |
| **Average Wind Power** | $26.06\text{ kW}$ | **$6.65\text{ kW}$** | $-19.41\text{ kW}$ |
| **Max Wind Power** | $39.54\text{ kW}$ | **$26.69\text{ kW}$** | $-12.85\text{ kW}$ |
| **Total PV Available** | $403.46\text{ kWh}$ | **$403.46\text{ kWh}$** | $0.0\text{ kWh}$ (Identical solar profile) |
| **Total Renewable Generation** | $1,028.94\text{ kWh}$ | **$563.04\text{ kWh}$** | $-465.90\text{ kWh}$ |
| **Optimized Fuel Consumption** | $45.3\text{ L}$ | **$173.5\text{ L}$** | $+128.2\text{ L}$ (Realistic diesel dispatch) |
| **Generator Committed Runtime**| $2\text{ hours}$ | **$7\text{ hours}$** | $+5\text{ hours}$ (Covers nocturnal calm) |
| **Total Generator Energy** | $166.5\text{ kWh}$ | **$647.7\text{ kWh}$** | $+481.2\text{ kWh}$ |
| **Total Battery Charge** | $120.9\text{ kWh}$ | **$277.2\text{ kWh}$** | $+156.3\text{ kWh}$ |
| **Total Battery Discharge** | $292.0\text{ kWh}$ | **$433.1\text{ kWh}$** | $+141.1\text{ kWh}$ (High BESS cycling) |
| **PV Utilization Rate** | $100.0\%$ | **$100.0\%$** | $0.0\%$ curtailment |
| **Renewable Utilization Rate** | $100.0\%$ | **$100.0\%$** | $0.0\%$ curtailment |
| **Critical Load Shed** | $0.0\text{ kWh}$ ($100\%$ served) | **$0.0\text{ kWh}$ ($100\%$ served)** | **Zero shedding guaranteed** |
| **Objective Value** | $45.71$ | **$174.17$** | Exact MILP minimum cost |

---

## 5. Microgrid Behavior Analysis

1. **Morning Katabatic Wind (00:00–06:00)**:
   - Wind speeds: $8.90 - 10.64\text{ m/s}$, producing $11.55 - 26.69\text{ kW}$.
   - Coupled with stored BESS energy, generators remain offline during the early morning.
2. **Midday Solar Co-Generation (07:00–17:00)**:
   - Wind speeds moderate to $6.23 - 7.60\text{ m/s}$ ($1.49 - 5.04\text{ kW}$).
   - 100 kW PV generation ramps to peak ($39.6\text{ kW}$ at solar noon), directly supplying station daytime demand and charging BESS up to $95\%$ SOC.
3. **Nocturnal Calm & Genset Commitment (18:00–23:00)**:
   - Real wind speeds drop below the $3.5\text{ m/s}$ cut-in velocity ($2.43 - 3.38\text{ m/s}$), causing wind output to drop to **$0.0\text{ kW}$**.
   - Primary Genset (GEN-01) is automatically committed from 18:00–23:00 at $65.8 - 93.3\text{ kW}$ to fulfill station evening galley/lab demand and maintain battery state-of-charge above the $20\%$ minimum reserve limit.
   - Non-sheddable critical load ($42.5\text{ kW}$) experiences **$0.0\text{ kWh}$ shedding ($100.0\%$ reliability)**.

---

## 6. Verification & Test Suite Summary

All tests in both the wind modeling suite and the full optimization suite pass without error:

- `test_wind_model.py`: **14 / 14 Passed** (Power curve thresholds, cut-in, rated, cut-out, availability factor, dataset continuity).
- `test_optimization.py`: **14 / 14 Passed** (Power balance, PV constraints, battery bounds, generator commitment, critical-load protection, wind vector mapping, determinism).
- Total tests passed: **28 / 28**.
