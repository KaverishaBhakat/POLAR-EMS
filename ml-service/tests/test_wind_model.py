"""
Unit and validation test suite for Maitri Parameterized Wind Generation Model.
Verifies piecewise aerodynamic power curve conversions, physical cut-in/rated/cut-out thresholds,
availability factor derating, missing/invalid input handling, and dataset validation.
"""

import os
import json
import math
import pytest
import pandas as pd
import numpy as np

from app.models.wind_model import wind_speed_to_power

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CONFIG_FILE = os.path.join(WORKSPACE_ROOT, "config", "maitri_wind_config.json")
WEATHER_HOURLY_CSV = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "weather", "maitri_2019_hourly.csv")
WIND_HOURLY_CSV = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "weather", "maitri_2019_wind_power_hourly.csv")
VALIDATION_REPORT_JSON = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "weather", "maitri_2019_wind_validation_report.json")
PLOT_PNG = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "weather", "maitri_2019_wind_power_plot.png")


@pytest.fixture(scope="module")
def wind_config():
    """Load configuration dictionary."""
    assert os.path.exists(CONFIG_FILE), f"Missing config file at {CONFIG_FILE}"
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg


@pytest.fixture(scope="module")
def wind_hourly_df():
    """Load modeled wind hourly dataset."""
    assert os.path.exists(WIND_HOURLY_CSV), f"Missing wind hourly CSV at {WIND_HOURLY_CSV}"
    df = pd.read_csv(WIND_HOURLY_CSV)
    return df


@pytest.fixture(scope="module")
def validation_report():
    """Load wind model validation report."""
    assert os.path.exists(VALIDATION_REPORT_JSON), f"Missing validation report at {VALIDATION_REPORT_JSON}"
    with open(VALIDATION_REPORT_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


# =========================================================================
# 1. Configuration & Scenario Schema Tests
# =========================================================================

def test_wind_configuration_loading(wind_config):
    """Verify configuration parameters match defined scenario assumptions."""
    assert wind_config["station"] == "MAITRI"
    assert wind_config["mode"] == "SCENARIO"
    assert wind_config["wind_capacity_kw"] == 50.0
    assert wind_config["cut_in_speed_ms"] == 3.5
    assert wind_config["rated_speed_ms"] == 12.0
    assert wind_config["cut_out_speed_ms"] == 25.0
    assert wind_config["availability_factor"] == 0.90


# =========================================================================
# 2. Aerodynamic Piecewise Power Curve Tests
# =========================================================================

def test_below_cut_in_produces_zero(wind_config):
    """v < cut_in -> 0 kW output."""
    for v in [0.0, 1.0, 2.0, 3.4, 3.499]:
        res = wind_speed_to_power(v, config=wind_config)
        assert res["modeled_wind_power_kw"] == 0.0
        assert res["raw_power_kw"] == 0.0
        assert res["is_below_cut_in"] is True
        assert res["is_cut_out"] is False
        assert res["status"] == "BELOW_CUT_IN"


def test_exactly_cut_in_produces_zero(wind_config):
    """v == cut_in -> 0 kW output ((3.5 - 3.5)/8.5)^3 = 0."""
    v = 3.5
    res = wind_speed_to_power(v, config=wind_config)
    assert res["modeled_wind_power_kw"] == 0.0
    assert res["raw_power_kw"] == 0.0
    assert res["is_below_cut_in"] is False
    assert res["is_cut_out"] is False
    assert res["status"] == "PARTIAL_LOAD_RAMP"


def test_between_cut_in_and_rated_cubic_output(wind_config):
    """cut_in <= v < rated -> capacity * ((v - cut_in)/(rated - cut_in))^3 * availability."""
    test_speeds = [4.0, 6.0, 8.0, 10.0, 11.99]
    for v in test_speeds:
        res = wind_speed_to_power(v, config=wind_config)
        expected_raw = 50.0 * (((v - 3.5) / (12.0 - 3.5)) ** 3)
        expected_modeled = round(expected_raw * 0.90, 4)
        
        assert math.isclose(res["raw_power_kw"], expected_raw, rel_tol=1e-3, abs_tol=1e-3)
        assert math.isclose(res["modeled_wind_power_kw"], expected_modeled, rel_tol=1e-3, abs_tol=1e-3)
        assert res["is_below_cut_in"] is False
        assert res["is_cut_out"] is False
        assert res["status"] == "PARTIAL_LOAD_RAMP"

    # Spot check v = 7.75 m/s (midpoint of ramp: (7.75-3.5)/8.5 = 0.5 -> (0.5)^3 = 0.125 -> 50*0.125 = 6.25 kW -> *0.9 = 5.625 kW)
    res_mid = wind_speed_to_power(7.75, config=wind_config)
    assert math.isclose(res_mid["raw_power_kw"], 6.25, abs_tol=1e-4)
    assert math.isclose(res_mid["modeled_wind_power_kw"], 5.625, abs_tol=1e-4)


def test_exactly_rated_produces_rated_capacity(wind_config):
    """v == rated -> capacity * availability (50 * 0.90 = 45.0 kW)."""
    v = 12.0
    res = wind_speed_to_power(v, config=wind_config)
    assert res["raw_power_kw"] == 50.0
    assert res["modeled_wind_power_kw"] == 45.0
    assert res["is_below_cut_in"] is False
    assert res["is_cut_out"] is False
    assert res["is_rated"] is True
    assert res["status"] == "RATED_OUTPUT"


def test_between_rated_and_cut_out_produces_rated_capacity(wind_config):
    """rated <= v < cut_out -> rated capacity * availability (45.0 kW)."""
    for v in [12.01, 15.0, 18.5, 22.0, 24.99]:
        res = wind_speed_to_power(v, config=wind_config)
        assert res["raw_power_kw"] == 50.0
        assert res["modeled_wind_power_kw"] == 45.0
        assert res["is_below_cut_in"] is False
        assert res["is_cut_out"] is False
        assert res["is_rated"] is True
        assert res["status"] == "RATED_OUTPUT"


def test_exactly_cut_out_produces_zero(wind_config):
    """v == cut_out -> 0 kW storm shut down."""
    v = 25.0
    res = wind_speed_to_power(v, config=wind_config)
    assert res["raw_power_kw"] == 0.0
    assert res["modeled_wind_power_kw"] == 0.0
    assert res["is_below_cut_in"] is False
    assert res["is_cut_out"] is True
    assert res["status"] == "STORM_CUT_OUT"


def test_above_cut_out_produces_zero(wind_config):
    """v > cut_out -> 0 kW storm shut down."""
    for v in [25.01, 30.0, 35.5, 47.56, 60.0]:
        res = wind_speed_to_power(v, config=wind_config)
        assert res["raw_power_kw"] == 0.0
        assert res["modeled_wind_power_kw"] == 0.0
        assert res["is_below_cut_in"] is False
        assert res["is_cut_out"] is True
        assert res["status"] == "STORM_CUT_OUT"


# =========================================================================
# 3. Boundary & Error Handling Tests
# =========================================================================

def test_missing_input_handling(wind_config):
    """None, NaN, or invalid inputs return safe missing data structure."""
    for bad_input in [None, float("nan"), np.nan]:
        res = wind_speed_to_power(bad_input, config=wind_config)
        assert res["modeled_wind_power_kw"] is None
        assert res["raw_power_kw"] is None
        assert res["wind_speed_ms"] is None
        assert res["status"] == "MISSING_DATA"


def test_negative_wind_speed_clamped_to_zero(wind_config):
    """Negative wind speed is physically clamped to 0 m/s -> 0 kW."""
    res = wind_speed_to_power(-5.0, config=wind_config)
    assert res["wind_speed_ms"] == 0.0
    assert res["modeled_wind_power_kw"] == 0.0
    assert res["is_below_cut_in"] is True


def test_output_never_exceeds_derated_capacity(wind_hourly_df, wind_config):
    """Modeled output across all observations must never exceed capacity * availability factor."""
    max_allowed = wind_config["wind_capacity_kw"] * wind_config["availability_factor"]
    max_observed = wind_hourly_df["modeled_wind_power_kw"].max()
    assert max_observed <= max_allowed + 1e-6, f"Modeled power {max_observed} exceeded {max_allowed} kW"
    assert (wind_hourly_df["modeled_wind_power_kw"] >= 0.0).all(), "Negative modeled wind power detected!"


# =========================================================================
# 4. Processed Dataset & Validation Report Tests
# =========================================================================

def test_processed_dataset_structure_and_continuity(wind_hourly_df):
    """Verify 8,760 continuous hourly observations with expected columns."""
    assert len(wind_hourly_df) == 8760, f"Expected 8,760 rows, found {len(wind_hourly_df)}"
    expected_cols = ["timestamp", "wind_speed_ms", "modeled_wind_power_kw", "is_cut_out", "is_below_cut_in"]
    for col in expected_cols:
        assert col in wind_hourly_df.columns, f"Missing required column: {col}"

    assert wind_hourly_df["wind_speed_ms"].isna().sum() == 0, "Null wind speeds found"
    assert wind_hourly_df["modeled_wind_power_kw"].isna().sum() == 0, "Null modeled powers found"


def test_validation_report_metrics(validation_report, wind_hourly_df):
    """Verify validation report statistics match dataset calculations."""
    assert validation_report["number_of_observations"] == 8760
    assert math.isclose(validation_report["min_wind_speed_ms"], wind_hourly_df["wind_speed_ms"].min(), abs_tol=1e-2)
    assert math.isclose(validation_report["max_wind_speed_ms"], wind_hourly_df["wind_speed_ms"].max(), abs_tol=1e-2)
    assert math.isclose(validation_report["mean_wind_speed_ms"], wind_hourly_df["wind_speed_ms"].mean(), abs_tol=1e-2)
    assert math.isclose(validation_report["mean_modeled_power_kw"], wind_hourly_df["modeled_wind_power_kw"].mean(), abs_tol=1e-2)
    assert math.isclose(validation_report["maximum_modeled_power_kw"], wind_hourly_df["modeled_wind_power_kw"].max(), abs_tol=1e-2)
    assert validation_report["number_of_below_cut_in_hours"] == int(wind_hourly_df["is_below_cut_in"].sum())
    assert validation_report["number_of_cut_out_hours"] == int(wind_hourly_df["is_cut_out"].sum())


def test_artifacts_exist():
    """Verify generated plot and validation report artifacts exist."""
    assert os.path.exists(PLOT_PNG), "Wind generation plot missing"
    assert os.path.getsize(PLOT_PNG) > 1000
    assert os.path.exists(VALIDATION_REPORT_JSON), "Validation report JSON missing"
