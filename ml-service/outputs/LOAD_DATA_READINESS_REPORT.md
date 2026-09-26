# Maitri Station Electrical Demand / Load Data Readiness Report

**Document**: `LOAD_DATA_READINESS_REPORT.md`  
**Scope**: Read-only repository audit of the electrical demand, station power consumption, heating/HVAC requirements, generator-room records, and load modeling in POLAR-EMS.  
**Inspection Mode**: Read-only repository audit. No code, database, API, or optimizer modifications.

---

## 1. Audit of the Current Synthetic Demand Model

The electrical demand vector consumed by the OR-Tools optimization engine is currently generated synthetically inside [`ml-service/app/optimization/dispatcher.py`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/app/optimization/dispatcher.py) within the `build_demonstration_scenario_inputs()` function.

### 1.1 Mathematical Formulation

For each lookahead hour $h \in \{0, 1, \dots, 23\}$:

$$\text{hour\_of\_day} = h \pmod{24}$$

$$\text{diurnal\_factor}(h) = \begin{cases}
0.85 & 00:00 \le \text{hour\_of\_day} < 06:00 \quad (\text{Nocturnal Base}) \\
1.15 & 06:00 \le \text{hour\_of\_day} < 11:00 \quad (\text{Morning Lab \& Galley Prep}) \\
1.00 & 11:00 \le \text{hour\_of\_day} < 17:00 \quad (\text{Midday Standard}) \\
1.25 & 17:00 \le \text{hour\_of\_day} < 22:00 \quad (\text{Evening Shift, Galley \& Expedition Peak}) \\
0.90 & 22:00 \le \text{hour\_of\_day} < 24:00 \quad (\text{Night Wind-Down})
\end{cases}$$

$$\text{wave}(h) = 3.0 \cdot \sin(0.5 \cdot h)$$

$$d(h) = \text{round}\Big(\max\big(45.0,\; \text{base\_load\_kw} \cdot \text{diurnal\_factor}(h) + \text{wave}(h)\big),\; 1\Big)$$

Where:
- $\text{base\_load\_kw} = 65.0\text{ kW}$
- Absolute floor clamp: $45.0\text{ kW}$

### 1.2 Characteristics of the Current Demand Profile

| Property | Value / Behavior | Unit | Provenance Classification |
| :--- | :--- | :---: | :--- |
| **Base Demand Parameter** | $65.0$ | $\text{kW}$ | `SCENARIO_ASSUMPTION` |
| **Absolute Minimum Floor** | $45.0$ (configured floor), $55.2$ (actual profile minimum at 00:00) | $\text{kW}$ | `ENGINEERING_ASSUMPTION` |
| **Maximum Peak Demand** | $83.6$ (at 17:00 evening peak) | $\text{kW}$ | `SCENARIO_ASSUMPTION` |
| **24-Hour Mean Demand** | $67.51$ | $\text{kW}$ | `SCENARIO_ASSUMPTION` |
| **24-Hour Total Electrical Energy** | $1,620.20$ | $\text{kWh}$ | `SCENARIO_ASSUMPTION` |
| **Critical Life-Support Load** | $42.5$ | $\text{kW}$ | `DOCUMENTED_MAITRI_VALUE` (Sum of critical schema circuits) |
| **Discretization & Units** | 1-hour intervals, average power in $\text{kW}$ ($\text{kW} \cdot 1\text{ h} = \text{kWh}$) | $\text{kW}$ | `ENGINEERING_ASSUMPTION` |
| **Determinism** | **Deterministic**: Fixed reference anchor `2026-12-01T00:00:00Z`, 0 to 23 integer index | N/A | `ENGINEERING_ASSUMPTION` |

### 1.3 How Demand Enters the Optimizer

In `optimize_24h_dispatch()`:
1. **Power Balance Constraint**:
   $$p_1[t] + p_2[t] + (s_t - p_{\text{pv\_curt}}[t]) + (w_t - p_{\text{wind\_curt}}[t]) + p_{\text{dis}}[t] - p_{\text{chg}}[t] = \big(d_t - p_{\text{shed}}[t]\big)$$
   where $d_t$ is the demand at hour $t$.
2. **Flexible Load Shedding Bound**:
   $$0 \le p_{\text{shed}}[t] \le \max\big(0.0,\; d_t - 42.5\big)$$
   ensuring the $42.5\text{ kW}$ critical life-support load is strictly non-sheddable under all operating conditions.

---

## 2. Complete Inventory of Discovered Load & Demand Sources in Repository

| # | File / Path | Parameter / Data Description | Value / Range | Unit | Time Period | Measured vs. Documented | Usable Directly in Hourly Optimizer? | Limitations | Classification |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|:---:|
| **1** | `ml-service/app/optimization/dispatcher.py` | Diurnal synthetic station load curve | $55.2\text{–}83.6$ (mean $67.5$) | $\text{kW}$ | 24-hour lookahead | Synthetic model | Yes (Current baseline) | Heuristic piecewise diurnal scaling; not derived from real meter readings. | **`SCENARIO_ASSUMPTION`** |
| **2** | `backend/prisma/seed.js` | Critical & Subsystem Load Circuits (8 circuits):<br>1. Habitation HVAC ($28.0\text{ kW}$)<br>2. Satellite/Comms ($8.5\text{ kW}$)<br>3. Medical Bay ($6.0\text{ kW}$)<br>4. Snow Melter ($18.0\text{ kW}$)<br>5. Physics Lab ($15.0\text{ kW}$)<br>6. Cryo Freezers ($7.5\text{ kW}$)<br>7. Workstations/Lighting ($12.0\text{ kW}$)<br>8. Snow Blower Charger ($10.0\text{ kW}$) | Rated: $104.5\text{ kW}$ total<br>Active: $73.2\text{ kW}$ total<br>Critical base: $42.5\text{ kW}$ | $\text{kW}$ | Static nominal circuit definitions | Documented engineering circuit model | Yes (Defines critical load boundary) | Static ratings; no continuous hourly time-series telemetry. | **`DOCUMENTED_MAITRI_VALUE`** *(for circuit structure)* / **`ENGINEERING_ASSUMPTION`** |
| **3** | `backend/prisma/schema.prisma` | `EnergyLoad` relational table schema: `totalLoad`, `heatingLoad`, `waterLoad`, `communicationLoad`, `laboratoryLoad`, `refrigerationLoad`, `flexibleLoad` | Schema definition | $\text{kW}$ | Schema specification | Database structure | Schema only (Empty in production until live telemetry is streamed) | Table structure exists, but currently contains 0 empirical rows. | **`ENGINEERING_ASSUMPTION`** |
| **4** | `backend/prisma/seed.js` | Generator fleet definition: `MAITRI-GEN-01` ($100\text{ kW}$), `MAITRI-GEN-02` ($80\text{ kW}$), `MAITRI-GEN-03` ($80\text{ kW}$), `MAITRI-GEN-04` ($60\text{ kW}$) | Total nameplate: $320\text{ kW}$ | $\text{kW}$ | Static asset configuration | Modeled asset configuration | Yes (Defines generator dispatch bounds) | Represents generator fleet capacity, not electrical demand. | **`SCENARIO_ASSUMPTION`** |
| **5** | `frontend/src/lib/mock-data/energy.ts` & `generators.ts` | Frontend UI mock telemetry: `currentLoadKW: 428`, `criticalLoadKW: 182`, `dailyFuelConsumptionL: 782`, Kirloskar $125\text{ kVA}$ gensets ($128\text{ kW} + 101\text{ kW}$) | Load: $428\text{ kW}$<br>Fuel: $782\text{ L/day}$ | $\text{kW}$, $\text{L/day}$ | Mock snapshot | Mock data for UI rendering | No | Mock UI demonstration state; inconsistent with $65\text{ kW}$ microgrid scale. | **`SCENARIO_ASSUMPTION`** |
| **6** | `ml-service/app/data/loaders.py` & `models/energy_forecaster.py` | Energy Demand Forecaster (`HistGradientBoostingRegressor`) targeting `total_load` | Pipeline code | $\text{kW}$ | Code structure | ML pipeline code | Pipeline ready | Requires populated `energy_loads` table to train. | **`ENGINEERING_ASSUMPTION`** |
| **7** | `ml-service/datasets/raw/maitri/2019/*.mdb` (365 files) | IMD Automatic Weather Station (AWS) surface observations | Temp, Pressure, Humidity, Wind, Solar | Various meteorological units | Full Year 2019 (8,760 hours) | **`REAL_MEASURED_DATA`** | No (Weather only) | Contains zero electrical load, generator output, or fuel logs. | **`REAL_MEASURED_DATA`** *(Weather only)* |
| **8** | `ml-service/datasets/raw/maitri/1985-2016/imd_maitri.txt` | Historical IMD surface climate observations | Temp, Pressure, Wind Speed/Dir | Meteorological | 1985–2016 | **`REAL_MEASURED_DATA`** | No (Weather only) | Contains zero electrical demand records. | **`REAL_MEASURED_DATA`** *(Weather only)* |
| **9** | `ml-service/datasets/raw/maitri/radiation/1985-2000/radiation.txt` | Historical IMD global solar radiation observations | Radiation flux ($0.0\text{–}2.788\text{ MJ/m}^2$) | $\text{MJ/m}^2$ | 1985–2000 (4,607 records) | **`REAL_MEASURED_DATA`** | No (Solar only) | Contains zero electrical demand records. | **`REAL_MEASURED_DATA`** *(Solar only)* |

---

## 3. Detailed Answers to Required Evaluation Questions

### A. Do we have real hourly Maitri electrical load data?
**NO.**  
The repository does not contain measured historical hourly electrical power demand ($\text{kW}$) or energy consumption records from Maitri Station telemetry or SCADA logging. All empirical datasets in the repository (`radiation.txt`, `imd_maitri.txt`, `010119.mdb`–`311219.mdb`) are strictly **meteorological/atmospheric observations** from IMD surface stations.

### B. If not, what real / documented Maitri information do we have?
1. **Real Measured Data (`REAL_MEASURED_DATA`)**:
   - 16 years (1985–2000) of hourly global solar radiation observations at Maitri Station.
   - 32 years (1985–2016) of multi-parameter surface weather records (temperature, wind, pressure).
   - 1 complete continuous year (2019, 8,760 hourly records) of Maitri surface weather observations (ambient temperature down to $-33^\circ\text{C}$, wind speed up to $47.6\text{ m/s}$, atmospheric pressure, humidity).
2. **Documented / Structured System Information (`DOCUMENTED_MAITRI_VALUE`)**:
   - Subsystem circuit breakdown: 8 defined functional circuits across Habitation HVAC ($28.0\text{ kW}$), Comms ($8.5\text{ kW}$), Medical Bay ($6.0\text{ kW}$), Snow-Melter ($18.0\text{ kW}$), Research Lab ($15.0\text{ kW}$), Cryo Storage ($7.5\text{ kW}$), Lighting/Workstations ($12.0\text{ kW}$), Auxiliary Chargers ($10.0\text{ kW}$).
   - Critical non-sheddable life-support floor: $\mathbf{42.5\text{ kW}}$ (HVAC $+$ Comms $+$ Medical).
   - Station geographic location: Schirmacher Oasis ($70^\circ 45' 57''\text{ S}, 11^\circ 44' 09''\text{ E}$).

### C. Which existing information could constrain or calibrate the synthetic load model?
1. **Ambient Temperature Relationship ($T_{\text{ambient}}$)**:
   - Measured 2019 Maitri hourly temperature ranges from $-33.6^\circ\text{C}$ (mid-winter) to $+4.5^\circ\text{C}$ (summer).
   - Heating is the dominant Antarctic load component ($28.0\text{ kW}$ rated in circuit definitions). Physical thermal transmission ($\dot{Q}_{\text{loss}} = U \cdot A \cdot (T_{\text{indoor}} - T_{\text{ambient}})$) can couple electrical heating demand to the empirical 2019 temperature time-series.
2. **Critical vs. Non-Critical Circuit Constraints**:
   - Strict lower bound: Demand cannot drop below $42.5\text{ kW}$ under operational conditions.
   - Maximum simultaneous connected load: Cannot exceed total connected circuit rating ($104.5\text{ kW}$).
3. **Winter vs. Summer Seasonal Occupancy & Diurnal Cycles**:
   - Summer expedition peak (Dec–Feb, ~65 personnel): Higher laboratory and water production activity.
   - Winter isolation (Mar–Nov, ~25 personnel): Lower human activity, but higher thermal heating demand due to $-30^\circ\text{C}$ temperatures and polar night.

### D. What information is missing?
1. **Empirical Sub-station Meter Telemetry**: Historical kW time-series records for total station bus demand.
2. **Measured Fuel Logs**: Daily or monthly diesel fuel consumption records (liters/day) from the Maitri generator house.
3. **Generator Logbooks**: Running hours, electrical load percentages, and specific fuel consumption (SFC) curves of actual installed generator units.
4. **Thermal vs. Electrical Split**: Explicit measurement of thermal energy supplied via diesel generator exhaust/jacket heat recovery (CHP) versus direct electric resistance heaters.

### E. What is the safest next step for creating a source-grounded load model?
1. **Retain Current $65\text{ kW}$ Baseline for Demonstration**: Keep the verified $65\text{ kW}$ base ($55.2\text{–}83.6\text{ kW}$) as the documented `SCENARIO_ASSUMPTION` for the December 1 benchmark.
2. **Formulate a Source-Grounded Thermal-Electrical Heating Model**:
   - Model the base non-thermal load as a deterministic diurnal occupancy schedule ($25\text{–}35\text{ kW}$ for lighting, instruments, communications, medical, and galley).
   - Dynamically couple the thermal heating load ($P_{\text{heat}}$) to the real measured 2019 Maitri hourly ambient temperature ($T_{\text{ambient}}$) using a physical building heat-loss coefficient calibrated to match the documented $28\text{ kW}$ HVAC circuit rating at design temperatures ($-35^\circ\text{C}$).
3. **Maintain Strict Provenance Labels**:
   - Clearly label the resulting demand profile as `MODELED_DATA (Physics-Based Thermal-Electrical Coupling)` derived from `REAL_MEASURED_DATA (IMD 2019 Temperature Telemetry)`.
   - Never claim the derived profile is measured station power meter telemetry.
