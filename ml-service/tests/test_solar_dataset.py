"""
Unit and integration tests for Maitri Solar Dataset processing and validation.
Verifies raw data preservation, schema integrity, unit conversion correctness,
missing data handling, and climatological summaries.
"""

import os
import json
import hashlib
import pytest
import pandas as pd
import numpy as np

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_FILE = os.path.join(WORKSPACE_ROOT, "datasets", "raw", "maitri", "radiation", "1985-2000", "radiation.txt")
PROCESSED_DIR = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "maitri", "solar")
HOURLY_CSV = os.path.join(PROCESSED_DIR, "maitri_solar_hourly.csv")
CLIMATOLOGY_CSV = os.path.join(PROCESSED_DIR, "maitri_solar_climatology.csv")
VALIDATION_JSON = os.path.join(PROCESSED_DIR, "validation_report.json")
PLOTS_DIR = os.path.join(WORKSPACE_ROOT, "outputs", "plots", "solar")


@pytest.fixture(scope="module")
def hourly_df():
    """Load processed hourly solar dataset."""
    assert os.path.exists(HOURLY_CSV), f"Processed hourly dataset missing at {HOURLY_CSV}"
    df = pd.read_csv(HOURLY_CSV)
    return df


@pytest.fixture(scope="module")
def climatology_df():
    """Load processed climatology dataset."""
    assert os.path.exists(CLIMATOLOGY_CSV), f"Climatology dataset missing at {CLIMATOLOGY_CSV}"
    df = pd.read_csv(CLIMATOLOGY_CSV)
    return df


@pytest.fixture(scope="module")
def validation_report():
    """Load validation report."""
    assert os.path.exists(VALIDATION_JSON), f"Validation report missing at {VALIDATION_JSON}"
    with open(VALIDATION_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def test_raw_file_remains_unchanged(validation_report):
    """Verify raw file exists and its SHA-256 hash matches the recorded initial hash."""
    assert os.path.exists(RAW_FILE), "Raw radiation file does not exist"
    
    hasher = hashlib.sha256()
    with open(RAW_FILE, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    current_hash = hasher.hexdigest()
    
    assert current_hash == validation_report["source_file_sha256"], "Raw file hash has changed!"
    assert os.path.getsize(RAW_FILE) == 125605, "Raw file size has changed!"


def test_processed_row_count(hourly_df):
    """Verify exactly 4,607 processed records exist."""
    assert len(hourly_df) == 4607, f"Expected 4607 rows, found {len(hourly_df)}"


def test_required_columns_exist(hourly_df):
    """Verify required columns exist in processed hourly dataset."""
    expected_cols = ["year", "month", "source_hour", "radiation_mj_m2", "irradiance_w_m2"]
    for col in expected_cols:
        assert col in hourly_df.columns, f"Missing required column: {col}"


def test_source_hour_remains_1_to_24(hourly_df):
    """Verify source_hour values strictly stay within 1 to 24 without 24->0 conversion."""
    unique_hours = sorted(hourly_df["source_hour"].unique())
    assert min(unique_hours) == 1, f"Minimum hour is {min(unique_hours)}, expected 1"
    assert max(unique_hours) == 24, f"Maximum hour is {max(unique_hours)}, expected 24"
    assert len(unique_hours) == 24, f"Expected 24 distinct hours, found {len(unique_hours)}"
    assert 0 not in unique_hours, "Hour 0 unexpectedly present (24 should not be mapped to 0)"


def test_missing_values_preserved(hourly_df):
    """Verify 602 missing values remain missing (NaN) and were not converted to 0."""
    missing_rad_count = hourly_df["radiation_mj_m2"].isna().sum()
    missing_irr_count = hourly_df["irradiance_w_m2"].isna().sum()
    
    assert missing_rad_count == 602, f"Expected 602 missing radiation values, got {missing_rad_count}"
    assert missing_irr_count == 602, f"Expected 602 missing irradiance values, got {missing_irr_count}"


def test_zero_values_preserved(hourly_df):
    """Verify 1,276 zero radiation values remain exactly zero."""
    zero_rad_count = (hourly_df["radiation_mj_m2"] == 0.0).sum()
    zero_irr_count = (hourly_df["irradiance_w_m2"] == 0.0).sum()
    
    assert zero_rad_count == 1276, f"Expected 1276 zero radiation values, got {zero_rad_count}"
    assert zero_irr_count == 1276, f"Expected 1276 zero irradiance values, got {zero_irr_count}"


def test_unit_conversion_correctness(hourly_df):
    """Verify unit conversion formula: irradiance_w_m2 = radiation_mj_m2 * 1e6 / 3600."""
    valid_rows = hourly_df.dropna(subset=["radiation_mj_m2", "irradiance_w_m2"])
    expected_irradiance = valid_rows["radiation_mj_m2"] * (1_000_000.0 / 3600.0)
    
    np.testing.assert_allclose(
        valid_rows["irradiance_w_m2"].values,
        expected_irradiance.values,
        rtol=1e-7,
        err_msg="Irradiance conversion does not match radiation_mj_m2 * 1e6 / 3600"
    )

    # Spot check specific values
    # 0 MJ/m² -> 0 W/m²
    zero_sample = valid_rows[valid_rows["radiation_mj_m2"] == 0.0].iloc[0]
    assert zero_sample["irradiance_w_m2"] == 0.0
    
    # 1.0 MJ/m² approx 277.777778 W/m²
    assert np.isclose(1.0 * (1_000_000.0 / 3600.0), 277.7777777778)


def test_no_duplicate_records(hourly_df):
    """Verify no duplicate (Year, Month, Source Hour) records exist."""
    duplicates = hourly_df.duplicated(subset=["year", "month", "source_hour"])
    assert duplicates.sum() == 0, f"Found {duplicates.sum()} duplicate (year, month, hour) records"


def test_climatology_groups_and_coverage(climatology_df):
    """Verify climatology contains exactly 288 groups (12 months x 24 hours)."""
    assert len(climatology_df) == 288, f"Expected 288 climatology rows, got {len(climatology_df)}"
    
    # Check all months 1-12 and hours 1-24 are present
    months = sorted(climatology_df["month"].unique())
    hours = sorted(climatology_df["source_hour"].unique())
    assert months == list(range(1, 13))
    assert hours == list(range(1, 25))

    # Check total observation sum equals 4,608 (4607 valid/missing + 1 missing 1985-01-01)
    total_valid = climatology_df["valid_observation_count"].sum()
    total_missing = climatology_df["missing_observation_count"].sum()
    assert total_valid == 4005, f"Expected 4005 valid observations, got {total_valid}"
    assert total_valid + total_missing == 4607, f"Expected 4607 total recorded observations in climatology, got {total_valid + total_missing}"


def test_visualizations_exist():
    """Verify all 3 required scientific plots were generated."""
    expected_plots = [
        "solar_resource_timeseries.png",
        "monthly_solar_profile.png",
        "hourly_solar_profile.png"
    ]
    for plot_file in expected_plots:
        plot_path = os.path.join(PLOTS_DIR, plot_file)
        assert os.path.exists(plot_path), f"Plot {plot_file} not found in {PLOTS_DIR}"
        assert os.path.getsize(plot_path) > 1000, f"Plot {plot_file} appears too small or corrupt"
