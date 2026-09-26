# POLAR-EMS Resilience Simulation Report: Critically Low Battery State

**Scenario Identifier**: `low-battery`  
**Scenario Name**: Critically Low Battery State  
**Category**: `RESILIENCE`  
**Data Classification**: `SCENARIO` (Modeled What-If Contingency)  
**Station**: Maitri Antarctic Research Station (70°45′58″S, 11°43′56″E)  
**Evaluation Horizon**: 24 Hours (Deterministic 1-hour lookahead steps)  

---

> [!IMPORTANT]
> **Scientific & Operational Disclaimer**:  
> All Low Battery results presented in this report are **modeled what-if simulation results** produced by the POLAR-EMS Mixed-Integer Linear Programming (MILP) optimization engine and are **not measurements or records of an actual Maitri battery depletion event**.

---

## 1. Executive Summary

Under the modeled **Critically Low Battery State** contingency scenario, the Maitri station enters the 24-hour lookahead horizon with a severely depleted Battery Energy Storage System (BESS) at its **minimum allowable operational state of charge of $20.0\%$ ($70.0\text{ kWh}$ stored energy)**, compared to the nominal baseline starting state of $75.0\%$ ($262.5\text{ kWh}$).

The POLAR-EMS mathematical optimizer re-solves the unit commitment and energy dispatch to evaluate whether the station can protect critical life-support loads while actively replenishing battery reserves from available daytime solar PV, wind generation, and diesel generator support.

### Key Operational Findings
* **Critical Life-Support Load Shedding**: **$0.0\text{ kWh}$ (Zero shedding)**
* **Critical Load Reliability**: **$100.0\%$**
* **Resilience Status**: **`PROTECTED`**
* **Battery Energy Replenishment**: The battery absorbs **$418.0\text{ kWh}$** of charging energy ($+50.8\%$ compared to $277.2\text{ kWh}$ in baseline), successfully restoring the BESS from its initial $20.0\%$ floor to a peak state of **$81.4\%$ SOC ($284.9\text{ kWh}$)** by midday.
* **Fuel & Generator Impact**: Total diesel generator production increases from $647.7\text{ kWh}$ to **$844.3\text{ kWh}$ ($+196.6\text{ kWh}$ or $+30.4\%$)**, with fuel consumption increasing from $173.5\text{ L}$ to **$225.7\text{ L}$ ($+52.2\text{ L}$ or $+30.1\%$)** across 9 committed runtime hours.

---

## 2. Scenario Definition & Physical Assumptions

### Why Initial SOC is Modified
In remote polar microgrid operations, severe blizzards, extended solar deficits, or prior day dispatch anomalies may leave the station battery bank depleted to its minimum permissible reserve floor ($20\%$). Evaluating this contingency tests whether the energy management system can avoid shedding life-support systems while simultaneously rebuilding storage headroom for subsequent diurnal cycles.

### Why 20.0% Initial SOC Was Selected
The POLAR-EMS battery model imposes a hard lower state of charge limit of $\text{SOC}_{\min} = 20.0\%$ ($70.0\text{ kWh}$ for the $350\text{ kWh}$ nameplate Lithium Iron Phosphate battery) to protect cell chemistry against deep-discharge degradation. Initializing the 24-hour lookahead at exactly $20.0\%$ represents the boundary condition of maximum vulnerability.

### What Remains Strictly Unchanged
To isolate the operational consequence of low initial battery reserves, all other microgrid assets and constraints remain identical to baseline:
* **Battery Nameplate Capacity**: $350.0\text{ kWh}$
* **Battery Charge / Discharge Power Limit**: $80.0\text{ kW}$
* **Round-Trip Sub-Efficiencies**: $\eta_{\text{chg}} = 0.95, \eta_{\text{dis}} = 0.95$
* **Allowable SOC Operational Range**: $[20.0\%, 95.0\%]$
* **Station Electrical Demand**: Exact 24-hour deterministic profile ($1,620.2\text{ kWh}$ total, $42.5\text{ kW}$ critical load floor)
* **Solar PV Generation**: Exact December climatological profile ($657.1\text{ kWh}$)
* **Wind Generation**: Exact Maitri 2019 observed wind-derived generation profile ($159.6\text{ kWh}$)
* **Generator Fleet**: GEN-01 ($100\text{ kW}$) and GEN-02 ($80\text{ kW}$) fully operational with standard fuel curves

---

## 3. Mathematical Optimization Formulation

The low initial battery condition is applied directly as a boundary state in the MILP solver:

$$E_{\text{init}} = \frac{\text{SOC}_{\text{init}}}{100.0} \times \text{BATT\_CAP} = 0.20 \times 350.0\text{ kWh} = 70.0\text{ kWh}$$

### Battery State Transition Dynamics
$$\forall t \in \{0, \dots, 23\}:$$
$$e_{\text{batt}}(t) = e_{\text{batt}}(t-1) + \left(p_{\text{chg}}(t) \cdot \eta_{\text{chg}}\right) - \left(\frac{p_{\text{dis}}(t)}{\eta_{\text{dis}}}\right) \quad \text{with } e_{\text{batt}}(-1) = E_{\text{init}}$$
$$70.0\text{ kWh} \le e_{\text{batt}}(t) \le 332.5\text{ kWh} \quad (\text{SOC} \in [20.0\%, 95.0\%])$$

### Power Balance Equation
$$p_1(t) + p_2(t) + \left(s(t) - p_{\text{pv\_curt}}(t)\right) + \left(w(t) - p_{\text{wind\_curt}}(t)\right) + p_{\text{dis}}(t) - p_{\text{chg}}(t) = d(t) - p_{\text{shed}}(t)$$

---

## 4. Side-by-Side Baseline vs. Low Battery Simulation Results

| Parameter / Metric | Baseline (Nominal Operations) | Modeled Low Battery State | Absolute Delta ($\Delta$) | Percent Delta ($\%$) | Operational Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Resilience Status** | `PROTECTED` | **`PROTECTED`** | — | — | Zero critical load shedding achieved |
| **Critical Load Shedding** | $0.0\text{ kWh}$ | **$0.0\text{ kWh}$** | $0.0\text{ kWh}$ | $0.0\%$ | Critical life support 100% maintained |
| **Critical Load Reliability** | $100.0\%$ | **$100.0\%$** | $0.0\%$ | $0.0\%$ | Full station reliability preserved |
| **Initial Battery SOC** | **$75.0\%$** ($262.5\text{ kWh}$) | **$20.0\%$** ($70.0\text{ kWh}$) | **$-55.0\%$** | **$-73.3\%$** | Starting contingency condition |
| **Minimum Battery SOC** | $20.0\%$ | **$20.0\%$** | $0.0\%$ | $0.0\%$ | Never breaches lower reserve floor |
| **Maximum Battery SOC** | $82.7\%$ | **$81.4\%$** | $-1.3\%$ | $-1.6\%$ | Recharged to safe upper reserve |
| **Total Battery Charging** | $277.2\text{ kWh}$ | **$418.0\text{ kWh}$** | **$+140.8\text{ kWh}$** | **$+50.8\%$** | Aggressive daytime recharge |
| **Total Battery Discharging** | $433.1\text{ kWh}$ | **$377.2\text{ kWh}$** | **$-55.9\text{ kWh}$** | **$-12.9\%$** | Reduced nocturnal discharge buffer |
| **Total Generator Energy** | $647.7\text{ kWh}$ | **$844.3\text{ kWh}$** | **$+196.6\text{ kWh}$** | **$+30.4\%$** | Additional thermal generation dispatched |
| **Generator Runtime** | $7\text{ hours}$ | **$9\text{ hours}$** | **$+2\text{ hours}$** | **$+28.6\%$** | Extended early-morning commitment |
| **Estimated Fuel Consumption**| **$173.5\text{ L}$** | **$225.7\text{ L}$** | **$+52.2\text{ L}$** | **$+30.1\%$** | Additional fuel required for storage recovery |
| **Total Electrical Demand** | $1,620.2\text{ kWh}$ | **$1,620.2\text{ kWh}$** | $0.0\text{ kWh}$ | $0.0\%$ | Demand identical to baseline |
| **Solar PV Available** | $657.1\text{ kWh}$ | **$657.1\text{ kWh}$** | $0.0\text{ kWh}$ | $0.0\%$ | Solar identical to baseline |
| **Wind Available** | $159.6\text{ kWh}$ | **$159.6\text{ kWh}$** | $0.0\text{ kWh}$ | $0.0\%$ | Wind identical to baseline |
| **Renewable Utilization** | $100.0\%$ | **$100.0\%$** | $0.0\%$ | $0.0\%$ | Zero renewable curtailment |
| **Objective Function Value** | $174.17$ | **$226.48$** | $+52.31$ | $+30.0\%$ | Optimal economic unit dispatch |

---

## 5. Complete 20-Metric Resilience JSON Vector

```json
{
  "scenario_name": "Critically Low Battery State",
  "scenario_id": "low-battery",
  "scenario_type": "LOW_BATTERY",
  "data_classification": "SCENARIO",
  "is_demonstration_scenario": true,
  "resilience_status": "PROTECTED",
  "critical_load_status": "PROTECTED",
  "failed_generator_identifier": null,
  "failed_generator_energy_kwh": 0.0,
  "remaining_generator_energy_kwh": 844.3,
  "remaining_generator_runtime_hours": 9,
  "total_demand_kwh": 1620.2,
  "total_renewable_available_kwh": 816.68,
  "total_renewable_used_kwh": 816.7,
  "total_pv_available_kwh": 657.1,
  "total_wind_available_kwh": 159.58,
  "total_generator_energy_kwh": 844.3,
  "total_battery_charge_kwh": 418.0,
  "total_battery_discharge_kwh": 377.2,
  "initial_battery_soc_percent": 20.0,
  "minimum_battery_soc_percent": 20.0,
  "maximum_battery_soc_percent": 81.4,
  "generator_runtime_hours": 9,
  "estimated_fuel_liters": 225.7,
  "total_critical_load_shed_kwh": 0.0,
  "critical_load_reliability_percent": 100.0,
  "renewable_utilization_percent": 100.0
}
```

---

## 6. Engineering & Operational Analysis

1. **Early-Morning Deficit Compensation (Hours 00:00–06:00)**:  
   Because the battery starts at $20.0\%$ SOC, it cannot discharge to support nocturnal loads during the first 6 hours. The primary diesel generator (GEN-01) is dispatched earlier and runs at higher capacity to meet base load directly without depleting BESS reserves below the $20\%$ boundary.
2. **Solar Recharging Window (Hours 08:00–16:00)**:  
   Midday solar generation peaks at $83.3\text{ kW}$. Surplus solar and wind generation are routed into battery charging at rates up to $80.0\text{ kW}$, successfully rebuilding stored energy from $70.0\text{ kWh}$ ($20\%$) to $284.9\text{ kWh}$ ($81.4\%$).
3. **Evening Autonomy (Hours 18:00–24:00)**:  
   With reserves restored by afternoon solar charging, the battery comfortably supplies evening galley and expedition peak loads, maintaining stable microgrid operations.

---

## 7. Data Provenance & Methodology Summary

| Data Stream | Classification | Provenance Source |
| :--- | :--- | :--- |
| **Initial Battery SOC ($20\%$)** | `SCENARIO` | Modeled contingency assumption (lower reserve floor). Not real telemetry. |
| **Battery Hardware Limits** | `ENGINEERING` | Documented $350\text{ kWh}$ LFP storage specifications. |
| **Solar PV Profile** | `SCENARIO` | Historical December solar climatology ($100\text{ kW}$ nameplate, $\text{PR}=0.80$). |
| **Wind Generation Profile** | `REAL_MEASURED_DATA` $\rightarrow$ `SCENARIO` | Maitri 2019 observed wind speeds $\rightarrow$ modeled turbine power curve. |
| **Station Demand** | `SCENARIO` | Deterministic diurnal load model ($65\text{ kW}$ base, $42.5\text{ kW}$ critical). |
| **Generator Fleet** | `ENGINEERING` | Baseline dual-genset configuration ($100\text{ kW}$ G1, $80\text{ kW}$ G2). |
| **Optimized Energy Dispatch**| `OPTIMIZATION_DISPATCH` | Google OR-Tools MILP unit commitment schedule. |

---

## 8. Conclusion

Under the modeled Critically Low Battery State scenario, the POLAR-EMS microgrid achieves **$100\%$ critical-load survival (`PROTECTED`)** with zero shedding. The optimizer automatically balances early-morning thermal dispatch with aggressive daytime renewable recharging, proving the microgrid's resilience against severe storage depletion.
