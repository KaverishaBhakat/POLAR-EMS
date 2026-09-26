"""
Simulation Runner & Resilience Engine for POLAR-EMS.

Executes baseline and what-if resilience scenarios against the core OR-Tools MILP optimizer,
calculates standardized resilience metrics, and produces side-by-side scenario comparisons.
"""

import copy
import logging
from typing import Dict, Any, Optional
import numpy as np

from app.optimization.dispatcher import (
    build_demonstration_scenario_inputs,
    optimize_24h_dispatch,
)
from app.simulation.scenarios import (
    get_scenario_definition,
    ScenarioId,
)

logger = logging.getLogger("polar_ems_ml.simulation")


def run_resilience_simulation(
    station_id: str = "MAITRI",
    scenario_id: str = "polar-night",
    horizon_hours: int = 24,
    initial_soc: float = 75.0,
) -> Dict[str, Any]:
    """
    Executes a resilience simulation scenario for the specified station.

    Workflow:
    1. Generates 24-hour baseline demonstration scenario inputs (Maitri solar + 2019 wind + demand).
    2. Runs OR-Tools MILP optimizer for baseline dispatch.
    3. Applies scenario-specific transformations (e.g. Polar Night: solar = [0.0]*24).
    4. Runs OR-Tools MILP optimizer for scenario dispatch.
    5. Computes transparent resilience metrics and baseline comparison.
    """
    norm_scenario_id = scenario_id.lower().replace("_", "-")
    scenario_def = get_scenario_definition(norm_scenario_id)

    if not scenario_def:
        return {
            "status": "ERROR",
            "message": f"Unknown or unregistered scenario: '{scenario_id}'. Available: ['polar-night']",
            "stationId": station_id.upper(),
        }

    # 1. Build 24-Hour Baseline Inputs
    baseline_inputs = build_demonstration_scenario_inputs(
        station_identifier=station_id,
        horizon_hours=horizon_hours,
        initial_soc=initial_soc,
    )

    # 2. Run Baseline Optimization
    baseline_result = optimize_24h_dispatch(
        demand=baseline_inputs["demand"],
        solar=baseline_inputs["solar"],
        wind=baseline_inputs["wind"],
        initial_soc=baseline_inputs["initialSOC"],
        station_id=station_id,
        timestamps=baseline_inputs["timestamps"],
        hours_labels=baseline_inputs["hours"],
        scenario_metadata=baseline_inputs.get("scenarioMetadata"),
        critical_load_kw=baseline_inputs.get("criticalLoadKW", 42.5),
    )

    if baseline_result.get("status") not in ["SUCCESS"]:
        return {
            "status": "ERROR",
            "message": f"Baseline optimization failed: {baseline_result.get('message')}",
            "stationId": station_id.upper(),
        }

    # 3. Apply Scenario Transformations
    scenario_inputs = copy.deepcopy(baseline_inputs)
    meta = dict(scenario_inputs.get("scenarioMetadata", {}))

    if norm_scenario_id == ScenarioId.POLAR_NIGHT.value:
        # Polar Night Transformation: Solar PV forced to 0.0 kW for all 24 hours
        scenario_inputs["solar"] = [0.0] * horizon_hours
        scenario_inputs["pvAvailable"] = [0.0] * horizon_hours
        
        meta["scenario_type"] = "POLAR_NIGHT"
        meta["scenario_id"] = ScenarioId.POLAR_NIGHT.value
        meta["pv_mode"] = "POLAR_NIGHT_ZERO_SOLAR"
        meta["pv_modification"] = "PV forced to 0.0 kW for all 24 hours"
        meta["source_description"] = (
            "Polar Night What-If Simulation: 0 kW solar generation with active 2019 Maitri wind co-generation "
            "and primary diesel unit commitment."
        )

    scenario_inputs["scenarioMetadata"] = meta

    # 4. Run Scenario Optimization
    scenario_result = optimize_24h_dispatch(
        demand=scenario_inputs["demand"],
        solar=scenario_inputs["solar"],
        wind=scenario_inputs["wind"],
        initial_soc=scenario_inputs["initialSOC"],
        station_id=station_id,
        timestamps=scenario_inputs["timestamps"],
        hours_labels=scenario_inputs["hours"],
        scenario_metadata=scenario_inputs.get("scenarioMetadata"),
        critical_load_kw=scenario_inputs.get("criticalLoadKW", 42.5),
    )

    if scenario_result.get("status") not in ["SUCCESS"]:
        return {
            "status": "ERROR",
            "message": f"Scenario optimization failed: {scenario_result.get('message')}",
            "stationId": station_id.upper(),
            "scenario": scenario_def.dict(),
        }

    # 5. Calculate Standard Resilience Metrics
    total_demand_kwh = round(float(sum(scenario_inputs["demand"])), 2)
    total_pv_avail = float(scenario_result.get("totalPVAvailableKWh", 0.0))
    total_wind_avail = round(float(sum(scenario_inputs["wind"])), 2)
    total_renew_avail = round(total_pv_avail + total_wind_avail, 2)
    total_renew_used = float(scenario_result.get("totalRenewableUsed", 0.0))
    total_gen_energy = float(scenario_result.get("totalGeneratorEnergy", 0.0))
    total_batt_chg = float(scenario_result.get("totalBatteryCharge", 0.0))
    total_batt_dis = float(scenario_result.get("totalBatteryDischarge", 0.0))
    fuel_liters = float(scenario_result.get("totalEstimatedFuel", 0.0))
    gen_hours = int(scenario_result.get("generatorCommittedHours", 0))
    min_soc = float(scenario_result.get("minimumBatterySOC", 20.0))
    max_soc = float(scenario_result.get("maximumBatterySOC", 95.0))
    crit_shed = float(scenario_result.get("criticalLoadShedTotalKWh", 0.0))
    crit_reliability = float(scenario_result.get("criticalLoadReliabilityPercent", 100.0))
    renew_util_pct = float(scenario_result.get("renewableUtilizationPercent", 100.0))

    # Transparent Resilience Rule
    # If critical load shedding is strictly 0.0, life support is PROTECTED; otherwise AT_RISK
    critical_load_status = "PROTECTED" if crit_shed <= 1e-3 else "AT_RISK"
    resilience_status = critical_load_status

    resilience_metrics = {
        "scenario_name": scenario_def.scenario_name,
        "scenario_id": scenario_def.scenario_id,
        "scenario_type": scenario_def.scenario_type,
        "data_classification": "SCENARIO",
        "is_demonstration_scenario": True,
        "resilience_status": resilience_status,
        "critical_load_status": critical_load_status,
        "total_demand_kwh": total_demand_kwh,
        "total_renewable_available_kwh": total_renew_avail,
        "total_renewable_used_kwh": total_renew_used,
        "total_pv_available_kwh": total_pv_avail,
        "total_wind_available_kwh": total_wind_avail,
        "total_generator_energy_kwh": total_gen_energy,
        "total_battery_charge_kwh": total_batt_chg,
        "total_battery_discharge_kwh": total_batt_dis,
        "minimum_battery_soc_percent": min_soc,
        "maximum_battery_soc_percent": max_soc,
        "generator_runtime_hours": gen_hours,
        "estimated_fuel_liters": fuel_liters,
        "total_critical_load_shed_kwh": crit_shed,
        "critical_load_reliability_percent": crit_reliability,
        "renewable_utilization_percent": renew_util_pct,
    }

    # 6. Side-by-Side Comparison against Baseline
    b_fuel = float(baseline_result.get("totalEstimatedFuel", 0.0))
    b_gen = float(baseline_result.get("totalGeneratorEnergy", 0.0))
    b_dis = float(baseline_result.get("totalBatteryDischarge", 0.0))
    b_chg = float(baseline_result.get("totalBatteryCharge", 0.0))
    b_renew = float(baseline_result.get("totalRenewableGenerated", 0.0))
    b_pv = float(baseline_result.get("totalPVAvailableKWh", 0.0))
    b_wind = round(float(sum(baseline_inputs["wind"])), 2)
    b_shed = float(baseline_result.get("criticalLoadShedTotalKWh", 0.0))
    b_rel = float(baseline_result.get("criticalLoadReliabilityPercent", 100.0))
    b_gen_hours = int(baseline_result.get("generatorCommittedHours", 0))

    def _calc_pct_delta(scen_val: float, base_val: float) -> Optional[float]:
        if abs(base_val) > 1e-4:
            return round(((scen_val - base_val) / base_val) * 100.0, 1)
        return None

    comparison = {
        "fuel_consumption_liters": {
            "baseline": b_fuel,
            "scenario": fuel_liters,
            "absolute_delta": round(fuel_liters - b_fuel, 2),
            "percent_delta": _calc_pct_delta(fuel_liters, b_fuel),
        },
        "generator_energy_kwh": {
            "baseline": b_gen,
            "scenario": total_gen_energy,
            "absolute_delta": round(total_gen_energy - b_gen, 2),
            "percent_delta": _calc_pct_delta(total_gen_energy, b_gen),
        },
        "generator_runtime_hours": {
            "baseline": b_gen_hours,
            "scenario": gen_hours,
            "absolute_delta": gen_hours - b_gen_hours,
            "percent_delta": _calc_pct_delta(float(gen_hours), float(b_gen_hours)),
        },
        "battery_discharge_kwh": {
            "baseline": b_dis,
            "scenario": total_batt_dis,
            "absolute_delta": round(total_batt_dis - b_dis, 2),
            "percent_delta": _calc_pct_delta(total_batt_dis, b_dis),
        },
        "battery_charge_kwh": {
            "baseline": b_chg,
            "scenario": total_batt_chg,
            "absolute_delta": round(total_batt_chg - b_chg, 2),
            "percent_delta": _calc_pct_delta(total_batt_chg, b_chg),
        },
        "pv_available_kwh": {
            "baseline": b_pv,
            "scenario": total_pv_avail,
            "absolute_delta": round(total_pv_avail - b_pv, 2),
            "percent_delta": _calc_pct_delta(total_pv_avail, b_pv),
        },
        "wind_available_kwh": {
            "baseline": b_wind,
            "scenario": total_wind_avail,
            "absolute_delta": round(total_wind_avail - b_wind, 2),
            "percent_delta": _calc_pct_delta(total_wind_avail, b_wind),
        },
        "total_renewable_energy_kwh": {
            "baseline": b_renew,
            "scenario": total_renew_avail,
            "absolute_delta": round(total_renew_avail - b_renew, 2),
            "percent_delta": _calc_pct_delta(total_renew_avail, b_renew),
        },
        "critical_load_shed_kwh": {
            "baseline": b_shed,
            "scenario": crit_shed,
            "absolute_delta": round(crit_shed - b_shed, 2),
            "percent_delta": 0.0 if (b_shed == 0 and crit_shed == 0) else _calc_pct_delta(crit_shed, b_shed),
        },
        "critical_load_reliability_percent": {
            "baseline": b_rel,
            "scenario": crit_reliability,
            "absolute_delta": round(crit_reliability - b_rel, 1),
            "percent_delta": _calc_pct_delta(crit_reliability, b_rel),
        }
    }

    return {
        "status": "SUCCESS",
        "stationId": station_id.upper(),
        "horizonHours": horizon_hours,
        "isDemonstrationScenario": True,
        "scenario": scenario_def.model_dump() if hasattr(scenario_def, "model_dump") else scenario_def.dict(),
        "resilienceMetrics": resilience_metrics,
        "comparison": comparison,
        "dispatch": scenario_result.get("dispatch", []),
        "objectiveValue": scenario_result.get("objectiveValue"),
        "solverStatus": scenario_result.get("solverStatus"),
        "recommendation": (
            f"Under the modeled {scenario_def.scenario_name} scenario with 0 kW solar generation, "
            f"the microgrid remains {critical_load_status} with {crit_reliability}% critical-load reliability. "
            f"Diesel generator fuel consumption increases from {b_fuel:.1f} L to {fuel_liters:.1f} L "
            f"(+{fuel_liters - b_fuel:.1f} L) across {gen_hours} committed runtime hours to compensate for the solar deficit."
        )
    }
