# POLAR-EMS Optimization Model Input Provenance Report

**Document**: `OPTIMIZATION_MODEL_INPUT_PROVENANCE.md`  
**Scope**: Complete inventory and scientific provenance audit of every numerical parameter, constraint, penalty, and input vector used in the POLAR-EMS OR-Tools microgrid dispatch optimizer ([`ml-service/app/optimization/dispatcher.py`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/ml-service/app/optimization/dispatcher.py)).  
**Inspection Mode**: Read-only repository audit (no code, database, API, or frontend changes).

---

## 1. Provenance Classification Schema

All parameters are categorized strictly according to one of four classifications:

- **`REAL_MEASURED_DATA`**: Derived directly from empirical, measured historical observations at Maitri Station archived in the repository.
- **`DOCUMENTED_MAITRI_VALUE`**: Based on documented station characteristics, official NCPOR publications, or architectural specifications in the repository.
- **`ENGINEERING_ASSUMPTION`**: Standard microgrid engineering rule-of-thumb, physical property, or solver regularizer.
- **`SCENARIO_ASSUMPTION`**: Simulation benchmark parameter used to establish baseline demonstration scenarios.

---

## 2. Complete Numerical Parameter Inventory Table

| # | Parameter | Current Value | Unit | Where Defined | How Used | Classification | Existing Source / Evidence in Repository | Should Replace? | Recommended Next Action |
|:---|:---|:---:|:---:|:---|:---|:---:|:---|:---:|:---|
| **1** | **Maitri Solar Irradiance ($G_t$)** | Hourly vector ($0.0 \dots 774.4$) | $\text{W/m}^2$ | `ml-service/datasets/raw/maitri/radiation/1985-2000/radiation.txt` $\rightarrow$ `maitri_solar_hourly.csv` | Input to PV generation model ($P_{\text{pv}} = P_{\text{cap}} \cdot \frac{G}{1000} \cdot \text{PR}$) | **`REAL_MEASURED_DATA`** | Historical IMD global solar radiation records (1985–2000, 4,607 hourly observations) validated in `validation_report.json`. | **No** | Retain as the gold standard empirical solar resource baseline for Maitri. |
| **2** | **Solar Conversion Constant ($10^6 / 3600$)** | $277.78$ | $\frac{\text{W/m}^2}{\text{MJ/m}^2\cdot\text{h}}$ | `ml-service/app/data/solar_processor.py` | Converts raw hourly energy density ($\text{MJ/m}^2$) to mean flux irradiance ($\text{W/m}^2$) | **`ENGINEERING_ASSUMPTION`** | Exact physical unit conversion from SI energy per hour to power flux ($1\text{ MJ} = 10^6\text{ J}$, $1\text{ h} = 3600\text{ s}$). | **No** | Retain as exact physical constant. |
| **3** | **Standard Test Irradiance ($G_{\text{STC}}$)** | $1000.0$ | $\text{W/m}^2$ | `ml-service/app/models/pv_model.py` | Reference standard testing irradiance for PV panel rating normalization | **`ENGINEERING_ASSUMPTION`** | IEC 60904-3 / standard photovoltaic STC rating baseline. | **No** | Retain standard testing condition constant. |
| **4** | **December PV Climatology Vector ($s_t$)** | 24-hour vector ($\Sigma = 657.1$) | $\text{kWh}$ | `ml-service/datasets/processed/maitri/solar/maitri_pv_24h_scenario.csv` | Hourly upper bound for solar generation $p_{\text{pv\_curt}}[t] \le s_t$ in power balance | **`REAL_MEASURED_DATA`** *(Modeled from Real)* | Derived by parameterizing 16-year measured December mean solar radiation with $100\text{ kW}$ capacity & $0.80\text{ PR}$. | **No** | Retain as primary December solar dispatch profile. |
| **5** | **PV Array Capacity ($P_{\text{cap}}$)** | $100.0$ | $\text{kW}$ | `ml-service/config/maitri_pv_config.json`, `dispatcher.py` | Scales solar generation scenario | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Configured as a benchmark scenario parameter. Actual installed rooftop/experimental PV at Maitri is not telemetry-instrumented in repo. | **Yes** *(when actual rating confirmed)* | Replace with actual installed Maitri solar PV array rating when empirical telemetry is available. |
| **6** | **PV Performance Ratio ($\text{PR}$)** | $0.80$ | unitless | `ml-service/config/maitri_pv_config.json`, `dispatcher.py` | Derates ideal STC output for inverter, cabling, snow-soiling, and low-temperature losses | **`ENGINEERING_ASSUMPTION`** | Standard cold-climate PV system derating assumption. | **Yes** *(when thermal model integrated)* | Upgrade to dynamic temperature-dependent efficiency curve using measured ambient temperature. |
| **7** | **PV Availability Factor** | $1.0$ | unitless | `ml-service/config/maitri_pv_config.json` | Multiplier for array availability (unshaded/uncovered) | **`ENGINEERING_ASSUMPTION`** | Assumes 100% operational availability without snow occlusion. | **Yes** *(for blizzard scenarios)* | Modulate in blizzard scenarios to reflect partial snow burial / albedo changes. |
| **8** | **Synthetic Solar Peak Power** | $35.0$ | $\text{kW}$ | `dispatcher.py` line 39 | Peak solar generation fallback for non-Maitri stations | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Hardcoded synthetic diurnal half-wave fallback. | **Yes** | Replace synthetic fallback with actual solar datasets for Bharati or station-specific models. |
| **9** | **Station Base Electrical Demand** | $65.0$ | $\text{kW}$ | `dispatcher.py` line 38 | Scaling center for the synthetic diurnal station load curve | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Approximates typical polar station base load. | **Yes** | Ingest real measured historical microgrid load profiles from station energy logs when available. |
| **10** | **Demand Diurnal Factors (5 time windows)** | $[0.85, 1.15, 1.00, 1.25, 0.90]$ | unitless | `dispatcher.py` lines 82–88 | Multiplies base load to simulate morning lab prep (06–11h) and evening galley/expedition shift (17–22h) | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Heuristic representation of daily research station human activity cycles. | **Yes** | Derive empirical hourly demand distribution from measured station power sub-metering. |
| **11** | **Demand Sinusoidal Wave Amplitude** | $3.0$ | $\text{kW}$ | `dispatcher.py` line 89 | Adds continuous micro-perturbation ($3.0 \cdot \sin(0.5 h)$) to demand | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Synthetic noise model. | **Yes** | Replace with measured historical load variability or ML load forecaster output. |
| **12** | **Demand Floor Minimum** | $45.0$ | $\text{kW}$ | `dispatcher.py` line 90 | Enforces absolute minimum station demand | **`ENGINEERING_ASSUMPTION`** | Ensures station load is always $\ge$ critical life-support base ($42.5\text{ kW}$). | **No** | Retain as sanity bound. |
| **13** | **Heating & Thermal Load Separation** | Implicit in total load (not decoupled) | $\text{kW}$ | `dispatcher.py` | Combined into single electrical demand variable | **`ENGINEERING_ASSUMPTION`** | In `backend/prisma/seed.js`, HVAC heating is listed as $28.0\text{ kW}$ rated circuit, but electrical dispatcher treats it as part of aggregated $d_t$. | **Yes** | Decouple thermal/heating demand to enable combined heat and power (CHP) co-optimization. |
| **14** | **Katabatic Wind Mean Power** | $25.0$ | $\text{kW}$ | `dispatcher.py` line 40 | Mean power level for synthetic wind turbine generation | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Approximates output of small wind turbine array under polar winds. | **Yes** | Connect to measured Maitri wind speed time series (`maitri_2019_hourly.csv`) via aerodynamic power curve ($P(v)$). |
| **15** | **Wind Sinusoidal Gust Modulation** | $[10.0, 5.0]$ | $\text{kW}$ | `dispatcher.py` line 103 | Generates cyclic wind fluctuations ($10.0 \sin(0.4h + 1.2) + 5.0 \cos(0.8h)$) | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Heuristic synthetic wave. | **Yes** | Replace with physical wind speed observations converted through turbine $C_p$ curve. |
| **16** | **Wind Minimum Power Floor** | $5.0$ | $\text{kW}$ | `dispatcher.py` line 103 | Minimum cut-in baseline wind generation | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Assumes persistent katabatic polar wind. | **Yes** | Derive from turbine cut-in speed ($v_{\text{cut-in}} \approx 3.5\text{ m/s}$). |
| **17** | **Generator 1 Maximum Capacity ($G_{1,\text{CAP}}$)** | $100.0$ | $\text{kW}$ | `dispatcher.py` line 187, `backend/prisma/seed.js` | Upper bound for G1 output ($p_1[t] \le u_1[t] \cdot 100$) | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Matches database seed asset `MAITRI-GEN-01 (Primary Base)`. Real Maitri genset fleet ratings are not verified from repo docs. | **Yes** *(when nameplate data confirmed)* | Verify actual Kirloskar/Cummins generator nameplate ratings installed at Maitri Station. |
| **18** | **Generator 1 Minimum Load ($G_{1,\text{MIN}}$)** | $20.0$ | $\text{kW}$ | `dispatcher.py` line 188 | Lower bound when G1 is committed ($p_1[t] \ge u_1[t] \cdot 20$) | **`ENGINEERING_ASSUMPTION`** | 20% minimum loading rule-of-thumb to prevent diesel wet-stacking and cylinder glazing. | **No** | Retain standard diesel engine protection limit (20–25% of rated capacity). |
| **19** | **Generator 1 Idle Fuel Rate ($F_{1,\text{idle}}$)** | $3.5$ | $\text{L/h}$ | `dispatcher.py` line 189 | Fuel consumed per hour of generator commitment regardless of output | **`ENGINEERING_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Linearized Willans line intercept for a $100\text{ kW}$ diesel genset ($\approx 3.5\%\text{ of rated power in L/h}$). | **Yes** *(if manufacturer curve available)* | Calibrate against manufacturer Willans fuel curve or empirical station fuel logs. |
| **20** | **Generator 1 Incremental Fuel Slope ($F_{1,\text{slope}}$)** | $0.23$ | $\text{L/kWh}$ | `dispatcher.py` line 190 | Marginal fuel consumption per kWh electrical output ($\approx 270\text{ g/kWh}$) | **`ENGINEERING_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Corresponds to $\approx 39.5\%$ thermal-to-electric efficiency for a modern diesel engine. | **Yes** *(if manufacturer curve available)* | Calibrate against empirical specific fuel consumption (SFC) records. |
| **21** | **Generator 2 Maximum Capacity ($G_{2,\text{CAP}}$)** | $80.0$ | $\text{kW}$ | `dispatcher.py` line 192, `backend/prisma/seed.js` | Upper bound for G2 output ($p_2[t] \le u_2[t] \cdot 80$) | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Matches database seed asset `MAITRI-GEN-02 (Auxiliary Dispatch)`. | **Yes** *(when nameplate data confirmed)* | Verify actual auxiliary genset ratings at Maitri. |
| **22** | **Generator 2 Minimum Load ($G_{2,\text{MIN}}$)** | $15.0$ | $\text{kW}$ | `dispatcher.py` line 193 | Lower bound when G2 is committed ($p_2[t] \ge u_2[t] \cdot 15$) | **`ENGINEERING_ASSUMPTION`** | $\approx 18.75\%$ minimum loading to prevent engine carbon fouling. | **No** | Retain standard diesel engine protection limit. |
| **23** | **Generator 2 Idle Fuel Rate ($F_{2,\text{idle}}$)** | $3.0$ | $\text{L/h}$ | `dispatcher.py` line 194 | Fuel consumed per hour of G2 commitment | **`ENGINEERING_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Linearized Willans line intercept for an $80\text{ kW}$ diesel engine. | **Yes** | Calibrate against empirical manufacturer SFC curve. |
| **24** | **Generator 2 Incremental Fuel Slope ($F_{2,\text{slope}}$)** | $0.25$ | $\text{L/kWh}$ | `dispatcher.py` line 195 | Marginal fuel consumption per kWh output for G2 ($\approx 38.0\%$ efficiency) | **`ENGINEERING_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Represents slightly lower thermal efficiency for smaller auxiliary unit. | **Yes** | Calibrate against empirical SFC records. |
| **25** | **Generator Startup Costs / Min Up-Down Times** | $0.0\text{ (implicit)}$ | $\text{L / hours}$ | `dispatcher.py` | Startup fuel and minimum up/down time constraints not explicitly parameterized | **`ENGINEERING_ASSUMPTION`** | Startup fuel is currently subsumed by the hourly idle cost $u_1 \cdot 3.5\text{ L/h}$. | **Yes** | Add explicit minimum up-time ($\ge 2\text{ h}$) and startup fuel ($2.0\text{ L}$) for realistic engine thermal wear modeling. |
| **26** | **Battery Rated Capacity ($E_{\text{nom}}$)** | $350.0$ | $\text{kWh}$ | `dispatcher.py` line 197, `backend/prisma/seed.js` | Total nominal energy storage capacity | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Matches database seed asset `MAITRI LiFePO4 BESS Container`. No empirical BESS telemetry is in repo. | **Yes** *(when actual station storage confirmed)* | Replace with actual station battery bank capacity if installed at Maitri. |
| **27** | **Battery Minimum State of Charge ($\text{SOC}_{\text{min}}$)** | $20.0$ | $\%$ | `dispatcher.py` line 198, `schema.prisma` | Lower cutoff bound for energy storage: $E_{\text{min}} = 0.20 \cdot 350 = 70.0\text{ kWh}$ | **`ENGINEERING_ASSUMPTION`** | Standard Lithium Iron Phosphate (LiFePO4) DOD safety limit to prevent deep-discharge cell degradation and preserve emergency reserve. | **No** | Retain standard electrochemistry safety limit. |
| **28** | **Battery Maximum State of Charge ($\text{SOC}_{\text{max}}$)** | $95.0$ | $\%$ | `dispatcher.py` line 199, `schema.prisma` | Upper bound for energy storage: $E_{\text{max}} = 0.95 \cdot 350 = 332.5\text{ kWh}$ | **`ENGINEERING_ASSUMPTION`** | Standard LiFePO4 overcharge and thermal runaway safety ceiling. | **No** | Retain standard electrochemistry safety limit. |
| **29** | **Battery Max Power Rating ($P_{\text{BESS,max}}$)** | $80.0$ | $\text{kW}$ | `dispatcher.py` line 202, `schema.prisma` | Maximum charge and discharge converter power ($p_{\text{chg}}, p_{\text{dis}} \le 80$) | **`ENGINEERING_ASSUMPTION`** | Corresponds to $\approx 0.23\text{C}$ continuous charge/discharge rate for $350\text{ kWh}$ pack. | **No** | Retain realistic C-rate converter sizing. |
| **30** | **Battery Charging Efficiency ($\eta_{\text{chg}}$)** | $0.95$ | unitless | `dispatcher.py` line 203 | Coloumbic/inverter charging efficiency ($e[t] += p_{\text{chg}} \cdot 0.95$) | **`ENGINEERING_ASSUMPTION`** | Standard round-trip efficiency component ($\sqrt{0.90} \approx 0.95$) for LiFePO4 + bidirectional inverter. | **No** | Retain industry standard value. |
| **31** | **Battery Discharging Efficiency ($\eta_{\text{dis}}$)** | $0.95$ | unitless | `dispatcher.py` line 204 | Discharge converter efficiency ($e[t] -= p_{\text{dis}} / 0.95$) | **`ENGINEERING_ASSUMPTION`** | Standard round-trip efficiency component for LiFePO4 battery pack. | **No** | Retain industry standard value. |
| **32** | **Initial Battery SOC ($E_{\text{init}}$)** | $75.0$ | $\%$ | `dispatcher.py` lines 37, 211 | Boundary condition state of charge at $t = 0$ ($262.5\text{ kWh}$) | **`SCENARIO_ASSUMPTION`** | Configured starting state of charge for demonstration lookahead. | **Yes** *(in real-time SCADA mode)* | In operational mode, ingest the actual measured live SCADA battery SOC at $t=0$. |
| **33** | **Critical Life-Support Load ($P_{\text{crit}}$)** | $42.5$ | $\text{kW}$ | `dispatcher.py` lines 133, 206 | Non-sheddable load constraint: $p_{\text{shed}}[t] \le \max(0, d_t - 42.5)$ | **`DOCUMENTED_MAITRI_VALUE`** *(from schema circuits)* | Exact sum of the 3 CRITICAL load circuits defined in `backend/prisma/seed.js`: Habitation HVAC ($28.0\text{ kW}$) $+$ Comms ($8.5\text{ kW}$) $+$ Medical Bay ($6.0\text{ kW}$) $= 42.5\text{ kW}$. | **No** | Retain as the exact critical protection threshold matching system circuit definitions. |
| **34** | **Renewable Curtailment Penalty** | $50.0$ | $/ \text{kWh}$ | `dispatcher.py` line 207 | Objective coefficient for $p_{\text{pv\_curt}}[t]$ and $p_{\text{wind\_curt}}[t]$ | **`ENGINEERING_ASSUMPTION`** | Heavy economic penalty ensuring zero renewable spillage whenever storage or load absorption is physically possible. | **No** | Retain solver priority penalty. |
| **35** | **Flexible Load Shedding Penalty** | $500.0$ | $/ \text{kWh}$ | `dispatcher.py` line 208 | Objective coefficient for $p_{\text{shed}}[t]$ | **`ENGINEERING_ASSUMPTION`** | Order of magnitude higher than diesel cost ($0.23$) and curtailment penalty ($50.0$), guaranteeing shedding occurs only in severe deficit contingencies. | **No** | Retain solver priority penalty. |
| **36** | **Battery Wear / Cycling Cost** | $0.001$ | $/ \text{kWh}$ | `dispatcher.py` line 209 | Objective coefficient for $p_{\text{chg}}[t]$ and $p_{\text{dis}}[t]$ | **`ENGINEERING_ASSUMPTION`** | Numerical regularizer / tie-breaker that guarantees $p_{\text{chg}}[t] \cdot p_{\text{dis}}[t] = 0.0$ without requiring binary complementarity variables. | **No** | Retain mathematical regularization parameter. |
| **37** | **Lookahead Time Horizon** | $24$ | hours | `dispatcher.py` line 36 | Number of hourly dispatch steps optimized simultaneously | **`ENGINEERING_ASSUMPTION`** | Standard 24-hour diurnal day-ahead unit commitment lookahead horizon. | **No** | Retain standard 24h rolling lookahead. |
| **38** | **Time Discretization Step ($\Delta t$)** | $1.0$ | hour | `dispatcher.py` | Length of each dispatch commitment interval | **`ENGINEERING_ASSUMPTION`** | Standard hourly power-energy equivalence interval ($\text{kW} \cdot 1\text{ h} = \text{kWh}$). | **No** | Retain standard 1-hour interval. |
| **39** | **Deterministic Reference Epoch** | `2026-12-01T00:00:00Z` | ISO-8601 | `dispatcher.py` lines 49, 173 | Fixed timestamp reference anchor for 24-hour deterministic scenario indexing | **`SCENARIO_ASSUMPTION`** | Anchors December climatological scenario independently of host execution clock. | **No** | Retain deterministic scenario anchor. |
| **40** | **Baseline Fuel Multiplier** | $1.28$ | unitless | `dispatcher.py` line 391 | Multiplier ($\text{Total Fuel} \times 1.28$) estimating unoptimized/uncontrolled continuous 2-gen baseline | **`SCENARIO_ASSUMPTION`** | "NOT VERIFIED FROM REPOSITORY" — Benchmark comparator representing $\approx 21.9\%$ fuel savings under optimal MILP dispatch. | **Yes** | Replace with rigorous unoptimized spinning-reserve simulation run rather than a scalar multiplier. |

---

## 3. Provenance Summary Statistics

| Classification | Count | Percentage |
|:---|:---:|:---:|
| **`REAL_MEASURED_DATA`** | **2** | 5.0% |
| **`DOCUMENTED_MAITRI_VALUE`** | **1** | 2.5% |
| **`ENGINEERING_ASSUMPTION`** | **25** | 62.5% |
| **`SCENARIO_ASSUMPTION`** | **12** | 30.0% |
| **Total Parameter Count** | **40** | **100.0%** |

---

## 4. Top 5 Inputs That Should Eventually Be Improved

1. **Katabatic Wind Generation Profile ($25.0\text{ kW}$ mean synthetic sinusoidal wave)**
   - *Current limitation*: Purely synthetic formula ($25 + 10\sin + 5\cos$).
   - *Improvement path*: Connect to empirical hourly wind speed telemetry from `maitri_2019_hourly.csv` (measuring actual $0\text{–}38\text{ m/s}$ polar winds) passed through a verified wind turbine power curve $P(v)$.
2. **Station Electrical Load & Demand Profile ($65.0\text{ kW}$ base with heuristic diurnal factors)**
   - *Current limitation*: Heuristic daily curve based on general operational assumptions.
   - *Improvement path*: Ingest empirical sub-station electrical load logs or ML load forecaster predictions trained on station occupancy and temperature records.
3. **Decoupled Thermal / HVAC Heating Demand ($28.0\text{ kW}$ rated circuit)**
   - *Current limitation*: Heating is implicitly lumped into total electrical demand.
   - *Improvement path*: Formulate separate thermal power balance constraints to model heat recovery from generator cooling jackets and exhaust gas heat exchangers (CHP cogeneration).
4. **Baseline Fuel Comparison Formulation ($1.28\times$ scalar multiplier)**
   - *Current limitation*: Constant multiplier representing unoptimized baseline.
   - *Improvement path*: Run a parallel rule-based simulation model (e.g., continuous 2-generator load-following without BESS lookahead) to calculate exact empirical baseline fuel consumption.
5. **Dynamic Temperature-Dependent PV Derating & Generator Startup Penalties**
   - *Current limitation*: Constant $\text{PR} = 0.80$ and zero explicit startup fuel.
   - *Improvement path*: Modulate PV panel temperature coefficient ($\gamma_{\text{Pmp}} \approx -0.38\%/^\circ\text{C}$) with ambient weather observations, and add minimum generator up/down times ($\ge 2\text{ hours}$) and startup fuel ($2.0\text{ L}$).

---

## 5. Inputs That Should NOT Be Changed (Properly Sourced / Validated)

1. **Maitri Historical Global Solar Radiation Dataset (`radiation.txt` / `maitri_solar_hourly.csv`)**:
   - 16 years (1985–2000, 4,607 empirical observations) of verified IMD / NCPOR Antarctic solar radiation measurements.
2. **Standard Physical Unit Conversion ($10^6 / 3600 = 277.78\text{ W}/(\text{MJ}\cdot\text{h})$)**:
   - Exact mathematical conversion from energy density to power flux.
3. **Critical Life-Support Non-Sheddable Load ($42.5\text{ kW}$)**:
   - Matches the exact sum of the critical life-support circuits (Habitation HVAC $28.0\text{ kW} +$ Communications $8.5\text{ kW} +$ Medical Bay $6.0\text{ kW}$).
4. **Battery Electrochemical Safety Envelopes ($20.0\%\text{–}95.0\%$ SOC, $80\text{ kW}$ Max Converter Power, $95\%$ Efficiency)**:
   - Reflects standard physical LiFePO4 battery specifications and thermal degradation boundaries.
5. **Deterministic Reference Time Indexing (`2026-12-01T00:00:00Z`, Hours 1–24)**:
   - Guarantees exact mathematical repeatability and alignment across multiple executions independent of host system clocks.

---

## 6. Recommended Next Development Step

**Next Step**: Implement the **Polar Night (Zero Solar Resource)** and **Blizzard / Generator Outage** resilience scenarios in the scenario builder without changing the underlying mathematical model or database schemas. 

Because the solar input ($s_t$) is already decoupled and verified, and load shedding ($p_{\text{shed}}[t]$) is now dynamically tracked, the resilience scenarios can cleanly parameterize stress vectors ($s_t = 0.0$, generator availability flags $u_{1,\text{avail}}, u_{2,\text{avail}}$, and cold-weather thermal heating multipliers) to evaluate emergency microgrid survival strategies.
