# POLAR-EMS — Severe Blizzard Resilience Scenario Simulation Report

## Executive Summary
This report documents the design, mathematical formulation, data provenance, and optimization simulation results for the **Severe Blizzard (`severe-blizzard`)** resilience scenario in POLAR-EMS (Phase 5: Simulation & Resilience).

The scenario models a severe Antarctic polar storm contingency characterized by a **compound meteorological and operational stress event** over a 24-hour horizon:
1. **Solar PV Availability Drop (-70%)**: Cloud cover and heavy snowfall reduce available solar PV generation by 70% ($0.30 \times \text{baseline}$ retained).
2. **Electrical Demand Surge (+20%)**: Severe freezing conditions and blizzard shelter requirements drive a 20% increase in station electrical demand ($1.20 \times \text{baseline}$) for environmental life support and thermal heating.
3. **Elevated Wind Speeds (+25%)**: Storm winds increase hourly wind speeds by 25% ($1.25 \times \text{baseline}$ m/s), which are evaluated directly through the station's existing piecewise aerodynamic wind turbine power curve.

The OR-Tools 24-hour Mixed-Integer Linear Programming (MILP) dispatcher was executed on the modified inputs to assess station energy resilience, critical life-support protection (42.5 kW non-sheddable floor), battery energy storage system (BESS) buffering, and diesel generator dispatch.

---

## 1. Scenario Definition & Parameters

```text
scenario_id: severe-blizzard
scenario_type: SEVERE_BLIZZARD
scenario_name: Severe Blizzard
category: RESILIENCE
provenance: SCENARIO
is_active: true
is_demonstration_scenario: true
```

### Scenario Description
> A modeled polar-weather contingency combining reduced solar availability, increased station electrical demand, and elevated wind conditions over the 24-hour horizon.

### Explicit Scenario Assumptions
* **Solar PV**: $PV_{\text{scenario}}(t) = PV_{\text{baseline}}(t) \times 0.30$ for all $t \in [0, 23]$.
* **Station Demand**: $Demand_{\text{scenario}}(t) = Demand_{\text{baseline}}(t) \times 1.20$ for all $t \in [0, 23]$.
* **Wind Velocity**: $v_{\text{scenario}}(t) = v_{\text{baseline}}(t) \times 1.25$ for all $t \in [0, 23]$.
* **Wind Power Conversion**: $P_{\text{wind, scenario}}(t) = f_{\text{turbine}}(v_{\text{scenario}}(t))$, strictly respecting cut-in ($3.5\text{ m/s}$), rated plateau ($12.0\text{ m/s}$), and storm cut-out ($25.0\text{ m/s}$).
* **Battery Configuration**: Baseline initial SOC ($75.0\% = 262.5\text{ kWh}$), capacity ($350\text{ kWh}$), charge/discharge rate limits ($80\text{ kW}$), efficiency ($92\%$), and physical operational limits ($[20\%, 95\%]$) are strictly preserved.
* **Generator Fleet**: Both primary generator GEN-01 ($100\text{ kW}$) and secondary generator GEN-02 ($80\text{ kW}$) remain available with standard fuel curves.
* **Critical Load Floor**: $42.5\text{ kW}$ life-support floor strictly enforced; shedding penalty $\mu = 10,000$.

*Disclaimer: This is a scenario assumption for resilience testing. It is NOT a claim that a particular blizzard occurred at Maitri during the modeled period.*

---

## 2. Scientific & Engineering Data Provenance

| Component | Value / Equation | Classification | Provenance Source & Rationale |
| :--- | :--- | :--- | :--- |
| **Baseline Wind Speed** | Observed Maitri 2019 Dec 1 ($6.91\text{ m/s}$ mean) | `REAL_MEASURED_DATA` | IMD Maitri Station 2019 AWS meteorological observation dataset. |
| **Blizzard Wind Speed** | $v_{\text{scenario}} = v_{\text{baseline}} \times 1.25$ | `SCENARIO_ASSUMPTION` | Modeled 25% velocity increase representing elevated blizzard winds. |
| **Turbine Power Curve** | Piecewise cubic curve ($50\text{ kW}$ nameplate) | `ENGINEERING_ASSUMPTION` | Standard cold-climate aerodynamic power model with cut-in $3.5\text{ m/s}$, rated $12.0\text{ m/s}$, cut-out $25.0\text{ m/s}$, avail $0.90$. |
| **Baseline Solar PV** | Dec 1 historical climatology ($657.11\text{ kWh}$) | `MODELED_DATA` | 1985–2000 IMD Maitri global horizontal irradiance parameterized to $100\text{ kW}$ PV array ($PR=0.80$). |
| **Blizzard Solar PV** | $PV_{\text{scenario}} = PV_{\text{baseline}} \times 0.30$ ($197.13\text{ kWh}$) | `SCENARIO_ASSUMPTION` | Modeled 70% optical attenuation due to heavy storm cloud cover and active snowfall. |
| **Baseline Station Demand**| Deterministic diurnal load ($1620.2\text{ kWh}$) | `ENGINEERING_ASSUMPTION` | $65\text{ kW}$ base with morning/evening shifts ($55.2\text{--}83.6\text{ kW}$). |
| **Blizzard Station Demand**| $Demand_{\text{scenario}} = Demand_{\text{baseline}} \times 1.20$ ($1944.1\text{ kWh}$) | `SCENARIO_ASSUMPTION` | 20% load surge representing emergency thermal heating and auxiliary life support during extreme polar cold. |
| **Critical Load Floor** | $42.5\text{ kW}$ constant ($1020.0\text{ kWh}$) | `ENGINEERING_ASSUMPTION` | Non-sheddable station life-support, communications, and medical load. |
| **Dispatch Output** | 24-hour generator commitment & battery flows | `OPTIMIZATION_OUTPUT` | Google OR-Tools CBC/SCIP Mixed-Integer Linear Programming solver. |

---

## 3. Wind Model Aerodynamic Behavior & Cut-Out Verification

### Turbine Power Curve Formulation
The piecewise aerodynamic wind turbine power model evaluates wind speeds as follows:
$$
P(v) = \begin{cases}
0.0 & v < v_{\text{cut-in}} \quad (3.5\text{ m/s}) \\
P_{\text{cap}} \left( \frac{v - v_{\text{cut-in}}}{v_{\text{rated}} - v_{\text{cut-in}}} \right)^3 \times \eta_{\text{avail}} & v_{\text{cut-in}} \le v < v_{\text{rated}} \quad (3.5 \le v < 12.0\text{ m/s}) \\
P_{\text{cap}} \times \eta_{\text{avail}} = 45.0\text{ kW} & v_{\text{rated}} \le v < v_{\text{cut-out}} \quad (12.0 \le v < 25.0\text{ m/s}) \\
0.0 & v \ge v_{\text{cut-out}} \quad (\ge 25.0\text{ m/s, Storm Cut-Out})
\end{cases}
$$

### Weather Metrics Comparison

| Metric | Baseline (Dec 1, 2019) | Severe Blizzard Scenario | Delta | Status / Effect |
| :--- | :--- | :--- | :--- | :--- |
| **Mean Wind Speed** | $6.90\text{ m/s}$ | $8.63\text{ m/s}$ | $+1.73\text{ m/s}$ ($+25.1\%$) | Elevated velocity across all 24 hours |
| **Max Wind Speed** | $10.64\text{ m/s}$ | $13.30\text{ m/s}$ | $+2.66\text{ m/s}$ ($+25.0\%$) | Enters rated plateau ($12.0\text{--}25.0\text{ m/s}$) at peak hours |
| **Min Wind Speed** | $2.43\text{ m/s}$ | $3.03\text{ m/s}$ | $+0.60\text{ m/s}$ | Remains below cut-in for fewer hours |
| **Hours Above Cut-Out ($\ge 25\text{ m/s}$)** | $0\text{ hrs}$ | $0\text{ hrs}$ | $0\text{ hrs}$ | Max storm speed $13.30\text{ m/s} < 25.0\text{ m/s}$ |
| **Hours Below Cut-In ($< 3.5\text{ m/s}$)** | $4\text{ hrs}$ | $3\text{ hrs}$ | $-1\text{ hr}$ | Hours 20, 21, 22 below cut-in; Hour 23 ($4.23\text{ m/s}$) begins ramp |
| **Hours at Rated Power ($45.0\text{ kW}$)** | $0\text{ hrs}$ | $3\text{ hrs}$ | $+3\text{ hrs}$ | Hours 0 ($13.30\text{ m/s}$), 1 ($12.83\text{ m/s}$), 5 ($12.63\text{ m/s}$) |
| **Total Wind Generation** | $159.58\text{ kWh}$ | $403.55\text{ kWh}$ | $+243.97\text{ kWh}$ ($+152.9\%$) | Significant renewable generation surge |

### Storm Cut-Out Protection Verification
A dedicated unit test verified that when baseline wind speed is near the boundary ($21.0\text{ m/s} < 25.0\text{ m/s}$, delivering $45.0\text{ kW}$ rated power), elevating it by $+25\%$ produces $26.25\text{ m/s} \ge 25.0\text{ m/s}$, triggering the emergency high-wind cut-out ($0.0\text{ kW}$, `STORM_CUT_OUT`), ensuring physical realism and safety modeling.

---

## 4. 24-Hour Input Transformations

| Hour | Baseline Demand (kW) | Blizzard Demand (kW) | Baseline PV (kW) | Blizzard PV (kW) | Baseline Wind Spd (m/s) | Blizzard Wind Spd (m/s) | Baseline Wind Power (kW) | Blizzard Wind Power (kW) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 00:00 | 55.2 | 66.2 | 0.00 | 0.00 | 10.64 | 13.30 | 25.46 | 45.00 |
| 01:00 | 56.7 | 68.0 | 0.00 | 0.00 | 10.26 | 12.83 | 21.65 | 45.00 |
| 02:00 | 57.7 | 69.2 | 0.00 | 0.00 | 8.90 | 11.13 | 11.45 | 30.06 |
| 03:00 | 58.2 | 69.8 | 0.00 | 0.00 | 9.13 | 11.41 | 12.89 | 33.37 |
| 04:00 | 57.9 | 69.5 | 3.33 | 1.00 | 9.44 | 11.80 | 15.24 | 38.38 |
| 05:00 | 57.0 | 68.4 | 10.15 | 3.05 | 10.11 | 12.63 | 20.37 | 45.00 |
| 06:00 | 75.3 | 90.4 | 20.35 | 6.11 | 9.27 | 11.59 | 13.97 | 35.69 |
| 07:00 | 76.5 | 91.8 | 33.47 | 10.04 | 7.60 | 9.50 | 5.09 | 15.75 |
| 08:00 | 77.0 | 92.4 | 48.60 | 14.58 | 7.15 | 8.94 | 3.59 | 11.75 |
| 09:00 | 76.2 | 91.4 | 64.44 | 19.33 | 7.07 | 8.83 | 3.35 | 11.09 |
| 10:00 | 63.8 | 76.6 | 79.43 | 23.83 | 7.27 | 9.09 | 4.01 | 12.91 |
| 11:00 | 62.0 | 74.4 | 88.35 | 26.51 | 7.50 | 9.38 | 4.74 | 14.88 |
| 12:00 | 61.4 | 73.7 | 90.96 | 27.29 | 7.17 | 8.97 | 3.67 | 11.96 |
| 13:00 | 62.3 | 74.8 | 86.81 | 26.04 | 6.33 | 7.92 | 1.63 | 6.42 |
| 14:00 | 64.7 | 77.6 | 76.54 | 22.96 | 6.44 | 8.05 | 1.83 | 7.03 |
| 15:00 | 68.2 | 81.8 | 61.26 | 18.38 | 6.23 | 7.79 | 1.48 | 5.86 |
| 16:00 | 67.4 | 80.9 | 43.19 | 12.96 | 6.94 | 8.68 | 2.97 | 10.15 |
| 17:00 | 80.5 | 96.6 | 25.13 | 7.54 | 6.54 | 8.17 | 2.01 | 7.67 |
| 18:00 | 83.6 | 100.3 | 10.92 | 3.28 | 5.59 | 6.99 | 0.81 | 3.29 |
| 19:00 | 83.1 | 99.7 | 3.68 | 1.10 | 4.76 | 5.95 | 0.20 | 1.25 |
| 20:00 | 80.2 | 96.2 | 0.00 | 0.00 | 3.01 | 3.76 | 0.00 | 0.01 |
| 21:00 | 75.3 | 90.4 | 0.00 | 0.00 | 2.56 | 3.20 | 0.00 | 0.00 |
| 22:00 | 58.7 | 70.4 | 0.00 | 0.00 | 2.43 | 3.03 | 0.00 | 0.00 |
| 23:00 | 59.9 | 71.9 | 0.00 | 0.00 | 3.38 | 4.23 | 0.00 | 0.18 |
| **Total** | **1620.2** | **1944.1** | **657.11** | **197.13** | **6.90** | **8.63** | **159.58** | **403.55** |

---

## 5. Baseline vs. Severe Blizzard Optimization Results

| Key Metric | Baseline Dispatch | Severe Blizzard Scenario | Absolute Delta | Percent Delta |
| :--- | :--- | :--- | :--- | :--- |
| **Total Demand (kWh)** | $1620.20$ | $1944.10$ | $+323.90$ | $+20.0\%$ |
| **Solar PV Available (kWh)** | $657.11$ | $197.13$ | $-459.98$ | $-70.0\%$ |
| **Wind Available (kWh)** | $159.58$ | $403.55$ | $+243.97$ | $+152.9\%$ |
| **Total Renewable Available (kWh)** | $816.69$ | $600.68$ | $-216.01$ | $-26.5\%$ |
| **Renewable Energy Used (kWh)** | $816.69$ | $600.68$ | $-216.01$ | $-26.5\%$ |
| **Renewable Utilization Rate (%)** | $100.0\%$ | $100.0\%$ | $0.0\%$ | $0.0\%$ |
| **Primary Generator G1 Output (kWh)** | $647.70$ | $1193.30$ | $+545.60$ | $+84.2\%$ |
| **Secondary Generator G2 Output (kWh)**| $0.00$ | $0.00$ | $0.00$ | $0.0\%$ |
| **Total Generator Energy (kWh)** | $647.70$ | $1193.30$ | $+545.60$ | $+84.2\%$ |
| **Generator Runtime (Hours)** | $7\text{ hrs}$ | $12\text{ hrs}$ | $+5\text{ hrs}$ | $+71.4\%$ |
| **Estimated Diesel Fuel (Liters)** | $173.50\text{ L}$ | $316.50\text{ L}$ | $+143.00\text{ L}$ | $+82.4\%$ |
| **Battery Energy Charged (kWh)** | $277.20$ | $336.20$ | $+59.00$ | $+21.3\%$ |
| **Battery Energy Discharged (kWh)** | $433.10$ | $486.30$ | $+53.20$ | $+12.3\%$ |
| **Minimum Battery SOC (%)** | $20.0\%$ | $20.0\%$ | $0.0\%$ | $0.0\%$ |
| **Maximum Battery SOC (%)** | $82.7\%$ | $88.5\%$ | $+5.8\%$ | $+7.0\%$ |
| **Critical Load Shedding (kWh)** | $0.00$ | $0.00$ | $0.00$ | $0.0\%$ |
| **Critical Load Reliability (%)** | $100.0\%$ | $100.0\%$ | $0.0\%$ | $0.0\%$ |
| **MILP Objective Value ($)** | $339.69$ | $612.30$ | $+272.61$ | $+80.3\%$ |
| **Resilience Status** | **PROTECTED** | **PROTECTED** | — | — |

---

## 6. Operational & Physical Interpretation
1. **Renewable Interaction Dynamics**:
   - The Severe Blizzard scenario presents a complex compound stress event. While solar availability drops severely by $459.98\text{ kWh}$ ($-70\%$), storm winds elevate wind turbine generation by $+243.97\text{ kWh}$ ($+152.9\%$).
   - This aerodynamic boost significantly mitigates the net renewable deficit, reducing the total renewable drop from $-70\%$ to $-26.5\%$ ($600.68\text{ kWh}$ total available).
2. **Thermal Generator Fleet Dispatch**:
   - Station electrical load increases by $+323.90\text{ kWh}$ ($+20\%$) to $1944.10\text{ kWh}$.
   - The MILP optimizer responds rationally by increasing primary generator (GEN-01, $100\text{ kW}$) runtime from $7$ to $12$ hours, delivering $1193.3\text{ kWh}$ ($+84.2\%$) of electrical energy and consuming $316.5\text{ L}$ of fuel ($+143.0\text{ L}$).
   - Secondary generator GEN-02 was not required, demonstrating adequate spinning reserve within GEN-01 and the BESS buffer.
3. **BESS Buffering & Critical Load Protection**:
   - The battery charges with $336.2\text{ kWh}$ (cycling during daytime PV and early morning storm wind peaks) and discharges $486.3\text{ kWh}$ to support night-time and evening peak loads.
   - The critical life-support floor ($42.5\text{ kW}$) was $100.0\%$ protected with strictly $0.00\text{ kWh}$ shed across all 24 hours.

---

## 7. Limitations & Engineering Caveats
1. **Synthetic Attenuation Multipliers**:
   The $70\%$ solar attenuation and $20\%$ demand increase are engineered scenario assumptions chosen to test microgrid stress thresholds. They do not represent empirical sensor readings during a recorded 2019 blizzard.
2. **Linear Wind Speed Scaling vs Gust Dynamics**:
   Applying a constant $+25\%$ multiplier to hourly mean wind speeds provides a physically tractable macro-scale wind profile but does not model high-frequency gusting or turbulence intensity.
3. **Uncoupled Thermal Dynamics**:
   The demand increase is modeled purely as an electrical load increase. In an actual Antarctic station, combined heat and power (CHP) jacket-water thermal recovery from diesel generators would provide supplementary space heating.

---

## 8. Automated Verification & Test Results

```text
Total Test Suite: 61 tests
Passed: 61
Failed: 0
Duration: ~180s
Status: ALL TESTS PASSING
```

The 7 dedicated Severe Blizzard unit and integration tests successfully verified:
* Correct registry metadata, category, and provenance tags.
* Exact mathematical transformations for solar ($0.30\times$), demand ($1.20\times$), and wind speed ($1.25\times$).
* Wind power curve evaluation respecting cut-in ($3.5\text{ m/s}$), rated plateau ($12.0\text{ m/s}$), and high-wind storm cut-out ($25.0\text{ m/s}$).
* Complete preservation of BESS parameters and generator availability.
* Standardized resilience metrics calculation, transparent status determination (`PROTECTED`), and mathematical baseline comparison.
* Complete deterministic repeatability across duplicate simulation executions.
* Full compatibility of FastAPI endpoints (`/simulation/scenarios`, `/simulation/run/MAITRI/severe-blizzard`).
