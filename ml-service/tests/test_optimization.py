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
    assert "wind_available_kW" in first_pt
    assert "wind_used_kW" in first_pt
    assert "wind_curtailed_kW" in first_pt
    assert "battery_charge_kW" in first_pt
    assert "battery_discharge_kW" in first_pt
    assert "generator_output_kW" in first_pt
    assert "battery_soc_percent" in first_pt
    assert "critical_load_kW" in first_pt
    assert "critical_load_shed_kW" in first_pt


def test_maitri_wind_scenario_loading_and_properties():
    """
    Validation Test for Maitri Wind Integration:
    1. Exactly 24 wind values are supplied.
    2. All values are >= 0.
    3. No value exceeds 45 kW (50 kW capacity * 0.90 availability).
    4. The vector exactly matches the December 1 (00:00-23:00) rows of maitri_2019_wind_power_hourly.csv.
    5. Scenario metadata accurately reflects real wind observation provenance and scenario model.
    """
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    wind_vec = inputs["wind"]

    # 1. Exactly 24 values
    assert len(wind_vec) == 24, f"Expected 24 wind values, found {len(wind_vec)}"

    # 2. All values >= 0
    assert all(w >= 0.0 for w in wind_vec), f"Found negative wind value in: {wind_vec}"

    # 3. Max bound 45 kW
    assert all(w <= 45.0 + 1e-4 for w in wind_vec), f"Found wind value exceeding 45 kW: {max(wind_vec)}"

    # 4. Compare against raw processed CSV for December 1, 2019
    csv_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "datasets",
            "processed",
            "weather",
            "maitri_2019_wind_power_hourly.csv"
        )
    )
    assert os.path.exists(csv_path), f"Processed wind CSV not found at {csv_path}"
    df_wind = pd.read_csv(csv_path)
    df_wind["dt"] = pd.to_datetime(df_wind["timestamp"])
    mask_dec1 = (df_wind["dt"] >= "2019-12-01 00:00:00") & (df_wind["dt"] <= "2019-12-01 23:00:00")
    df_dec1 = df_wind[mask_dec1].sort_values("dt").reset_index(drop=True)

    assert len(df_dec1) == 24
    expected_wind = [round(float(v), 2) for v in df_dec1["modeled_wind_power_kw"].values]
    assert wind_vec == expected_wind, f"Wind vector mismatch: {wind_vec} vs {expected_wind}"

    # 5. Metadata verification
    meta = inputs["scenarioMetadata"]
    assert meta["wind_mode"] == "MAITRI_2019_OBSERVED_WIND_SPEED_MODELED_POWER"
    assert "Real Maitri 2019 hourly wind-speed observations" in meta["wind_source"]
    assert meta["wind_capacity_kw"] == 50.0
    assert meta["wind_availability_factor"] == 0.90
    assert inputs["isDemonstrationScenario"] is True


def test_optimization_repeatability_deterministic():
    """Verify that running the scenario builder and optimizer twice produces strictly identical results."""
    inputs1 = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    inputs2 = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)

    assert inputs1["wind"] == inputs2["wind"]
    assert inputs1["solar"] == inputs2["solar"]
    assert inputs1["demand"] == inputs2["demand"]

    res1 = optimize_24h_dispatch(
        demand=inputs1["demand"],
        solar=inputs1["solar"],
        wind=inputs1["wind"],
        initial_soc=inputs1["initialSOC"],
        station_id=inputs1["stationId"],
    )
    res2 = optimize_24h_dispatch(
        demand=inputs2["demand"],
        solar=inputs2["solar"],
        wind=inputs2["wind"],
        initial_soc=inputs2["initialSOC"],
        station_id=inputs2["stationId"],
    )

    assert res1["objectiveValue"] == res2["objectiveValue"]
    assert res1["totalEstimatedFuel"] == res2["totalEstimatedFuel"]
    assert res1["totalGeneratorEnergy"] == res2["totalGeneratorEnergy"]
    assert len(res1["dispatch"]) == len(res2["dispatch"]) == 24


def test_wind_dispatch_constraints_and_accounting():
    """
    Validation of Wind Dispatch Balance & Curtailment:
    1. Wind available is never negative
    2. Wind used <= Wind available
    3. Wind curtailed = Wind available - Wind used
    4. Total Wind used + Total Wind curtailed == Total Wind available
    """
    inputs = build_demonstration_scenario_inputs("MAITRI", horizon_hours=24)
    res = optimize_24h_dispatch(
        demand=inputs["demand"],
        solar=inputs["solar"],
        wind=inputs["wind"],
        initial_soc=inputs["initialSOC"],
        station_id=inputs["stationId"],
    )

    sum_wind_used = 0.0
    sum_wind_curt = 0.0

    for step in res["dispatch"]:
        w_avail = step["wind_available_kW"]
        w_used = step["wind_used_kW"]
        w_curt = step["wind_curtailed_kW"]

        assert w_avail >= 0.0, f"Negative wind available at hour {step['hour']}: {w_avail}"
        assert w_used <= w_avail + 1e-2, f"Wind used ({w_used}) exceeded available ({w_avail}) at hour {step['hour']}"
        assert w_used >= 0.0, f"Negative wind used at hour {step['hour']}: {w_used}"
        assert w_curt >= 0.0, f"Negative wind curtailed at hour {step['hour']}: {w_curt}"

        assert abs(w_curt - (w_avail - w_used)) < 1e-2, (
            f"Wind curtailment mismatch at hour {step['hour']}: {w_curt} vs {w_avail - w_used}"
        )
        assert abs((w_used + w_curt) - w_avail) < 1e-2, (
            f"Wind sum mismatch at hour {step['hour']}: {w_used + w_curt} vs {w_avail}"
        )

        sum_wind_used += w_used
        sum_wind_curt += w_curt

    expected_total_wind = sum(inputs["wind"])
    assert abs((sum_wind_used + sum_wind_curt) - expected_total_wind) < 1e-1

