---
documentId: "energy-load-model"
title: "Station Electrical Load and Thermal Modeling"
category: "ENERGY"
station: "ALL"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "backend/src/utils/calculations.js"
---

# Station Electrical Load and Thermal Modeling

## 1. Load Composition in Polar Stations
In Antarctic research stations, total electrical demand is divided into distinct subsystem circuits:
1. **Critical Life Support (Priority 1)**: Habitation environmental life-support, basic oxygenation, water trace-heating, fire suppression, emergency lighting, and emergency satellite communication. Baseline guaranteed at 42.5 kW for Maitri and 50 kW for Bharati.
2. **Space & Trace Heating (Priority 2)**: Electric radiant heaters, duct heating, plumbing freeze-protection trace lines. Heating load is inversely proportional to outside ambient temperature.
3. **Water Production & Waste Treatment (Priority 2)**: Snow-melting boilers, filtration systems, and biological sewage treatment plants.
4. **Scientific Laboratories (Priority 3)**: Atmospheric monitoring instruments, geomagnetic sensors, spectrometry, meteorological radar.
5. **Kitchen & Domestic (Priority 3)**: Galley induction stoves, ovens, dishwashers, and refrigeration.
6. **Flexible / Deferrable Loads (Priority 4)**: Non-critical battery charging, auxiliary snow melters, workshop machinery, electric vehicle charging.

## 2. Deterministic Mathematical Load Formula
The station demand is calculated through thermodynamic and operational factors:

$$P_{\text{load}}(t) = P_{\text{base}} + P_{\text{thermal}}(\Delta T) + P_{\text{occupancy}}(N) + P_{\text{diurnal}}(t)$$

Where:
- $P_{\text{base}}$ = 65.0 kW baseline constant consumption.
- $P_{\text{thermal}}(\Delta T) = 1.8 \times \max(0, -T_{\text{ambient}})$: In sub-zero weather, electrical heating load increases by 1.8 kW for every degree Celsius below 0°C.
- $P_{\text{occupancy}}(N) = (N - 20) \times 0.75\text{ kW}$: Domestic electrical consumption increases with station occupancy $N$ relative to winter baseline (20 persons).
- $P_{\text{diurnal}}(t)$: Diurnal activity multiplier (morning meal prep at 07:00–09:00 with 1.15x multiplier, evening dinner/expedition return at 18:00–21:00 with 1.25x multiplier, night 00:00–06:00 with 0.85x multiplier).

## 3. Load Shedding Protocol
Under critical generation deficit or N-1 genset failure:
- **Level 1 Shedding**: Shed Level 4 flexible auxiliary loads (snow melters, workshop tools).
- **Level 2 Shedding**: Shed Level 3 laboratory and non-essential domestic circuits.
- **Level 3 Protection**: Under no circumstances are Priority 1 Critical Loads (42.5 kW) shed. The OR-Tools MILP solver enforces a heavy penalty constraint ($M = 10^5$) on critical load curtailment.
