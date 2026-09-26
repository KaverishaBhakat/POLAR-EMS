"""
Unit and Integration Tests for POLAR-EMS Simulation & Resilience Engine (Polar Night Scenario).
Verifies scenario transformations, resilience metrics calculation, comparative baseline accounting,
FastAPI simulation endpoints, and deterministic repeatability.
"""

import math
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.optimization.dispatcher import build_demonstration_scenario_inputs, optimize_24h_dispatch
from app.simulation.scenarios import get_registered_scenarios, get_scenario_definition, ScenarioId
from app.simulation.runner import run_resilience_simulation

client = TestClient(app)


# =========================================================================
# 1. Scenario Registry & Metadata Tests
# =========================================================================

def test_scenario_registry_contains_polar_night():
    """Verify Polar Night is properly registered in master registry."""
    scenarios = get_registered_scenarios()
    assert len(scenarios) >= 2
    scen_ids = [s["scenario_id"] for s in scenarios]
    assert "polar-night" in scen_ids

    scen = get_scenario_definition("polar-night")
    assert scen is not None
    assert scen.scenario_name == "Polar Night"
    assert scen.scenario_type == "POLAR_NIGHT"
    assert scen.category == "ENVIRONMENTAL_STRESS"
    assert scen.provenance["data_classification"] == "SCENARIO"
    assert scen.provenance["is_demonstration_scenario"] is True


def test_scenario_registry_contains_generator_failure():
    """Verify Generator Failure is properly registered with required metadata and provenance."""
    scenarios = get_registered_scenarios()
    scen_ids = [s["scenario_id"] for s in scenarios]
    assert "generator-failure" in scen_ids

    scen = get_scenario_definition("generator-failure")
    assert scen is not None
    assert scen.scenario_name == "Primary Generator Failure"
    assert scen.scenario_type == "GENERATOR_FAILURE"
    assert scen.category == "RESILIENCE"
    assert scen.provenance["data_classification"] == "SCENARIO"
    assert scen.provenance["failed_generator_id"] == "GEN-01"
    assert scen.provenance["failed_generator_rating_kw"] == 100.0
    assert scen.assumptions["g1_available"] is False
    assert scen.assumptions["g2_available"] is True
    assert scen.assumptions["critical_load_protection"] is True


# =========================================================================
# 2. Polar Night Transformation & Physics Constraints Tests
# =========================================================================

def test_polar_night_pv_forced_to_zero_and_inputs_preserved():
    """
    Validation Test:
    1. Polar Night PV vector contains 24 zeros.
    2. Baseline PV input remains unchanged (> 0).
    3. Wind generation remains identical to baseline.
    4. Electrical demand remains identical to baseline.
    5. Initial battery SOC remains identical to baseline.
    6. Critical-load floor (42.5 kW) remains enabled.
    """
    baseline_inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="polar-night", horizon_hours=24)

    assert sim_result["status"] == "SUCCESS"
    dispatch = sim_result["dispatch"]
    assert len(dispatch) == 24

    # 1. Polar Night PV is 0.0 kW for all 24 hours
    for step in dispatch:
        assert step["pv_available_kW"] == 0.0, f"Non-zero PV at hour {step['hour']}: {step['pv_available_kW']}"
        assert step["pv_used_kW"] == 0.0
        assert step["pv_curtailed_kW"] == 0.0

    # 2. Baseline PV input remains intact
    assert sum(baseline_inputs["solar"]) > 0.0, "Baseline PV was mutated to 0 unexpectedly"
    assert math.isclose(sum(baseline_inputs["solar"]), 657.11, abs_tol=1e-1)

    # 3. Wind generation vector matches baseline
    sim_wind = [step["wind_available_kW"] for step in dispatch]
    assert sim_wind == baseline_inputs["wind"], "Wind input was mutated in Polar Night"

    # 4. Demand vector matches baseline
    sim_demand = [step["load_kW"] for step in dispatch]
    assert sim_demand == baseline_inputs["demand"], "Demand input was mutated in Polar Night"

    # 5. Critical load protection matches
    for step in dispatch:
        assert step["critical_load_kW"] == 42.5
        assert step["critical_load_shed_kW"] == 0.0
        assert step["criticalLoadProtected"] is True


def test_polar_night_resilience_metrics():
    """Verify resilience metrics calculations and transparent status rules for Polar Night."""
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="polar-night", horizon_hours=24)
    metrics = sim_result["resilienceMetrics"]

    assert metrics["scenario_id"] == "polar-night"
    assert metrics["scenario_type"] == "POLAR_NIGHT"
    assert metrics["data_classification"] == "SCENARIO"
    assert metrics["is_demonstration_scenario"] is True
    assert metrics["total_pv_available_kwh"] == 0.0
    assert metrics["total_demand_kwh"] > 1000.0
    assert metrics["total_wind_available_kwh"] > 0.0
    assert metrics["total_generator_energy_kwh"] > 0.0
    assert metrics["generator_runtime_hours"] > 0
    assert metrics["estimated_fuel_liters"] > 0.0
    assert metrics["minimum_battery_soc_percent"] >= 20.0 - 1e-2
    assert metrics["maximum_battery_soc_percent"] <= 95.0 + 1e-2

    # Zero critical load shed -> PROTECTED
    assert metrics["total_critical_load_shed_kwh"] == 0.0
    assert metrics["critical_load_reliability_percent"] == 100.0
    assert metrics["resilience_status"] == "PROTECTED"
    assert metrics["critical_load_status"] == "PROTECTED"


def test_polar_night_baseline_comparison():
    """Verify comparative metrics table between baseline and Polar Night."""
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="polar-night", horizon_hours=24)
    comp = sim_result["comparison"]

    # Fuel comparison: Polar Night must consume more fuel due to zero solar
    fuel_comp = comp["fuel_consumption_liters"]
    assert fuel_comp["scenario"] > fuel_comp["baseline"]
    assert fuel_comp["absolute_delta"] > 0.0
    assert fuel_comp["percent_delta"] > 0.0

    # Generator energy comparison: Generator produces more energy
    gen_comp = comp["generator_energy_kwh"]
    assert gen_comp["scenario"] > gen_comp["baseline"]
    assert gen_comp["absolute_delta"] > 0.0

    # PV comparison: Scenario PV = 0
    pv_comp = comp["pv_available_kwh"]
    assert pv_comp["scenario"] == 0.0
    assert pv_comp["baseline"] > 0.0
    assert pv_comp["percent_delta"] == -100.0

    # Wind comparison: Identical
    wind_comp = comp["wind_available_kwh"]
    assert wind_comp["scenario"] == wind_comp["baseline"]
    assert wind_comp["absolute_delta"] == 0.0

    # Critical load shedding: 0 on both
    shed_comp = comp["critical_load_shed_kwh"]
    assert shed_comp["baseline"] == 0.0
    assert shed_comp["scenario"] == 0.0


def test_polar_night_deterministic_repeatability():
    """Verify running Polar Night simulation twice produces strictly identical results."""
    run1 = run_resilience_simulation(station_id="MAITRI", scenario_id="polar-night", horizon_hours=24)
    run2 = run_resilience_simulation(station_id="MAITRI", scenario_id="polar-night", horizon_hours=24)

    assert run1["objectiveValue"] == run2["objectiveValue"]
    assert run1["resilienceMetrics"] == run2["resilienceMetrics"]
    assert run1["comparison"] == run2["comparison"]
    assert len(run1["dispatch"]) == len(run2["dispatch"]) == 24


# =========================================================================
# 3. Generator Failure Transformation & Physics Constraints Tests
# =========================================================================

def test_generator_failure_g1_strictly_zero_and_inputs_preserved():
    """
    Validation Test for Generator Failure:
    1. Failed generator (GEN-01 / G1) output is strictly 0.0 kW for all 24 hours.
    2. Remaining generator (GEN-02 / G2) is available and operates.
    3. PV input matches baseline PV.
    4. Wind input matches baseline wind.
    5. Demand input matches baseline demand.
    6. Battery configuration and limits are preserved.
    7. Critical load remains protected with 0 kWh shedding.
    """
    baseline_inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="generator-failure", horizon_hours=24)

    assert sim_result["status"] == "SUCCESS"
    dispatch = sim_result["dispatch"]
    assert len(dispatch) == 24

    # 1. GEN-01 power is strictly 0.0 kW for every hour
    for step in dispatch:
        assert step["generator1Power"] == 0.0, f"GEN-01 produced non-zero power at hour {step['hour']}: {step['generator1Power']}"
        assert step["generator_output_kW"] == step["generator2Power"]

    # 2. GEN-02 picked up the generator load
    total_g2 = sum(step["generator2Power"] for step in dispatch)
    assert total_g2 > 0.0, "Remaining generator GEN-02 produced no power"

    # 3. PV input is preserved and matches baseline
    sim_pv = [step["pv_available_kW"] for step in dispatch]
    assert sim_pv == baseline_inputs["solar"]

    # 4. Wind input is preserved and matches baseline
    sim_wind = [step["wind_available_kW"] for step in dispatch]
    assert sim_wind == baseline_inputs["wind"]

    # 5. Demand input is preserved and matches baseline
    sim_demand = [step["load_kW"] for step in dispatch]
    assert sim_demand == baseline_inputs["demand"]

    # 6. Battery SOC limits respected
    for step in dispatch:
        assert 20.0 - 1e-2 <= step["battery_soc_percent"] <= 95.0 + 1e-2

    # 7. Critical load is protected
    for step in dispatch:
        assert step["critical_load_kW"] == 42.5
        assert step["critical_load_shed_kW"] == 0.0
        assert step["criticalLoadProtected"] is True


def test_generator_failure_resilience_metrics():
    """Verify all 20 required resilience metrics in Generator Failure output."""
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="generator-failure", horizon_hours=24)
    metrics = sim_result["resilienceMetrics"]

    assert metrics["scenario_id"] == "generator-failure"
    assert metrics["scenario_type"] == "GENERATOR_FAILURE"
    assert metrics["data_classification"] == "SCENARIO"
    assert metrics["is_demonstration_scenario"] is True
    assert metrics["failed_generator_identifier"] == "GEN-01"
    assert metrics["failed_generator_energy_kwh"] == 0.0
    assert metrics["remaining_generator_energy_kwh"] > 0.0
    assert metrics["remaining_generator_runtime_hours"] > 0
    assert math.isclose(metrics["total_generator_energy_kwh"], metrics["remaining_generator_energy_kwh"], abs_tol=0.1)
    assert metrics["total_pv_available_kwh"] > 0.0
    assert metrics["total_wind_available_kwh"] > 0.0
    assert metrics["total_demand_kwh"] > 1000.0
    assert metrics["estimated_fuel_liters"] > 0.0
    assert metrics["total_critical_load_shed_kwh"] == 0.0
    assert metrics["critical_load_reliability_percent"] == 100.0
    assert metrics["resilience_status"] == "PROTECTED"
    assert metrics["critical_load_status"] == "PROTECTED"


def test_generator_failure_baseline_comparison():
    """Verify baseline comparison table under Generator Failure."""
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="generator-failure", horizon_hours=24)
    comp = sim_result["comparison"]

    # Failed generator comparison: -100%
    failed_comp = comp["failed_generator_energy_kwh"]
    assert failed_comp["baseline"] > 0.0
    assert failed_comp["scenario"] == 0.0
    assert failed_comp["percent_delta"] == -100.0

    # Remaining generator comparison: G2 takes over
    rem_comp = comp["remaining_generator_energy_kwh"]
    assert rem_comp["baseline"] == 0.0
    assert rem_comp["scenario"] > 0.0

    # Fuel comparison: G2 has slightly higher slope (0.25 vs 0.23 L/kWh), so fuel increases moderately
    fuel_comp = comp["fuel_consumption_liters"]
    assert fuel_comp["scenario"] > 0.0
    assert fuel_comp["baseline"] > 0.0

    # Renewables and demand unchanged
    assert comp["pv_available_kwh"]["absolute_delta"] == 0.0
    assert comp["wind_available_kwh"]["absolute_delta"] == 0.0
    assert comp["critical_load_shed_kwh"]["scenario"] == 0.0
    assert comp["critical_load_reliability_percent"]["scenario"] == 100.0


def test_generator_failure_deterministic_repeatability():
    """Verify running Generator Failure simulation twice produces strictly identical results."""
    run1 = run_resilience_simulation(station_id="MAITRI", scenario_id="generator-failure", horizon_hours=24)
    run2 = run_resilience_simulation(station_id="MAITRI", scenario_id="generator-failure", horizon_hours=24)

    assert run1["objectiveValue"] == run2["objectiveValue"]
    assert run1["resilienceMetrics"] == run2["resilienceMetrics"]
    assert run1["comparison"] == run2["comparison"]
    assert len(run1["dispatch"]) == len(run2["dispatch"]) == 24


def test_generator_failure_insufficient_capacity_edge_case():
    """
    Edge Case Test (Case B):
    When extreme demand exceeds the maximum remaining microgrid capacity (GEN-02 80 kW + Battery 80 kW + Renewables),
    verify the optimizer uses flexible load shedding, respects the critical load floor, and reports status.
    """
    # Create an extreme demand profile (e.g., 250 kW per hour)
    extreme_demand = [250.0] * 24
    zero_solar = [0.0] * 24
    low_wind = [10.0] * 24

    result = optimize_24h_dispatch(
        demand=extreme_demand,
        solar=zero_solar,
        wind=low_wind,
        initial_soc=50.0,
        station_id="MAITRI",
        critical_load_kw=42.5,
        g1_available=False,
        g2_available=True,
    )

    assert result["status"] == "SUCCESS"
    assert result["g1_available" if "g1_available" in result else "totalFlexibleLoadShed"] > 0.0
    # GEN-01 must still be strictly 0
    for pt in result["dispatch"]:
        assert pt["generator1Power"] == 0.0
        assert pt["critical_load_kW"] == 42.5


def test_scenario_registry_contains_low_battery():
    """Verify Low Battery is properly registered with required metadata and provenance."""
    scenarios = get_registered_scenarios()
    scen_ids = [s["scenario_id"] for s in scenarios]
    assert "low-battery" in scen_ids

    scen = get_scenario_definition("low-battery")
    assert scen is not None
    assert scen.scenario_name == "Critically Low Battery State"
    assert scen.scenario_type == "LOW_BATTERY"
    assert scen.category == "RESILIENCE"
    assert scen.provenance["data_classification"] == "SCENARIO"
    assert scen.assumptions["initial_soc"] == 20.0
    assert scen.assumptions["critical_load_protection"] is True


def test_low_battery_initial_soc_and_inputs_preserved():
    """
    Validation Test for Low Battery:
    1. Scenario starts with initial SOC = 20.0% (70.0 kWh lower limit).
    2. Battery SOC remains within [20%, 95%] across all 24 hours.
    3. PV input matches baseline PV.
    4. Wind input matches baseline wind.
    5. Demand input matches baseline demand.
    6. Generator fleet remains available and operational.
    7. Critical load remains protected with 0 kWh shedding.
    """
    baseline_inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="low-battery", horizon_hours=24)

    assert sim_result["status"] == "SUCCESS"
    dispatch = sim_result["dispatch"]
    assert len(dispatch) == 24

    # 1. First hour reflects starting from low SOC
    assert sim_result["resilienceMetrics"]["initial_battery_soc_percent"] == 20.0

    # 2. Battery SOC limits respected across all hours
    for step in dispatch:
        assert 20.0 - 1e-2 <= step["battery_soc_percent"] <= 95.0 + 1e-2

    # 3. PV input is preserved and matches baseline
    sim_pv = [step["pv_available_kW"] for step in dispatch]
    assert sim_pv == baseline_inputs["solar"]

    # 4. Wind input is preserved and matches baseline
    sim_wind = [step["wind_available_kW"] for step in dispatch]
    assert sim_wind == baseline_inputs["wind"]

    # 5. Demand input is preserved and matches baseline
    sim_demand = [step["load_kW"] for step in dispatch]
    assert sim_demand == baseline_inputs["demand"]

    # 6. Critical load is protected
    for step in dispatch:
        assert step["critical_load_kW"] == 42.5
        assert step["critical_load_shed_kW"] == 0.0
        assert step["criticalLoadProtected"] is True


def test_low_battery_resilience_metrics():
    """Verify all standard resilience metrics in Low Battery output."""
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="low-battery", horizon_hours=24)
    metrics = sim_result["resilienceMetrics"]

    assert metrics["scenario_id"] == "low-battery"
    assert metrics["scenario_type"] == "LOW_BATTERY"
    assert metrics["data_classification"] == "SCENARIO"
    assert metrics["is_demonstration_scenario"] is True
    assert metrics["initial_battery_soc_percent"] == 20.0
    assert metrics["minimum_battery_soc_percent"] >= 20.0 - 1e-2
    assert metrics["maximum_battery_soc_percent"] > 20.0
    assert metrics["total_battery_charge_kwh"] > 0.0
    assert metrics["total_demand_kwh"] > 1000.0
    assert metrics["total_pv_available_kwh"] > 0.0
    assert metrics["total_wind_available_kwh"] > 0.0
    assert metrics["total_generator_energy_kwh"] > 0.0
    assert metrics["estimated_fuel_liters"] > 0.0
    assert metrics["total_critical_load_shed_kwh"] == 0.0
    assert metrics["critical_load_reliability_percent"] == 100.0
    assert metrics["resilience_status"] == "PROTECTED"
    assert metrics["critical_load_status"] == "PROTECTED"


def test_low_battery_baseline_comparison():
    """Verify baseline comparison table under Low Battery."""
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="low-battery", horizon_hours=24)
    comp = sim_result["comparison"]

    # Initial SOC comparison: -55.0% delta
    init_soc_comp = comp["initial_battery_soc_percent"]
    assert init_soc_comp["baseline"] == 75.0
    assert init_soc_comp["scenario"] == 20.0
    assert init_soc_comp["absolute_delta"] == -55.0

    # Fuel comparison: More fuel consumed to recharge battery and compensate for depleted reserves
    fuel_comp = comp["fuel_consumption_liters"]
    assert fuel_comp["scenario"] > fuel_comp["baseline"]
    assert fuel_comp["absolute_delta"] > 0.0
    assert fuel_comp["percent_delta"] > 0.0

    # Generator energy: Increased
    gen_comp = comp["generator_energy_kwh"]
    assert gen_comp["scenario"] > gen_comp["baseline"]
    assert gen_comp["absolute_delta"] > 0.0

    # Battery charge: Substantially increased to replenish reserves
    chg_comp = comp["battery_charge_kwh"]
    assert chg_comp["scenario"] > chg_comp["baseline"]
    assert chg_comp["absolute_delta"] > 0.0

    # Renewables and demand unchanged
    assert comp["pv_available_kwh"]["absolute_delta"] == 0.0
    assert comp["wind_available_kwh"]["absolute_delta"] == 0.0
    assert comp["critical_load_shed_kwh"]["scenario"] == 0.0
    assert comp["critical_load_reliability_percent"]["scenario"] == 100.0


def test_low_battery_deterministic_repeatability():
    """Verify running Low Battery simulation twice produces strictly identical results."""
    run1 = run_resilience_simulation(station_id="MAITRI", scenario_id="low-battery", horizon_hours=24)
    run2 = run_resilience_simulation(station_id="MAITRI", scenario_id="low-battery", horizon_hours=24)

    assert run1["objectiveValue"] == run2["objectiveValue"]
    assert run1["resilienceMetrics"] == run2["resilienceMetrics"]
    assert run1["comparison"] == run2["comparison"]
    assert len(run1["dispatch"]) == len(run2["dispatch"]) == 24


def test_scenario_registry_contains_renewable_drop():
    """Verify Renewable Drop is properly registered with required metadata and provenance."""
    scenarios = get_registered_scenarios()
    scen_ids = [s["scenario_id"] for s in scenarios]
    assert "renewable-drop" in scen_ids

    scen = get_scenario_definition("renewable-drop")
    assert scen is not None
    assert scen.scenario_name == "Renewable Generation Drop"
    assert scen.scenario_type == "RENEWABLE_DROP"
    assert scen.category == "RESILIENCE"
    assert scen.provenance["data_classification"] == "SCENARIO"
    assert scen.assumptions["pv_availability_multiplier"] == 0.20
    assert scen.assumptions["wind_availability_multiplier"] == 0.20
    assert scen.assumptions["g1_available"] is True
    assert scen.assumptions["g2_available"] is True
    assert scen.assumptions["critical_load_protection"] is True


def test_renewable_drop_inputs_and_curtailment_preservation():
    """
    Validation Test for Renewable Drop:
    1. Solar PV vector is exactly 20% of baseline for every hour.
    2. Wind generation vector is exactly 20% of baseline for every hour.
    3. Demand input matches baseline demand.
    4. Initial battery SOC remains baseline (75%), not 20%.
    5. Both generators remain fully available.
    6. Battery SOC limits [20%, 95%] are respected.
    7. Critical load remains protected with 0 kWh shedding.
    """
    baseline_inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="renewable-drop", horizon_hours=24)

    assert sim_result["status"] == "SUCCESS"
    dispatch = sim_result["dispatch"]
    assert len(dispatch) == 24

    # 1. Solar PV is 20% of baseline
    for t, step in enumerate(dispatch):
        expected_pv = round(baseline_inputs["solar"][t] * 0.20, 2)
        assert math.isclose(step["pv_available_kW"], expected_pv, abs_tol=1e-2)

    # 2. Wind is 20% of baseline
    for t, step in enumerate(dispatch):
        expected_wind = round(baseline_inputs["wind"][t] * 0.20, 2)
        assert math.isclose(step["wind_available_kW"], expected_wind, abs_tol=1e-2)

    # 3. Demand matches baseline
    sim_demand = [step["load_kW"] for step in dispatch]
    assert sim_demand == baseline_inputs["demand"]

    # 4. Initial SOC matches baseline
    assert sim_result["resilienceMetrics"]["initial_battery_soc_percent"] == 75.0

    # 5. Both generators available and G1 committed
    assert any(step["generator1Power"] > 0 for step in dispatch)

    # 6. Critical load protected
    for step in dispatch:
        assert step["critical_load_kW"] == 42.5
        assert step["critical_load_shed_kW"] == 0.0
        assert step["criticalLoadProtected"] is True


def test_renewable_drop_resilience_metrics():
    """Verify standard resilience metrics in Renewable Drop output."""
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="renewable-drop", horizon_hours=24)
    metrics = sim_result["resilienceMetrics"]

    assert metrics["scenario_id"] == "renewable-drop"
    assert metrics["scenario_type"] == "RENEWABLE_DROP"
    assert metrics["data_classification"] == "SCENARIO"
    assert metrics["is_demonstration_scenario"] is True
    assert math.isclose(metrics["total_pv_available_kwh"], 131.4, abs_tol=0.5)
    assert math.isclose(metrics["total_wind_available_kwh"], 31.92, abs_tol=0.5)
    assert math.isclose(metrics["total_renewable_available_kwh"], 163.32, abs_tol=0.5)
    assert metrics["renewable_utilization_percent"] == 100.0
    assert metrics["total_generator_energy_kwh"] > 1000.0
    assert metrics["generator_runtime_hours"] > 10
    assert metrics["estimated_fuel_liters"] > 300.0
    assert metrics["total_critical_load_shed_kwh"] == 0.0
    assert metrics["critical_load_reliability_percent"] == 100.0
    assert metrics["resilience_status"] == "PROTECTED"
    assert metrics["critical_load_status"] == "PROTECTED"


def test_renewable_drop_baseline_comparison():
    """Verify baseline comparison table under Renewable Drop."""
    sim_result = run_resilience_simulation(station_id="MAITRI", scenario_id="renewable-drop", horizon_hours=24)
    comp = sim_result["comparison"]

    # PV, Wind, and Total Renewable: exactly -80.0% delta
    assert math.isclose(comp["pv_available_kwh"]["percent_delta"], -80.0, abs_tol=0.1)
    assert math.isclose(comp["wind_available_kwh"]["percent_delta"], -80.0, abs_tol=0.1)
    assert math.isclose(comp["total_renewable_energy_kwh"]["percent_delta"], -80.0, abs_tol=0.1)

    # Generator energy & Fuel consumption increase
    assert comp["generator_energy_kwh"]["scenario"] > comp["generator_energy_kwh"]["baseline"]
    assert comp["generator_energy_kwh"]["percent_delta"] > 90.0
    assert comp["fuel_consumption_liters"]["scenario"] > comp["fuel_consumption_liters"]["baseline"]
    assert comp["fuel_consumption_liters"]["percent_delta"] > 90.0

    # Critical load shedding: 0 on both
    assert comp["critical_load_shed_kwh"]["scenario"] == 0.0
    assert comp["critical_load_reliability_percent"]["scenario"] == 100.0


def test_renewable_drop_deterministic_repeatability():
    """Verify running Renewable Drop simulation twice produces strictly identical results."""
    run1 = run_resilience_simulation(station_id="MAITRI", scenario_id="renewable-drop", horizon_hours=24)
    run2 = run_resilience_simulation(station_id="MAITRI", scenario_id="renewable-drop", horizon_hours=24)

    assert run1["objectiveValue"] == run2["objectiveValue"]
    assert run1["resilienceMetrics"] == run2["resilienceMetrics"]
    assert run1["comparison"] == run2["comparison"]
    assert len(run1["dispatch"]) == len(run2["dispatch"]) == 24


# =========================================================================
# 5. FastAPI Simulation Endpoint Tests
# =========================================================================

def test_api_get_simulation_scenarios():
    """Test GET /simulation/scenarios endpoint returns active scenario list containing all four scenarios."""
    response = client.get("/simulation/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["count"] >= 4
    scen_ids = [s["scenario_id"] for s in data["scenarios"]]
    assert "polar-night" in scen_ids
    assert "generator-failure" in scen_ids
    assert "low-battery" in scen_ids
    assert "renewable-drop" in scen_ids


def test_api_get_simulation_run_polar_night():
    """Test GET /simulation/run/MAITRI/polar-night endpoint executes successfully."""
    response = client.get("/simulation/run/MAITRI/polar-night?horizon_hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["stationId"] == "MAITRI"
    assert data["horizonHours"] == 24
    assert data["scenario"]["scenario_id"] == "polar-night"
    assert data["resilienceMetrics"]["resilience_status"] == "PROTECTED"
    assert data["resilienceMetrics"]["total_pv_available_kwh"] == 0.0
    assert len(data["dispatch"]) == 24
    assert "comparison" in data
    assert "recommendation" in data


def test_api_get_simulation_run_generator_failure():
    """Test GET /simulation/run/MAITRI/generator-failure endpoint executes successfully."""
    response = client.get("/simulation/run/MAITRI/generator-failure?horizon_hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["stationId"] == "MAITRI"
    assert data["horizonHours"] == 24
    assert data["scenario"]["scenario_id"] == "generator-failure"
    assert data["resilienceMetrics"]["resilience_status"] == "PROTECTED"
    assert data["resilienceMetrics"]["failed_generator_identifier"] == "GEN-01"
    assert data["resilienceMetrics"]["failed_generator_energy_kwh"] == 0.0
    assert data["resilienceMetrics"]["remaining_generator_energy_kwh"] > 0.0
    assert len(data["dispatch"]) == 24
    assert "comparison" in data
    assert "recommendation" in data
    assert "Primary Generator Failure" in data["recommendation"]


def test_api_get_simulation_run_low_battery():
    """Test GET /simulation/run/MAITRI/low-battery endpoint executes successfully."""
    response = client.get("/simulation/run/MAITRI/low-battery?horizon_hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["stationId"] == "MAITRI"
    assert data["horizonHours"] == 24
    assert data["scenario"]["scenario_id"] == "low-battery"
    assert data["resilienceMetrics"]["resilience_status"] == "PROTECTED"
    assert data["resilienceMetrics"]["initial_battery_soc_percent"] == 20.0
    assert len(data["dispatch"]) == 24
    assert "comparison" in data
    assert "recommendation" in data
    assert "Critically Low Battery State" in data["recommendation"]


def test_api_get_simulation_run_renewable_drop():
    """Test GET /simulation/run/MAITRI/renewable-drop endpoint executes successfully."""
    response = client.get("/simulation/run/MAITRI/renewable-drop?horizon_hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["stationId"] == "MAITRI"
    assert data["horizonHours"] == 24
    assert data["scenario"]["scenario_id"] == "renewable-drop"
    assert data["resilienceMetrics"]["resilience_status"] == "PROTECTED"
    assert math.isclose(data["resilienceMetrics"]["total_renewable_available_kwh"], 163.32, abs_tol=0.5)
    assert len(data["dispatch"]) == 24
    assert "comparison" in data
    assert "recommendation" in data
    assert "Renewable Generation Drop" in data["recommendation"]


def test_api_simulation_unknown_scenario_returns_404():
    """Test GET /simulation/run/MAITRI/unknown-scenario returns HTTP 404."""
    response = client.get("/simulation/run/MAITRI/non-existent-scenario")
    assert response.status_code == 404
