"""
Unit & Integration Tests for 24-Hour Microgrid Energy Dispatch Optimizer (OR-Tools MILP).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.optimization.dispatcher import (
    build_demonstration_scenario_inputs,
    optimize_24h_dispatch,
)

client = TestClient(app)


def test_scenario_builder_structure():
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    assert inputs["stationId"] == "MAITRI"
    assert inputs["isDemonstrationScenario"] is True
    assert inputs["horizonHours"] == 24
    assert len(inputs["demand"]) == 24
    assert len(inputs["solar"]) == 24
    assert len(inputs["wind"]) == 24
    assert len(inputs["timestamps"]) == 24
    assert inputs["criticalLoadKW"] == 42.5


def test_optimizer_returns_24_hourly_results():
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


def test_power_balance_holds_every_hour():
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )
    for step in res["dispatch"]:
        # Generation + Renewables + Discharge = Demand - Shed + Charge + Curtailment
        supply = step["generator1Power"] + step["generator2Power"] + step["renewable"] + step["batteryDischarge"]
        demand_sink = (step["demand"] - step["flexibleLoadShedding"]) + step["batteryCharge"] + step["renewableCurtailment"]
        assert abs(supply - demand_sink) < 1e-2, f"Power balance violated at {step['time']}: {supply} vs {demand_sink}"


def test_battery_soc_bounds():
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
        assert step["batterySOC"] >= 20.0 - 1e-2, f"SOC underflow at {step['time']}: {step['batterySOC']}%"
        assert step["batterySOC"] <= 95.0 + 1e-2, f"SOC overflow at {step['time']}: {step['batterySOC']}%"


def test_battery_power_limits():
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )
    for step in res["dispatch"]:
        assert 0.0 <= step["batteryCharge"] <= 80.0 + 1e-2
        assert 0.0 <= step["batteryDischarge"] <= 80.0 + 1e-2


def test_generator_limits_and_minimum_output():
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
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )
    assert res["criticalLoadReliabilityPercent"] == 100.0
    for step in res["dispatch"]:
        assert step["criticalLoadProtected"] is True
        # Served load (demand - flexibleLoadShedding) must exceed critical load (42.5 kW)
        served_load = step["demand"] - step["flexibleLoadShedding"]
        assert served_load >= 42.5 - 1e-2, f"Critical load compromised at {step['time']}: served {served_load} kW"


def test_optimizer_handles_renewable_surplus():
    # Massive renewable surplus scenario
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
    # Battery will charge up to 95% and excess will be curtailed cleanly
    assert res["maximumBatterySOC"] <= 95.0 + 1e-2
    assert res["totalRenewableCurtailed"] > 0.0  # Surplus beyond 80 kW charge power/capacity is curtailed


def test_optimizer_handles_renewable_deficit():
    # Complete zero-renewable polar winter scenario
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
    assert res["totalGeneratorEnergy"] > 0.0  # Generators must dispatch
    assert res["minimumBatterySOC"] >= 20.0 - 1e-2  # Battery stays protected above 20%


def test_fastapi_optimization_endpoint():
    response = client.get("/optimization/dispatch/MAITRI?horizon_hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["stationId"] == "MAITRI"
    assert data["horizonHours"] == 24
    assert len(data["dispatch"]) == 24
    assert "objectiveValue" in data
    assert "totalEstimatedFuel" in data
    assert data["criticalLoadReliabilityPercent"] == 100.0
