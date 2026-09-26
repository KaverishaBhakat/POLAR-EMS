# POLAR-EMS Resilience Simulation Report: Primary Generator Failure

**Scenario Identifier**: `generator-failure`  
**Scenario Name**: Primary Generator Failure  
**Category**: `RESILIENCE`  
**Data Classification**: `SCENARIO` (Modeled What-If Contingency)  
**Station**: Maitri Antarctic Research Station (70°45′58″S, 11°43′56″E)  
**Evaluation Horizon**: 24 Hours (Deterministic 1-hour lookahead steps)  

---

> [!IMPORTANT]
> **Scientific & Operational Disclaimer**:  
> All Generator Failure results presented in this report are **modeled what-if simulation results** produced by the POLAR-EMS MILP optimization engine and are **not measurements or records of an actual Maitri generator failure event**.

---

## 1. Executive Summary

Under the modeled **Primary Generator Failure** scenario, the primary diesel generator (**GEN-01, 100 kW nameplate rating**) suffers an unpredicted total outage and remains completely unavailable ($0.0\text{ kW}$ output, $u_1(t)=0$) for the entire 24-hour evaluation horizon.

The POLAR-EMS mathematical optimizer re-dispatches the microgrid using the remaining assets:
* **Secondary Diesel Generator (GEN-02, 80 kW rating)**
* **Historical Climatological Solar PV ($100\text{ kW}$ nameplate, $657.1\text{ kWh}$ daily available)**
* **Maitri 2019 Wind Generation ($50\text{ kW}$ nameplate, $159.6\text{ kWh}$ daily available)**
* **Battery Energy Storage System (BESS, $350\text{ kWh}$ capacity, $80\text{ kW}$ max charge/discharge)**

### Key Outcome
* **Critical Life-Support Load Shedding**: **$0.0\text{ kWh}$ (Zero shedding)**
* **Critical Load Reliability**: **$100.0\%$**
* **Resilience Status**: **`PROTECTED`**
* **Fuel Impact**: Estimated fuel consumption increases modestly from **$173.5\text{ L}$ (Baseline)** to **$186.0\text{ L}$ ($+12.5\text{ L}$ or $+7.2\%$)**, driven by the slightly higher fuel curve slope ($0.25\text{ L/kWh}$ vs $0.23\text{ L/kWh}$) and lower efficiency of GEN-02.
* **Generator Runtime**: Generator commitment increases from **$7\text{ hours}$ (GEN-01)** to **$9\text{ hours}$ (GEN-02)**.

---

## 2. Failed Generator Identification & Selection Rationale

### Microgrid Generation Fleet
The POLAR-EMS Maitri generation fleet comprises two diesel generator sets modeled in the core dispatch engine:

| Generator ID | Name / Role | Nameplate Capacity | Minimum Output Floor | Idle Fuel Rate ($c_{\text{idle}}$) | Incremental Fuel Slope ($c_{\text{slope}}$) | Baseline Status | Scenario Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GEN-01** | Primary Base Genset | **$100.0\text{ kW}$** | $20.0\text{ kW}$ ($20\%$) | $3.5\text{ L/h}$ | $0.23\text{ L/kWh}$ | Online ($647.7\text{ kWh}$) | **FAILED / UNAVAILABLE ($0.0\text{ kW}$)** |
| **GEN-02** | Secondary / Peaking Genset | **$80.0\text{ kW}$** | $15.0\text{ kW}$ ($18.75\%$) | $3.0\text{ L/h}$ | $0.25\text{ L/kWh}$ | Standby ($0.0\text{ kWh}$) | **ACTIVE BACKUP ($636.0\text{ kWh}$)** |

### Selection Rationale
1. **Primary Asset Dominance**: GEN-01 is the largest single generating unit on the microgrid ($100\text{ kW}$, representing $>55\%$ of total thermal capacity).
2. **Worst-Case N-1 Contingency**: Failing the primary generator represents the single most demanding $(N-1)$ generator contingency standard in microgrid engineering.
3. **No Fictional Generators**: The failure strictly targets the existing primary unit without altering ratings or fabricating hypothetical hardware.

---

## 3. Mathematical Optimization & Failure Modification

The generator failure is not an external post-processing filter. It is enforced **directly inside the OR-Tools Mixed-Integer Linear Programming (MILP) model**:

$$\forall t \in \{0, \dots, 23\}:$$

### Generator Constraints Under Failure
$$u_1(t) = 0 \quad \text{(Commitment strictly OFF)}$$
$$p_1(t) = 0.0\text{ kW} \quad \text{(Output power strictly 0)}$$

### Remaining Generator Constraints
$$u_2(t) \cdot 15.0\text{ kW} \le p_2(t) \le u_2(t) \cdot 80.0\text{ kW}$$

### System Power Balance
$$p_2(t) + \left(s(t) - p_{\text{pv\_curt}}(t)\right) + \left(w(t) - p_{\text{wind\_curt}}(t)\right) + p_{\text{dis}}(t) - p_{\text{chg}}(t) = d(t) - p_{\text{shed}}(t)$$

### Preserved Assets & Constraints
* **Solar PV**: Retained exact historical December climatological generation profile ($657.1\text{ kWh}$).
* **Wind Generation**: Retained exact 2019 Maitri observed wind-derived turbine power ($159.6\text{ kWh}$).
* **Electrical Demand**: Retained exact deterministic diurnal demand profile ($1,620.2\text{ kWh}$ total, $42.5\text{ kW}$ critical load floor).
* **BESS Constraints**: $350\text{ kWh}$ capacity, $\text{SOC} \in [20.0\%, 95.0\%]$, $p_{\text{chg}}, p_{\text{dis}} \le 80\text{ kW}$, $\eta_{\text{chg}} = \eta_{\text{dis}} = 0.95$.

---

## 4. Side-by-Side Baseline vs. Generator Failure Results

| Metric | Baseline (Nominal Operations) | Modeled Generator Failure | Absolute Delta ($\Delta$) | Percent Delta ($\%$) | Physical Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Status / Solvability** | `SUCCESS` (`OPTIMAL`) | `SUCCESS` (`OPTIMAL`) | — | — | Microgrid remains fully solvable |
| **Critical Load Shed** | $0.0\text{ kWh}$ | $0.0\text{ kWh}$ | $0.0\text{ kWh}$ | $0.0\%$ | Life-support load fully protected |
| **Critical Reliability** | $100.0\%$ | $100.0\%$ | $0.0\%$ | $0.0\%$ | Perfect reliability maintained |
| **Resilience Status** | `PROTECTED` | `PROTECTED` | — | — | Meets zero-shedding criteria |
| **Failed Unit Energy (GEN-01)** | $647.7\text{ kWh}$ | **$0.0\text{ kWh}$** | $-647.7\text{ kWh}$ | **$-100.0\%$** | Verified complete unit outage |
| **Backup Unit Energy (GEN-02)** | $0.0\text{ kWh}$ | **$636.0\text{ kWh}$** | $+636.0\text{ kWh}$ | $\text{N/A}$ | GEN-02 takes over thermal deficit |
| **Total Generator Energy** | $647.7\text{ kWh}$ | $636.0\text{ kWh}$ | $-11.7\text{ kWh}$ | $-1.8\%$ | Slight deficit covered by BESS |
| **Generator Runtime** | $7\text{ hours}$ (GEN-01) | $9\text{ hours}$ (GEN-02) | $+2\text{ hours}$ | $+28.6\%$ | GEN-02 operates longer at lower power |
| **Fuel Consumption** | **$173.5\text{ L}$** | **$186.0\text{ L}$** | **$+12.5\text{ L}$** | **$+7.2\%$** | Slightly higher fuel rate on GEN-02 |
| **Battery Discharge** | $433.1\text{ kWh}$ | $325.4\text{ kWh}$ | $-107.7\text{ kWh}$ | $-24.9\%$ | Optimized dispatch adjusts cycling |
| **Battery Charge** | $277.2\text{ kWh}$ | $158.0\text{ kWh}$ | $-119.2\text{ kWh}$ | $-43.0\%$ | Less surplus absorbed into BESS |
| **Minimum Battery SOC** | $20.0\%$ | $20.0\%$ | $0.0\%$ | $0.0\%$ | BESS respects lower DOD boundary |
| **Maximum Battery SOC** | $82.7\%$ | $82.5\%$ | $-0.2\%$ | $-0.2\%$ | BESS headroom preserved |
| **Solar PV Available** | $657.1\text{ kWh}$ | $657.1\text{ kWh}$ | $0.0\text{ kWh}$ | $0.0\%$ | Identical renewable input |
| **Wind Available** | $159.6\text{ kWh}$ | $159.6\text{ kWh}$ | $0.0\text{ kWh}$ | $0.0\%$ | Identical wind input |
| **Renewable Utilization** | $100.0\%$ | $100.0\%$ | $0.0\%$ | $0.0\%$ | Zero curtailment required |
| **Objective Function Value** | $174.17$ | $186.49$ | $+12.32$ | $+7.1\%$ | Optimal economic unit dispatch |

---

## 5. Comprehensive 20-Metric Resilience Summary

Under the standard POLAR-EMS simulation interface, the following 20 core resilience metrics are exported:

```json
{
  "scenario_name": "Primary Generator Failure",
  "scenario_id": "generator-failure",
  "scenario_type": "GENERATOR_FAILURE",
  "data_classification": "SCENARIO",
  "is_demonstration_scenario": true,
  "resilience_status": "PROTECTED",
  "critical_load_status": "PROTECTED",
  "failed_generator_identifier": "GEN-01",
  "failed_generator_energy_kwh": 0.0,
  "remaining_generator_energy_kwh": 636.04,
  "remaining_generator_runtime_hours": 9,
  "total_demand_kwh": 1620.2,
  "total_renewable_available_kwh": 816.68,
  "total_renewable_used_kwh": 816.7,
  "total_pv_available_kwh": 657.1,
  "total_wind_available_kwh": 159.58,
  "total_generator_energy_kwh": 636.0,
  "total_battery_charge_kwh": 158.0,
  "total_battery_discharge_kwh": 325.4,
  "minimum_battery_soc_percent": 20.0,
  "maximum_battery_soc_percent": 82.5,
  "generator_runtime_hours": 9,
  "estimated_fuel_liters": 186.0,
  "total_critical_load_shed_kwh": 0.0,
  "critical_load_reliability_percent": 100.0,
  "renewable_utilization_percent": 100.0
}
```

---

## 6. Engineering Analysis of System Response

### How the Microgrid Survives
During peak diurnal load periods ($55.2\text{ kW}$ to $83.6\text{ kW}$):
1. **Solar PV & Wind Coverage**: Midday solar production peaking at $\approx 83.3\text{ kW}$ covers daylight station demand entirely, allowing both generators to remain committed OFF.
2. **Secondary Genset Engagement**: During nocturnal deficit periods (Hours 01:00–06:00 and 21:00–24:00), GEN-02 steps in, operating between $54\text{ kW}$ and $78\text{ kW}$, well within its $80\text{ kW}$ continuous rating.
3. **BESS Dynamic Buffering**: The $350\text{ kWh}$ battery smooths transient peaks and supplies up to $80\text{ kW}$ instantaneous discharge to prevent thermal overload on GEN-02.
4. **Zero Life-Support Impact**: The $42.5\text{ kW}$ critical life-support load is never compromised at any hour.

---

## 7. Data Provenance & Methodological Integrity

| Stream | Provenance Classification | Methodological Source |
| :--- | :--- | :--- |
| **Generator Failure Event** | `SCENARIO` | Simulated what-if outage ($u_1=0, p_1=0$). Not a real telemetry failure. |
| **Generator Hardware Parameters** | `ENGINEERING` | Documented Maitri generation baseline ($100\text{ kW}$ G1, $80\text{ kW}$ G2). |
| **Solar PV Profile** | `SCENARIO` | Historical December solar climatology ($100\text{ kW}$ nameplate, $\text{PR}=0.80$). |
| **Wind Generation Profile** | `REAL_MEASURED_DATA` $\rightarrow$ `SCENARIO` | Maitri 2019 observed wind speeds $\rightarrow$ modeled turbine power curve. |
| **Station Demand** | `SCENARIO` | Deterministic diurnal load model ($65\text{ kW}$ base, $42.5\text{ kW}$ critical). |
| **BESS Storage Profile** | `ENGINEERING` | $350\text{ kWh}$ LFP storage model with $95\%$ round-trip sub-efficiency. |
| **Optimized Dispatch** | `OPTIMIZATION_DISPATCH` | Google OR-Tools MILP unit commitment and dispatch schedule. |

---

## 8. Limitations & Future Extensions

1. **Deterministic Single-Bus Horizon**: The 24-hour lookahead treats the station bus as a single lumped node without intra-hour distribution line impedance or voltage drops.
2. **Cold-Start Delay**: The current model assumes GEN-02 is in hot-standby and can ramp up instantaneously without thermal warm-up delays.
3. **Combined Multi-Hazard Resilience**: In upcoming resilience phases, compound scenarios (e.g., *Generator Failure during Polar Night* or *Generator Failure + Severe Blizzard*) will test microgrid boundaries when renewable co-generation is simultaneously absent.

---

## 9. Conclusion

Under the modeled Primary Generator Failure scenario, the POLAR-EMS microgrid demonstrates **$100\%$ critical-load survival (`PROTECTED`)** by dynamically transferring generation requirements to GEN-02 and orchestrating BESS and renewable co-generation. The entire simulation runs deterministically, conforms strictly to the transparent resilience framework, and integrates seamlessly into the POLAR-EMS API ecosystem.
