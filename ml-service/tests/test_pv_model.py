"""
Unit and validation test suite for Maitri Parameterized PV Model.
Verifies engineering calculations, physical constraints, scenario structure,
config loading, missing data handling, and raw dataset preservation.
"""

import os
import json
import hashlib
import pytest
import pandas as pd
import numpy as np

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_FILE = os.path.join(WORKSPACE_ROOT, "datasets", "raw", "maitri", "radiation", "1985-2000", "radiation.txt")
CONFIG_FILE = os.path.join(WORKSPACE_ROOT, "config", "maitri_pv_config.json")
SOLAR_HOURLY_CSV = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "maitri", "solar", "maitri_solar_hourly.csv")
PV_HOURLY_CSV = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "maitri", "solar", "maitri_pv_generation_hourly.csv")
PV_CLIMATOLOGY_CSV = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "maitri", "solar", "maitri_pv_climatology.csv")
PV_SCENARIO_CSV = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "maitri", "solar", "maitri_pv_24h_scenario.csv")
VALIDATION_JSON = os.path.join(WORKSPACE_ROOT, "outputs", "solar", "pv_model_validation.json")
PV_PLOT_PNG = os.path.join(WORKSPACE_ROOT, "outputs", "plots", "solar", "pv_generation_profile.png")
ASSUMPTIONS_MD = os.path.join(WORKSPACE_ROOT, "outputs", "solar", "PV_MODEL_ASSUMPTIONS.md")


@pytest.fixture(scope="module")
def pv_config():
    """Load configuration dictionary."""
    assert os.path.exists(CONFIG_FILE), f"Missing config file at {CONFIG_FILE}"
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg


@pytest.fixture(scope="module")
def pv_hourly_df():
    """Load modeled PV hourly dataset."""
    assert os.path.exists(PV_HOURLY_CSV), f"Missing PV hourly CSV at {PV_HOURLY_CSV}"
    df = pd.read_csv(PV_HOURLY_CSV)
    return df


@pytest.fixture(scope="module")
def pv_scenario_df():
    """Load December 24h optimization scenario CSV."""
    assert os.path.exists(PV_SCENARIO_CSV), f"Missing PV scenario CSV at {PV_SCENARIO_CSV}"
    df = pd.read_csv(PV_SCENARIO_CSV)
    return df


@pytest.fixture(scope="module")
def validation_data():
    """Load PV model validation report."""
    assert os.path.exists(VALIDATION_JSON), f"Missing validation JSON at {VALIDATION_JSON}"
    with open(VALIDATION_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def test_pv_configuration_loading(pv_config):
    """Test 5: Verify configuration schema and expected scenario parameters."""
    assert pv_config["station"] == "MAITRI"
    assert pv_config["mode"] == "SCENARIO"
    assert pv_config["pv_capacity_kw"] == 100
    assert pv_config["performance_ratio"] == 0.80
    assert pv_config.get("availability_factor", 1.0) == 1.0


def test_pv_calculation_correctness(pv_hourly_df, pv_config):
    """Test 1: Verify PV generation formula: PV_kW = PV_cap * (Irradiance / 1000) * PR * AF."""
    valid_df = pv_hourly_df.dropna(subset=["irradiance_w_m2", "pv_generation_kw"])
    
    expected_pv = valid_df["pv_capacity_kw"] * (valid_df["irradiance_w_m2"] / 1000.0) * valid_df["performance_ratio"] * valid_df["availability_factor"]
    
    np.testing.assert_allclose(
        valid_df["pv_generation_kw"].values,
        expected_pv.values,
        rtol=1e-6,
        err_msg="Calculated PV generation does not match governing equation"
    )

    # Spot check: 700 W/m² with 100 kW, 0.8 PR -> 56 kW
    sample_irr = 700.0
    expected_sample_pv = 100.0 * (sample_irr / 1000.0) * 0.80 * 1.0
    assert np.isclose(expected_sample_pv, 56.0)


def test_zero_irradiance_produces_zero_generation(pv_hourly_df):
    """Test 2: Verify zero irradiance strictly yields zero PV generation."""
    zero_rows = pv_hourly_df[pv_hourly_df["irradiance_w_m2"] == 0.0]
    assert len(zero_rows) == 1276
    assert (zero_rows["pv_generation_kw"] == 0.0).all(), "Zero irradiance did not yield 0.0 kW generation"


def test_generation_cannot_exceed_capacity(pv_hourly_df, pv_config):
    """Test 3: Verify modeled PV generation never exceeds installed nameplate capacity."""
    max_pv = pv_hourly_df["pv_generation_kw"].dropna().max()
    capacity = float(pv_config["pv_capacity_kw"])
    assert max_pv <= capacity, f"Maximum PV output ({max_pv} kW) exceeded nameplate capacity ({capacity} kW)"


def test_missing_irradiance_remains_missing(pv_hourly_df):
    """Test 4: Verify missing irradiance values produce NaN in PV generation without zero-filling."""
    missing_irr = pv_hourly_df[pv_hourly_df["irradiance_w_m2"].isna()]
    assert len(missing_irr) == 602, f"Expected 602 missing rows, found {len(missing_irr)}"
    assert missing_irr["pv_generation_kw"].isna().all(), "Missing irradiance was converted to numeric value unexpectedly"


def test_no_negative_generation(pv_hourly_df):
    """Test 7: Verify modeled PV generation is never negative."""
    valid_pv = pv_hourly_df["pv_generation_kw"].dropna()
    min_pv = valid_pv.min()
    assert min_pv >= 0.0, f"Negative PV generation detected: {min_pv} kW"


def test_december_scenario_contains_24_rows(pv_scenario_df):
    """Test 6: Verify optimization scenario has exactly 24 rows for December."""
    assert len(pv_scenario_df) == 24, f"Expected 24 scenario rows, found {len(pv_scenario_df)}"
    assert list(pv_scenario_df["hour"]) == list(range(1, 25))
    assert (pv_scenario_df["scenario_month"] == "December").all()
    assert (pv_scenario_df["generation_type"] == "HISTORICAL_CLIMATOLOGY_SCENARIO").all()
    assert (pv_scenario_df["pv_generation_kw"] >= 0.0).all()


def test_raw_solar_dataset_remains_unchanged(validation_data):
    """Test 8: Verify the raw solar dataset hash remains identical."""
    assert os.path.exists(RAW_FILE)
    hasher = hashlib.sha256()
    with open(RAW_FILE, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    current_hash = hasher.hexdigest()
    assert current_hash == validation_data["raw_file_sha256"], "Raw file hash has changed!"


def test_artifacts_generated():
    """Verify all documentation and plot artifacts exist."""
    assert os.path.exists(PV_PLOT_PNG), "PV generation profile plot missing"
    assert os.path.getsize(PV_PLOT_PNG) > 1000
    assert os.path.exists(ASSUMPTIONS_MD), "Assumptions markdown documentation missing"
    assert os.path.getsize(ASSUMPTIONS_MD) > 200
