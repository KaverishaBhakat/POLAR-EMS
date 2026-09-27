---
documentId: "battery-bess-model"
title: "Battery Energy Storage System (BESS) Assumptions and Constraints"
category: "BATTERY"
station: "ALL"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "backend/src/services/battery.service.js"
---

# Battery Energy Storage System (BESS) Modeling

## 1. Physical Specifications and Chemistry
- **Nameplate Storage Capacity**: 350 kWh (Maitri baseline) / 400 kWh (Bharati baseline).
- **Cell Chemistry**: Lithium Iron Phosphate ($\text{LiFePO}_4$) or Lithium Titanate ($\text{LTO}$) housed in thermally insulated, climate-controlled containerized enclosures maintained at $+15^\circ\text{C}$ to $+20^\circ\text{C}$.
- **Maximum Power Rating**:
  - Maximum Charge Power: $80.0\text{ kW}$
  - Maximum Discharge Power: $80.0\text{ kW}$

## 2. State of Charge (SOC) Reserve Window
To prevent accelerated cell degradation and protect emergency reserve energy for life-support:
- **Upper Charge Limit ($\text{SOC}_{\max}$)**: $95.0\%$ ($332.5\text{ kWh}$). Overcharge protection avoids lithium plating and high cell stress.
- **Lower Reserve Floor ($\text{SOC}_{\min}$)**: $20.0\%$ ($70.0\text{ kWh}$). Deep discharge buffer strictly reserved for emergency backup in case of total genset trip.
- **Usable Energy Capacity**: $E_{\text{usable}} = 350 \times (0.95 - 0.20) = 262.5\text{ kWh}$.

## 3. Dynamic State Transition & Efficiency
The state of charge transitions across discrete hourly time steps $t \to t+1$ according to:

$$\text{SOC}(t+1) = \text{SOC}(t) + \left(\frac{\eta_{\text{charge}} \times P_{\text{charge}}(t) - \frac{P_{\text{discharge}}(t)}{\eta_{\text{discharge}}}}{E_{\text{rated}}}\right) \times 100\%$$

Where:
- $\eta_{\text{charge}} = 0.959$ (Square root of round-trip efficiency).
- $\eta_{\text{discharge}} = 0.959$.
- Combined Round-Trip AC-to-AC Efficiency ($\eta_{\text{RTE}}$): $92.0\%$.

## 4. Operational Role in Microgrid
1. **Renewable Buffering**: Absorbs peak daytime solar and high-wind surplus generation that exceeds station base demand.
2. **Generator Peak Shaving**: Discharges during morning/evening meal peaks to prevent starting an auxiliary second diesel generator.
3. **Black-Start & Critical Support**: Provides instantaneous spinning reserve if a diesel generator trips offline unexpectedly.
