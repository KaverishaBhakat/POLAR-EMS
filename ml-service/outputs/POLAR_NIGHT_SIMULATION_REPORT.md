# POLAR-EMS Phase 5: Polar Night Simulation & Resilience Report

**Document**: `POLAR_NIGHT_SIMULATION_REPORT.md`  
**Scope**: Implementation of the extensible Simulation & Resilience framework and evaluation of the **Polar Night** what-if contingency scenario.  
**System Tested**: POLAR-EMS FastAPI ML/Simulation Service & Google OR-Tools MILP Optimizer.

---

## 1. Executive Summary & What Was Implemented

In Phase 5, an extensible **Simulation & Resilience Framework** was architected around the core POLAR-EMS mixed-integer linear programming (MILP) optimization engine. The framework allows defining, registering, and executing what-if stress tests against Antarctic research station microgrids without modifying optimizer constraints or underlying historical datasets.

The first stress scenario, **Polar Night (`polar-night`)**, has been implemented, validated, and exposed via FastAPI. Under the modeled Polar Night conditions (24 hours of 0.0 kW solar generation), the Maitri microgrid maintains **100.0% critical-load reliability (0.0 kWh shedding)** by expanding primary diesel generator commitment from 7 hours to 14 hours and increasing daily fuel consumption from 173.5 L to 350.3 L (+101.9%).

---

## 2. Files Changed & Created

| File | Type | Purpose |
| :--- | :--- | :--- |
| [`ml-service/app/simulation/scenarios.py`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/app/simulation/scenarios.py) | **Created** | Master scenario registry, metadata models, and scenario definitions. |
| [`ml-service/app/simulation/runner.py`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/app/simulation/runner.py) | **Created** | Simulation execution engine: baseline generation, scenario input mutation, MILP execution, resilience metrics calculation, and comparative delta accounting. |
| [`ml-service/app/simulation/__init__.py`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/app/simulation/__init__.py) | **Created** | Simulation package exports. |
| [`ml-service/app/api/simulation_routes.py`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/app/api/simulation_routes.py) | **Created** | FastAPI endpoints (`GET /simulation/scenarios`, `GET /simulation/run/{station_id}/{scenario_id}`). |
| [`ml-service/app/main.py`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/app/main.py) | **Modified** | Mounted `simulation_router` while strictly preserving `/optimization/dispatch/{station_id}`. |
| [`ml-service/tests/test_simulation.py`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/tests/test_simulation.py) | **Created** | 8 unit and integration tests for scenario transformations, metrics, API routes, and determinism. |

---

## 3. Polar Night Scenario Definition & Formulation

- **Concept**: Evaluates station electrical survivability during the deep polar night when solar irradiance is zero continuously.
- **Physical Input Transformations**:
  - $\text{PV Generation Vector} = [0.0, 0.0, \dots, 0.0]\text{ kW}$ for all 24 lookahead hours ($h \in [0, 23]$).
  - $\text{Wind Generation Vector} = \text{Maitri 2019 Dec 1 real-derived hourly wind profile}$ (identical to baseline).
  - $\text{Station Electrical Demand} = \text{Deterministic 65 kW diurnal profile}$ (identical to baseline).
  - $\text{Battery Energy Storage} = \text{Initial SOC 75.0\%, } [20\%, 95\%]\text{ operating band, } 80\text{ kW max power}$.
  - $\text{Generator Fleet} = \text{GEN-01 (100 kW) and GEN-02 (80 kW) fully available}$.
  - $\text{Critical Life-Support Floor} = 42.5\text{ kW non-sheddable load constraint enforced}$.

---

## 4. Scientific & Data Provenance Structure

| Component | Baseline Source | Polar Night Modification | Provenance Classification |
| :--- | :--- | :--- | :--- |
| **Solar Resource** | Historical IMD radiation ($657.1\text{ kWh}$ / day) | Forced to **$0.0\text{ kW}$** for all 24 hours | `SCENARIO` (What-If Mutation) |
| **Wind Resource** | Maitri 2019 AWS wind speed $\rightarrow$ 50 kW turbine model ($159.58\text{ kWh}$) | **Unchanged** (Maitri 2019 observations) | `MODELED_DATA` (from Real Wind) |
| **Electrical Demand** | Deterministic diurnal load model ($1,620.20\text{ kWh}$) | **Unchanged** ($55.2\text{–}83.6\text{ kW}$) | `SCENARIO_ASSUMPTION` |
| **Critical Load** | $42.5\text{ kW}$ non-sheddable base | **Unchanged** ($42.5\text{ kW}$) | `DOCUMENTED_MAITRI_VALUE` |
| **Dispatch Results** | MILP Optimal Dispatch Schedule | MILP Optimal Dispatch Schedule | `OPTIMIZATION_DISPATCH` |

> [!NOTE]
> All simulation results represent **modeled what-if scenario outputs**. They are not measured historical station telemetry, and zero solar availability in December is a stress scenario rather than an astronomical occurrence.

---

## 5. Comparative Simulation Results: Baseline vs. Polar Night

Lookahead horizon: $H = 24\text{ hours}$ (Maitri Station microgrid model).

| Metric | Baseline Scenario (Solar + Wind) | Polar Night Scenario (0 kW Solar) | Absolute Delta | Percentage Delta |
| :--- | :--- | :--- | :--- | :--- |
| **Total Station Demand** | $1,620.2\text{ kWh}$ | **$1,620.2\text{ kWh}$** | $0.0\text{ kWh}$ | $0.0\%$ |
| **PV Solar Available** | $657.1\text{ kWh}$ | **$0.0\text{ kWh}$** | $-657.1\text{ kWh}$ | $-100.0\%$ |
| **Wind Available** | $159.58\text{ kWh}$ | **$159.58\text{ kWh}$** | $0.0\text{ kWh}$ | $0.0\%$ |
| **Total Renewable Available** | $816.7\text{ kWh}$ | **$159.58\text{ kWh}$** | $-657.12\text{ kWh}$ | $-80.5\%$ |
| **Total Renewable Utilized** | $816.7\text{ kWh}$ | **$159.58\text{ kWh}$** | $-657.12\text{ kWh}$ | $-80.5\%$ |
| **Renewable Utilization Rate** | $100.0\%$ | **$100.0\%$** | $0.0\%$ | $0.0\%$ |
| **Diesel Fuel Consumption** | $173.5\text{ L}$ | **$350.3\text{ L}$** | **$+176.8\text{ L}$** | **$+101.9\%$** |
| **Generator Electrical Energy** | $647.7\text{ kWh}$ | **$1,309.9\text{ kWh}$** | **$+662.2\text{ kWh}$** | **$+102.2\%$** |
| **Generator Committed Runtime** | $7\text{ hours}$ | **$14\text{ hours}$** | **$+7\text{ hours}$** | **$+100.0\%$** |
| **Battery Discharge Energy** | $433.1\text{ kWh}$ | **$480.3\text{ kWh}$** | $+47.2\text{ kWh}$ | $+10.9\%$ |
| **Battery Charge Energy** | $277.2\text{ kWh}$ | **$329.6\text{ kWh}$** | $+52.4\text{ kWh}$ | $+18.9\%$ |
| **Minimum Battery SOC** | $20.0\%$ | **$20.0\%$** | $0.0\%$ | (Bounds respected) |
| **Maximum Battery SOC** | $74.9\%$ | **$74.9\%$** | $0.0\%$ | (Bounds respected) |
| **Critical Load Shed** | $0.0\text{ kWh}$ | **$0.0\text{ kWh}$** | $0.0\text{ kWh}$ | **$0.0\%$ Shedding** |
| **Critical Load Reliability** | $100.0\%$ | **$100.0\%$** | $0.0\%$ | **$100.0\%$ Reliable** |
| **Resilience Status** | `PROTECTED` | **`PROTECTED`** | N/A | **Zero life-support risk** |

---

## 6. Resilience Status Rule & Microgrid Dynamics

### 6.1 Transparent Resilience Rule
The resilience status is evaluated using a deterministic, transparent rule based directly on the MILP solver's solution vector:
- If $\sum p_{\text{shed}}[t] = 0.0\text{ kWh} \implies \text{resilience\_status} = \mathbf{"PROTECTED"}$.
- If $\sum p_{\text{shed}}[t] > 0.0\text{ kWh} \implies \text{resilience\_status} = \mathbf{"AT\_RISK"}$.

### 6.2 Operational Insights
1. **Survivability Confirmed**: The Maitri microgrid successfully sustains 100% of electrical demand ($1,620.2\text{ kWh}$) and 100% of critical life-support demand ($42.5\text{ kW}$) throughout the 24-hour Polar Night without any load shedding.
2. **Generator Dispatch Compensation**: Because midday solar generation ($657.1\text{ kWh}$) is unavailable, the primary generator (GEN-01) must operate for 14 hours across the day (compared to 7 hours in baseline), supplying $1,309.9\text{ kWh}$ of electrical energy.
3. **BESS Buffering**: The battery storage system charges during generator surplus periods ($329.6\text{ kWh}$) and discharges during generator shutdown intervals ($480.3\text{ kWh}$), cycling between $20.0\%$ and $74.9\%$ SOC.

---

## 7. API Verification

### 7.1 Available Endpoints

1. **List Scenarios**:
   - `GET http://127.0.0.1:8001/simulation/scenarios`
   - Returns metadata for all registered scenarios.
2. **Execute Simulation**:
   - `GET http://127.0.0.1:8001/simulation/run/MAITRI/polar-night?horizon_hours=24`
   - Returns complete 24-hour dispatch schedule, resilience metrics, comparison against baseline, and operational recommendations.
3. **Preserved Optimization Endpoint**:
   - `GET http://127.0.0.1:8001/optimization/dispatch/MAITRI?horizon_hours=24`
   - Remains fully active and unmodified.

---

## 8. Test Execution Summary

All **36 / 36** unit and integration tests passed across the test suite:

- **`test_simulation.py`**: **8 / 8 Passed** (Polar Night PV zeroing, input preservation, metrics calculation, baseline comparison, deterministic repeatability, API endpoints).
- **`test_optimization.py`**: **14 / 14 Passed** (Deterministic scenario building, PV/wind dispatch accounting, power balance, generator limits, battery bounds, critical-load protection).
- **`test_wind_model.py`**: **14 / 14 Passed** (Piecewise aerodynamic power curve, cut-in/rated/cut-out speeds, availability derating, dataset validation).

---

## 9. How Future Scenarios Can Be Added

The simulation engine is designed for straightforward addition of future resilience stress tests:

1. **Register Scenario Metadata** in `ml-service/app/simulation/scenarios.py`:
   - Add new `ScenarioId` enum member (e.g. `GENERATOR_FAILURE`, `LOW_BATTERY`, `SEVERE_BLIZZARD`).
   - Add entry to `SCENARIO_REGISTRY` with description, category, and assumption dictionary.
2. **Implement Input Modifier** in `ml-service/app/simulation/runner.py`:
   - Add a branch in `run_resilience_simulation()` to mutate the target vector:
     - For `GENERATOR_FAILURE`: clamp $G_{1,\text{CAP}} = 0.0$ or remove G1 from solver.
     - For `LOW_BATTERY`: set `initial_soc = 20.0%`.
     - For `WIND_DROP`: set $w_t = 0.0$.
     - For `HIGH_DEMAND`: multiply demand vector by $1.30$.
3. **Execute via API**: The scenario immediately becomes available on `GET /simulation/scenarios` and `GET /simulation/run/{station_id}/{new-scenario-id}`.
