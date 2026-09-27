---
documentId: "generators-generator-model"
title: "Diesel Generator Fleet Modeling and Fuel Consumption Curves"
category: "GENERATORS"
station: "MAITRI"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "backend/src/services/generator.service.js"
---

# Diesel Generator Fleet Modeling in POLAR-EMS

## 1. Generator Fleet Configuration (Maitri Baseline)
The station relies on a synchronized multi-genset diesel powerplant:
- **Primary Generator (GEN-01)**:
  - Rated Capacity: $100.0\text{ kW}$
  - Minimum Operational Loading: $20.0\text{ kW}$ ($20\%$ loading floor to prevent wet stacking and cylinder glazing).
- **Secondary Generator (GEN-02)**:
  - Rated Capacity: $80.0\text{ kW}$
  - Minimum Operational Loading: $15.0\text{ kW}$.
- **Emergency Standby (GEN-03)**:
  - Rated Capacity: $60.0\text{ kW}$ (Cold standby, auto-start upon station bus failure).

## 2. Fuel Consumption Rate Model
Diesel fuel consumption $F(P)$ (in liters per hour) is modeled using an affine piecewise linear fuel curve:

$$F(P) = F_0 \cdot u + S_f \cdot P$$

Where:
- $u \in \{0, 1\}$: Binary unit commitment status ($1 = \text{online}, 0 = \text{offline}$).
- $F_0$: No-load fuel consumption ($2.5\text{ L/h}$ for GEN-01, $2.0\text{ L/h}$ for GEN-02).
- $S_f$: Incremental fuel slope ($\approx 0.24\text{ L/kWh}$ to $0.26\text{ L/kWh}$).
- Typical average Specific Fuel Oil Consumption (SFOC): $0.26 - 0.28\text{ L/kWh}$ at $70\%-85\%$ load.

## 3. Environmental and Carbon Emissions
- Carbon Dioxide Emission Intensity: $2.68\text{ kg CO}_2\text{ per liter of polar diesel burned}$.
- Thermal Energy Recovery: Exhaust gas and cooling water heat exchangers provide cogeneration heat for the station central glycol loop.

## 4. Why Generator Output Increases During Low Renewable Periods
In polar microgrids, total electrical power generation must exactly equal total demand at every second:

$$P_{\text{load}}(t) = P_{\text{PV}}(t) + P_{\text{wind}}(t) + P_{\text{discharge}}(t) - P_{\text{charge}}(t) + P_{\text{gen}}(t)$$

When renewable resources drop (e.g. during cloudy conditions, polar night, calm wind intervals, or blizzard storm cut-outs) and once the battery reaches its minimum $20\%$ SOC reserve floor, the diesel generators are committed by the EMS optimizer to ramp up power output to prevent blackouts and ensure continuous power to critical life-support systems.
