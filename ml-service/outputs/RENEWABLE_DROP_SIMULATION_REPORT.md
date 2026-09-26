# POLAR-EMS Resilience Simulation Report: Renewable Generation Drop

**Scenario Identifier**: `renewable-drop`  
**Scenario Name**: Renewable Generation Drop  
**Category**: `RESILIENCE`  
**Data Classification**: `SCENARIO` (Modeled What-If Contingency)  
**Station**: Maitri Antarctic Research Station (70°45′58″S, 11°43′56″E)  
**Evaluation Horizon**: 24 Hours (Deterministic 1-hour lookahead steps)  

---

> [!IMPORTANT]
> **Scientific & Operational Disclaimer**:  
> The 80% renewable reduction is a **scenario assumption for resilience testing and does not represent a measured Maitri event**. All results presented in this report are modeled what-if simulations produced by the POLAR-EMS MILP optimization engine.

---

## 1. Executive Summary

Under the modeled **Renewable Generation Drop** scenario, the Maitri microgrid experiences a severe **$80.0\%$ reduction across both solar PV and wind turbine generation** for the entire 24-hour evaluation horizon ($20.0\%$ renewable generation retained).

This contingency evaluates whether the energy storage system and diesel generator fleet can absorb the sudden loss of $653.4\text{ kWh}$ of renewable energy while maintaining zero critical life-support load shedding.

### Key Operational Findings
* **Critical Life-Support Load Shedding**: **$0.0\text{ kWh}$ (Zero shedding)**
* **Critical Load Reliability**: **$100.0\%$**
* **Resilience Status**: **`PROTECTED`**
* **Renewable Utilization**: **$100.0\%$** of available renewable energy ($163.3\text{ kWh}$) is captured and used with zero curtailment.
* **Thermal Generation Response**: Total diesel generator output increases from $647.7\text{ kWh}$ to **$1,311.1\text{ kWh}$ ($+663.4\text{ kWh}$ or $+102.4\%$)**, with commitment runtime doubling from $7\text{ hours}$ to **$14\text{ hours}$ ($+100.0\%$)**.
* **Fuel Impact**: Estimated fuel consumption increases from $173.5\text{ L}$ (Baseline) to **$350.5\text{ L}$ ($+177.0\text{ L}$ or $+102.0\%$)**.

---

## 2. Scenario Definition & Physical Assumptions

### Why an 80% Reduction Was Selected
In polar environments, dense overcast cloud cover, heavy blowing snow, or rime icing on turbine blades can drastically attenuate renewable output simultaneously across solar panels and wind turbines without causing a complete blackout. An 80% reduction represents a severe multi-resource meteorological suppression contingency.

### Why 20% Renewable Generation Is Retained
Unlike the `polar-night` scenario (which models a total $0.0\text{ kW}$ solar blackout), the `renewable-drop` scenario isolates the effect of **substantially diminished but active renewable co-generation**.

### Mathematical Formulation of Mutation
$$\forall t \in \{0, \dots, 23\}:$$
$$s_{\text{scenario}}(t) = s_{\text{baseline}}(t) \times 0.20$$
$$w_{\text{scenario}}(t) = w_{\text{baseline}}(t) \times 0.20$$

### Preserved Microgrid Inputs & Constraints
* **Station Demand**: Exact deterministic diurnal load curve ($1,620.2\text{ kWh}$ total, $42.5\text{ kW}$ critical load floor).
* **Initial Battery SOC**: Baseline nominal starting state ($75.0\%$ / $262.5\text{ kWh}$), strictly preserving separation from the `low-battery` scenario.
* **Battery Hardware Limits**: $350\text{ kWh}$ capacity, $\text{SOC} \in [20.0\%, 95.0\%]$, $p_{\text{chg}}, p_{\text{dis}} \le 80\text{ kW}$, $\eta_{\text{chg}} = \eta_{\text{dis}} = 0.95$.
* **Generator Fleet**: Both GEN-01 ($100\text{ kW}$) and GEN-02 ($80\text{ kW}$) remain fully available.

---

## 3. Renewable Reduction Verification

| Resource Stream | Baseline Generation Available | Scenario Generation Available | Absolute Delta ($\Delta$) | Reduction Percentage ($\%$) |
| :--- | :--- | :--- | :--- | :--- |
| **Solar PV Generation** | $657.1\text{ kWh}$ | **$131.4\text{ kWh}$** | $-525.7\text{ kWh}$ | **$-80.0\%$** |
| **Wind Turbine Generation** | $159.6\text{ kWh}$ | **$31.9\text{ kWh}$** | $-127.7\text{ kWh}$ | **$-80.0\%$** |
| **Total Renewable Energy** | **$816.7\text{ kWh}$** | **$163.3\text{ kWh}$** | **$-653.4\text{ kWh}$** | **$-80.0\%$** |

---

## 4. Side-by-Side Baseline vs. Renewable Drop Results

| Metric | Baseline (Nominal Operations) | Modeled Renewable Drop (20% Retained) | Absolute Delta ($\Delta$) | Percent Delta ($\%$) | Operational Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Resilience Status** | `PROTECTED` | **`PROTECTED`** | — | — | Meets zero-shedding criteria |
| **Critical Load Shedding** | $0.0\text{ kWh}$ | **$0.0\text{ kWh}$** | $0.0\text{ kWh}$ | $0.0\%$ | Critical life support 100% maintained |
| **Critical Reliability** | $100.0\%$ | **$100.0\%$** | $0.0\%$ | $0.0\%$ | Perfect critical reliability |
| **Total Renewable Available**| $816.7\text{ kWh}$ | **$163.3\text{ kWh}$** | **$-653.4\text{ kWh}$** | **$-80.0\%$** | Severe resource deficit |
| **Total Renewable Used** | $816.7\text{ kWh}$ | **$163.3\text{ kWh}$** | $-653.4\text{ kWh}$ | $-80.0\%$ | Zero curtailment |
| **Renewable Utilization** | $100.0\%$ | **$100.0\%$** | $0.0\%$ | $0.0\%$ | 100% renewable utilization |
| **Total Generator Energy** | $647.7\text{ kWh}$ | **$1,311.1\text{ kWh}$** | **$+663.4\text{ kWh}$** | **$+102.4\%$** | Thermal generation doubles |
| **Generator Runtime** | $7\text{ hours}$ | **$14\text{ hours}$** | **$+7\text{ hours}$** | **$+100.0\%$** | Genset operates 14 of 24 hours |
| **Estimated Fuel Consumption**| **$173.5\text{ L}$** | **$350.5\text{ L}$** | **$+177.0\text{ L}$** | **$+102.0\%$** | Fuel consumption doubles |
| **Battery Discharge** | $433.1\text{ kWh}$ | **$525.9\text{ kWh}$** | $+92.8\text{ kWh}$ | $+21.4\%$ | BESS cycles deeper for buffering |
| **Battery Charge** | $277.2\text{ kWh}$ | **$380.1\text{ kWh}$** | $+102.9\text{ kWh}$ | $+37.1\%$ | Generator charges BESS during runtime |
| **Initial Battery SOC** | $75.0\%$ | **$75.0\%$** | $0.0\%$ | $0.0\%$ | Preserved baseline initial SOC |
| **Minimum Battery SOC** | $20.0\%$ | **$20.0\%$** | $0.0\%$ | $0.0\%$ | Respects lower reserve floor |
| **Maximum Battery SOC** | $82.7\%$ | **$84.8\%$** | $+2.1\%$ | $+2.5\%$ | Recharged during generator windows |
| **Station Electrical Demand** | $1,620.2\text{ kWh}$ | **$1,620.2\text{ kWh}$** | $0.0\text{ kWh}$ | $0.0\%$ | Demand identical to baseline |
| **Objective Function Value** | $174.17$ | **$351.45$** | $+177.28$ | $+101.8\%$ | Optimal economic dispatch |

---

## 5. Standard Resilience Metrics Output (`resilienceMetrics`)

```json
{
  "scenario_name": "Renewable Generation Drop",
  "scenario_id": "renewable-drop",
  "scenario_type": "RENEWABLE_DROP",
  "data_classification": "SCENARIO",
  "is_demonstration_scenario": true,
  "resilience_status": "PROTECTED",
  "critical_load_status": "PROTECTED",
  "failed_generator_identifier": null,
  "failed_generator_energy_kwh": 0.0,
  "remaining_generator_energy_kwh": 1311.1,
  "remaining_generator_runtime_hours": 14,
  "total_demand_kwh": 1620.2,
  "total_renewable_available_kwh": 163.32,
  "total_renewable_used_kwh": 163.3,
  "total_pv_available_kwh": 131.4,
  "total_wind_available_kwh": 31.92,
  "total_generator_energy_kwh": 1311.1,
  "total_battery_charge_kwh": 380.1,
  "total_battery_discharge_kwh": 525.9,
  "initial_battery_soc_percent": 75.0,
  "minimum_battery_soc_percent": 20.0,
  "maximum_battery_soc_percent": 84.8,
  "generator_runtime_hours": 14,
  "estimated_fuel_liters": 350.5,
  "total_critical_load_shed_kwh": 0.0,
  "critical_load_reliability_percent": 100.0,
  "renewable_utilization_percent": 100.0
}
```

---

## 6. Engineering & Operational Analysis

1. **Generation Shift to Thermal Fleet**:  
   With renewables supplying only $163.3\text{ kWh}$ (compared to $816.7\text{ kWh}$ in baseline), the primary diesel generator (GEN-01) steps in for 14 hours of the 24-hour day, generating $1,311.1\text{ kWh}$ to bridge the $653.4\text{ kWh}$ deficit.
2. **BESS Dynamic Peak-Shaving**:  
   During midday solar hours when $20\%$ PV generation is insufficient to cover daytime station load ($65\text{ kW}$ to $83.6\text{ kW}$), the BESS discharges up to $60\text{ kW}$ and cycles $525.9\text{ kWh}$ of total throughput, smoothing diesel generator loading.
3. **Fuel Logistics Implication**:  
   Operating under sustained 80% renewable reduction increases daily station fuel consumption from $173.5\text{ L}$ to $350.5\text{ L}$ ($+102.0\%$). Over an extended multi-day weather anomaly, station logistics must account for roughly double the daily fuel burn rate.

---

## 7. Data Provenance & Methodological Integrity

| Data Stream | Classification | Provenance Source |
| :--- | :--- | :--- |
| **80% Renewable Reduction** | `SCENARIO` | Modeled contingency assumption ($0.20 \times \text{baseline}$). Not a real weather event. |
| **Solar PV Baseline** | `SCENARIO` | Historical December solar climatology ($100\text{ kW}$ nameplate, $\text{PR}=0.80$). |
| **Wind Generation Baseline** | `REAL_MEASURED_DATA` $\rightarrow$ `SCENARIO` | Maitri 2019 observed wind speeds $\rightarrow$ modeled turbine power curve. |
| **Station Demand** | `SCENARIO` | Deterministic diurnal load model ($65\text{ kW}$ base, $42.5\text{ kW}$ critical). |
| **Battery Parameters** | `ENGINEERING` | Documented $350\text{ kWh}$ LFP storage model with $95\%$ efficiency. |
| **Generator Fleet** | `ENGINEERING` | Baseline dual-genset configuration ($100\text{ kW}$ G1, $80\text{ kW}$ G2). |
| **Optimized Dispatch** | `OPTIMIZATION_DISPATCH` | Google OR-Tools MILP unit commitment schedule. |

---

## 8. Conclusion

Under the modeled Renewable Generation Drop scenario, the POLAR-EMS microgrid maintains **$100\%$ critical-load survival (`PROTECTED`)** with zero shedding. The optimizer responds rationally by doubling diesel runtime and energy output while using BESS buffer storage to maintain station stability.
