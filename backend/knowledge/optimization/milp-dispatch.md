---
documentId: "optimization-milp-dispatch"
title: "24-Hour MILP Microgrid Unit Commitment & Economic Dispatch"
category: "OPTIMIZATION"
station: "ALL"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "MODELED / SCENARIO"
version: "1.0"
source: "ml-service/app/optimization/dispatcher.py"
---

# 24-Hour MILP Microgrid Optimization in POLAR-EMS

## 1. Formulation and Solver Architecture
POLAR-EMS uses **Mixed-Integer Linear Programming (MILP)** solved via **Google OR-Tools** (using SCIP / CBC backend engines) to compute the globally optimal 24-hour lookahead unit commitment and economic dispatch schedule.

## 2. Objective Function
The optimizer minimizes total operational cost across the 24-hour horizon:

$$\min \sum_{t=1}^{24} \left[ C_{\text{fuel}}(P_{\text{gen},1}(t), P_{\text{gen},2}(t)) + C_{\text{start}} \cdot v_{\text{start}}(t) + \lambda_{\text{curtail}} \cdot P_{\text{curtail}}(t) + M_{\text{shed}} \cdot P_{\text{shed}}(t) \right]$$

Where:
- $C_{\text{fuel}}$: Marginal fuel cost for operating generators.
- $C_{\text{start}}$: Start-up wear-and-tear penalty to prevent frequent start/stop thermal cycling.
- $\lambda_{\text{curtail}}$: Minor penalty on renewable curtailment to maximize clean energy utilization.
- $M_{\text{shed}}$: Massive penalty ($10^5$) on any critical load shedding.

## 3. Core Operational Constraints
1. **Power Balance Constraint**:
   $$P_{\text{load}}(t) - P_{\text{shed}}(t) = P_{\text{pv,used}}(t) + P_{\text{wind,used}}(t) + P_{\text{discharge}}(t) - P_{\text{charge}}(t) + \sum_i P_{\text{gen},i}(t)$$
2. **Renewable Resource Availability**:
   $$0 \le P_{\text{pv,used}}(t) \le P_{\text{pv,avail}}(t)$$
   $$0 \le P_{\text{wind,used}}(t) \le P_{\text{wind,avail}}(t)$$
3. **Battery Storage Dynamics & Limits**:
   $$\text{SOC}(t+1) = \text{SOC}(t) + \frac{\eta_c P_{\text{charge}}(t) - P_{\text{discharge}}(t)/\eta_d}{E_{\text{rated}}} \Delta t$$
   $$20\% \le \text{SOC}(t) \le 95\%$$
   $$0 \le P_{\text{charge}}(t) \le 80\text{ kW}, \quad 0 \le P_{\text{discharge}}(t) \le 80\text{ kW}$$
4. **Generator Commitment & Minimum Loading**:
   $$u_i(t) \cdot P_{\min,i} \le P_{\text{gen},i}(t) \le u_i(t) \cdot P_{\max,i}$$
   $$u_i(t) \in \{0, 1\}$$
5. **Critical Load Protection**:
   $$P_{\text{critical}} \le P_{\text{load}}(t) - P_{\text{shed}}(t)$$

## 4. Key Performance Indicators (KPIs)
- Fuel Savings: $\approx 15\% - 25\%$ compared to unmanaged baseline diesel dispatch.
- Renewable Utilization: Achieves $95\% - 100\%$ utilization of available solar and wind energy.
- Generator Runtime Reduction: Avoids unnecessary secondary generator firing by using battery energy buffering.
