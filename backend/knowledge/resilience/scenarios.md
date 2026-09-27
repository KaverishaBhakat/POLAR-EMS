---
documentId: "resilience-scenarios"
title: "Resilience Contingency Scenarios and What-If Analysis"
category: "RESILIENCE"
station: "ALL"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "MODELED / SCENARIO"
version: "1.0"
source: "ml-service/app/simulation/scenarios.py"
---

# Resilience Contingency Scenarios in POLAR-EMS

## 1. What-If Resilience Engine
The POLAR-EMS resilience engine simulates extreme environmental and hardware contingencies over 24-hour horizons. It evaluates whether the microgrid can protect critical life-support loads (42.5 kW at Maitri) without violating physical system boundaries.

## 2. Active Registered Resilience Scenarios
1. **Polar Night (`polar-night`)**:
   - **Description**: Simulates mid-winter polar night conditions where solar irradiance is $0.0\text{ W/m}^2$ and PV power is $0.0\text{ kW}$ for all 24 hours.
   - **Operational Test**: Evaluates whether katabatic wind turbine power, battery reserve, and diesel generators can sustain station loads without solar contributions.
2. **Primary Generator Failure (`generator-failure`)**:
   - **Description**: Simulates the total unavailability ($N-1$ contingency) of the primary 100 kW diesel generator (GEN-01) for the full 24-hour lookahead.
   - **Operational Test**: Assesses if secondary generator (GEN-02, 80 kW) combined with battery peak-shaving and renewables can prevent power deficits.
3. **Critically Low Battery State (`low-battery`)**:
   - **Description**: Simulates entering the 24-hour horizon with initial battery SOC at the bottom reserve limit of $20.0\%$ ($70.0\text{ kWh}$).
   - **Operational Test**: Evaluates generator ramp rates and renewable charging capability to recover battery SOC while meeting station demand.
4. **Renewable Generation Drop (`renewable-drop`)**:
   - **Description**: Simulates a severe $80\%$ drop across both solar PV and wind generation ($20\%$ retention) for 24 hours.
   - **Operational Test**: Tests thermal generator fuel consumption and automated load prioritization during prolonged calm and overcast weather.
5. **Severe Blizzard (`severe-blizzard`)**:
   - **Description**: Combines $70\%$ solar reduction, $20\%$ electrical demand surge (extreme thermal heating load), and $125\%$ elevated wind speeds.
   - **Operational Test**: Evaluates storm cut-out handling ($v > 25\text{ m/s}$) and space heating prioritization.
6. **High Demand Surge (`high-demand`)**:
   - **Description**: Simulates a station-wide $40\%$ electrical load increase across all 24 hours.
   - **Operational Test**: Validates microgrid capacity margins during multi-facility scientific experiments and auxiliary heating operations.

## 3. Provenance and Disclaimers
All resilience scenario outputs are strictly classified as **MODELED / SCENARIO**. They are mathematical what-if simulations and do not represent historical failure incidents at Maitri or Bharati stations.
