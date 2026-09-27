---
documentId: "renewable-wind-model"
title: "Wind Turbine Aerodynamic Power Curve Modeling"
category: "RENEWABLE"
station: "MAITRI"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "MODELED / SCENARIO"
version: "1.0"
source: "backend/src/utils/calculations.js"
---

# Wind Turbine Aerodynamic Modeling in POLAR-EMS

## 1. Aerodynamic Power Curve Equation
POLAR-EMS models polar-hardened wind turbine power output $P_{\text{wind}}(v)$ from hub-height wind speed $v$ (in m/s) using a piecewise standard cubic aerodynamic curve:

$$P_{\text{wind}}(v) = \begin{cases}
0, & v < v_{\text{cut-in}} \\
P_{\text{rated}} \times \left(\frac{v - v_{\text{cut-in}}}{v_{\text{rated}} - v_{\text{cut-in}}}\right)^{k}, & v_{\text{cut-in}} \le v < v_{\text{rated}} \\
P_{\text{rated}} \times \eta_{\text{avail}}, & v_{\text{rated}} \le v \le v_{\text{cut-out}} \\
0, & v > v_{\text{cut-out}} \text{ (High-wind storm cutout)}
\end{cases}$$

## 2. Polar Turbine Technical Specifications
- **Installed Turbine Capacity ($P_{\text{rated}}$)**: 50.0 kW (Maitri baseline) to 60.0 kW.
- **Cut-in Wind Speed ($v_{\text{cut-in}}$)**: 3.5 m/s (minimum velocity required to initiate turbine blade rotation).
- **Rated Wind Speed ($v_{\text{rated}}$)**: 12.0 m/s (velocity at which turbine reaches maximum nominal output).
- **Cut-out Wind Speed ($v_{\text{cut-out}}$)**: 25.0 m/s (90 km/h) (automated aerodynamic feathering and mechanical braking to protect blades during severe blizzards).
- **Power Curve Exponent ($k$)**: 2.5 (empirical Antarctic density correction).
- **Availability & Cold De-rating Factor ($\eta_{\text{avail}}$)**: 0.90 to 0.95 (accounting for blade heating energy, riming, and sub-zero lubrication viscosity).

## 3. Katabatic Wind Regime
In East Antarctica, katabatic winds descend from the continental ice plateau towards the coastal oasis. These winds provide strong, continuous renewable energy during the dark winter months when solar generation is zero, making wind turbines the primary renewable asset during polar nights.
