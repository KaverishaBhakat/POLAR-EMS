"""
Unit & Integration Tests for 24-Hour Microgrid Energy Dispatch Optimizer (OR-Tools MILP).
Verifies generator commitment, battery constraints, critical-load protection,
and integrated Maitri PV historical-climatology solar generation dispatch.
"""

import os
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.optimization.dispatcher import (
    build_demonstration_scenario_inputs,
    optimize_24h_dispatch,
)

client = TestClient(app)


def test_scenario_builder_structure():
    """Verify scenario input structure and historical Maitri PV scenario loading."""
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    assert inputs["stationId"] == "MAITRI"
    assert inputs["isDemonstrationScenario"] is True
    assert inputs["horizonHours"] == 24
    assert len(inputs["demand"]) == 24
    assert len(inputs["solar"]) == 24
    assert len(inputs["pvAvailable"]) == 24
    assert len(inputs["wind"]) == 24
    assert len(inputs["timestamps"]) == 24
    assert inputs["criticalLoadKW"] == 42.5
    assert "scenarioMetadata" in inputs
    assert inputs["scenarioMetadata"]["scenario_type"] == "HISTORICAL_CLIMATOLOGY_SCENARIO"
    assert inputs["scenarioMetadata"]["pv_capacity_kw"] == 100.0
    assert inputs["scenarioMetadata"]["performance_ratio"] == 0.80


def test_optimizer_returns_24_hourly_results():
    """Verify 24-hour dispatch schedule execution and status."""
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )
    assert res["status"] == "SUCCESS"
    assert res["solverStatus"] in ["OPTIMAL", "FEASIBLE"]
    assert len(res["dispatch"]) == 24
    assert res["horizonHours"] == 24
    assert "scenarioMetadata" in res
    assert res["totalPVAvailableKWh"] > 0.0


def test_pv_dispatch_constraints_and_accounting():
    """
    Validation Test:
    1. PV available is never negative
    2. PV used <= PV available
    3. PV curtailed = PV available - PV used within tolerance
    4. PV used + PV curtailed = PV available within tolerance
    5. Total PV available equals the sum of the 24 scenario inputs
    """
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )

    expected_total_pv = sum(inputs["solar"])
    assert abs(res["totalPVAvailableKWh"] - expected_total_pv) < 1e-1, (
        f"Total PV available ({res['totalPVAvailableKWh']}) does not match input sum ({expected_total_pv})"
    )

    sum_pv_used = 0.0
    sum_pv_curt = 0.0

    for step in res["dispatch"]:
        pv_avail = step["pv_available_kW"]
        pv_used = step["pv_used_kW"]
        pv_curt = step["pv_curtailed_kW"]

        # 1. PV available is never negative
        assert pv_avail >= 0.0, f"Negative PV available at hour {step['hour']}: {pv_avail}"
        
        # 2. PV used <= PV available
        assert pv_used <= pv_avail + 1e-2, (
            f"PV used ({pv_used}) exceeded available ({pv_avail}) at hour {step['hour']}"
        )
        assert pv_used >= 0.0, f"Negative PV used at hour {step['hour']}: {pv_used}"
        assert pv_curt >= 0.0, f"Negative PV curtailed at hour {step['hour']}: {pv_curt}"

        # 3. PV curtailed = PV available - PV used within tolerance
        assert abs(pv_curt - (pv_avail - pv_used)) < 1e-2, (
            f"Curtailment mismatch at hour {step['hour']}: {pv_curt} vs {pv_avail - pv_used}"
        )

        # 4. PV used + PV curtailed = PV available within tolerance
        assert abs((pv_used + pv_curt) - pv_avail) < 1e-2, (
            f"Sum mismatch at hour {step['hour']}: {pv_used + pv_curt} vs {pv_avail}"
        )

        sum_pv_used += pv_used
        sum_pv_curt += pv_curt

    assert abs(res["totalPVUsedKWh"] - sum_pv_used) < 1e-1
    assert abs(res["totalPVCurtailedKWh"] - sum_pv_curt) < 1e-1


def test_power_balance_holds_every_hour():
    """Verify physical energy conservation holds across every hour."""
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )
    for step in res["dispatch"]:
        # Supply: G1 + G2 + PV_used + Wind_used + Battery_Discharge
        # Sinks: Load_served (demand - shed) + Battery_Charge
        supply = (
            step["generator1Power"] +
            step["generator2Power"] +
            step["pv_used_kW"] +
            step["wind_used_kW"] +
            step["battery_discharge_kW"]
        )
        served_load = step["load_kW"] - step["flexibleLoadShedding"]
        sink = served_load + step["battery_charge_kW"]

        assert abs(supply - sink) < 1e-2, (
            f"Power balance violated at {step['time']}: supply={supply} vs sink={sink}"
        )


def test_battery_soc_bounds():
    """Verify battery SOC stays strictly within [20%, 95%] at all times."""
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=75.0,
        station_id=inputs["stationId"],
    )
    assert res["minimumBatterySOC"] >= 20.0 - 1e-2
    assert res["maximumBatterySOC"] <= 95.0 + 1e-2
    for step in res["dispatch"]:
        assert step["battery_soc_percent"] >= 20.0 - 1e-2, f"SOC underflow at {step['time']}: {step['battery_soc_percent']}%"
        assert step["battery_soc_percent"] <= 95.0 + 1e-2, f"SOC overflow at {step['time']}: {step['battery_soc_percent']}%"


def test_battery_power_limits():
    """Verify battery charge and discharge power limits (80 kW max)."""
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )
    for step in res["dispatch"]:
        assert 0.0 <= step["battery_charge_kW"] <= 80.0 + 1e-2
        assert 0.0 <= step["battery_discharge_kW"] <= 80.0 + 1e-2


def test_generator_limits_and_minimum_output():
    """Verify generator operation respects unit minimum and maximum limits."""
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )
    for step in res["dispatch"]:
        p1 = step["generator1Power"]
        p2 = step["generator2Power"]
        # If G1 is on, must be in [20, 100]
        if p1 > 1e-2:
            assert p1 >= 20.0 - 1e-2, f"G1 violated minimum output: {p1} kW"
            assert p1 <= 100.0 + 1e-2, f"G1 exceeded maximum output: {p1} kW"
        # If G2 is on, must be in [15, 80]
        if p2 > 1e-2:
            assert p2 >= 15.0 - 1e-2, f"G2 violated minimum output: {p2} kW"
            assert p2 <= 80.0 + 1e-2, f"G2 exceeded maximum output: {p2} kW"


def test_critical_load_never_shed():
    """Verify non-sheddable critical life-support load (42.5 kW) is 100% served."""
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )
    assert res["criticalLoadReliabilityPercent"] == 100.0
    assert res["criticalLoadShedTotalKWh"] == 0.0
    for step in res["dispatch"]:
        assert step["criticalLoadProtected"] is True
        assert step["critical_load_shed_kW"] == 0.0
        served_load = step["load_kW"] - step["flexibleLoadShedding"]
        assert served_load >= 42.5 - 1e-2, f"Critical load compromised at {step['time']}: served {served_load} kW"


def test_optimizer_handles_renewable_surplus():
    """Verify optimizer handles large renewable surplus by charging battery and curtailing cleanly."""
    demand = [50.0] * 24
    solar = [80.0] * 24
    wind = [40.0] * 24
    res = optimize_24h_dispatch(
        demand=demand,
        solar=solar,
        wind=wind,
        initial_soc=75.0,
        station_id="MAITRI",
    )
    assert res["status"] == "SUCCESS"
    assert res["totalGeneratorEnergy"] < 1e-2  # Generators should remain off
    assert res["maximumBatterySOC"] <= 95.0 + 1e-2
    assert res["totalRenewableCurtailed"] > 0.0


def test_optimizer_handles_renewable_deficit():
    """Verify optimizer handles complete zero-renewable polar night with primary genset commitment."""
    demand = [75.0] * 24
    solar = [0.0] * 24
    wind = [0.0] * 24
    res = optimize_24h_dispatch(
        demand=demand,
        solar=solar,
        wind=wind,
        initial_soc=50.0,
        station_id="MAITRI",
    )
    assert res["status"] == "SUCCESS"
    assert res["totalGeneratorEnergy"] > 0.0
    assert res["minimumBatterySOC"] >= 20.0 - 1e-2


def test_fastapi_optimization_endpoint():
    """Test GET /optimization/dispatch/MAITRI returns valid MILP schedule with explicit PV and scenario metadata."""
    response = client.get("/optimization/dispatch/MAITRI?horizon_hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["stationId"] == "MAITRI"
    assert data["horizonHours"] == 24
    assert len(data["dispatch"]) == 24
    assert "objectiveValue" in data
    assert "totalEstimatedFuel" in data
    assert "totalPVAvailableKWh" in data
    assert "totalPVUsedKWh" in data
    assert "totalPVCurtailedKWh" in data
    assert "scenarioMetadata" in data
    assert data["scenarioMetadata"]["scenario_type"] == "HISTORICAL_CLIMATOLOGY_SCENARIO"
    assert data["scenarioMetadata"]["pv_capacity_kw"] == 100.0
    assert data["criticalLoadReliabilityPercent"] == 100.0

    # Spot check first dispatch point
    first_pt = data["dispatch"][0]
    assert "load_kW" in first_pt
    assert "pv_available_kW" in first_pt
    assert "pv_used_kW" in first_pt
    assert "pv_curtailed_kW" in first_pt
    assert "battery_charge_kW" in first_pt
    assert "battery_discharge_kW" in first_pt
    assert "generator_output_kW" in first_pt
    assert "battery_soc_percent" in first_pt
    assert "critical_load_kW" in first_pt
    assert "critical_load_shed_kW" in first_pt
