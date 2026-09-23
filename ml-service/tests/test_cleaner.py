"""
Unit tests for data cleaning and validation functions in POLAR-EMS ML Service.
"""

import pytest
import pandas as pd
import numpy as np
from app.data.cleaner import clean_time_series_data, check_data_sufficiency


def test_clean_time_series_data_chronological_and_deduplicate():
    raw_data = pd.DataFrame({
        "timestamp": [
            "2026-01-01T03:00:00Z",
            "2026-01-01T01:00:00Z",
            "2026-01-01T02:00:00Z",
            "2026-01-01T02:00:00Z",  # duplicate
        ],
        "total_load": [50.0, 40.0, 45.0, 46.0]
    })
    
    cleaned = clean_time_series_data(raw_data, timestamp_col="timestamp")
    
    assert len(cleaned) == 3
    # Verify sorted chronologically
    timestamps = cleaned["timestamp"].tolist()
    assert timestamps == sorted(timestamps)
    # Deduplicate should keep last recorded value (46.0 for 02:00)
    assert cleaned.iloc[1]["total_load"] == 46.0


def test_clean_time_series_data_invalid_numeric_and_bounds():
    raw_data = pd.DataFrame({
        "timestamp": [
            "2026-01-01T00:00:00Z",
            "2026-01-01T01:00:00Z",
            "2026-01-01T02:00:00Z",
            "2026-01-01T03:00:00Z",
        ],
        "total_load": [-15.0, np.inf, 60.5, "invalid_val"]
    })
    
    cleaned = clean_time_series_data(
        raw_data,
        timestamp_col="timestamp",
        non_negative_cols=["total_load"]
    )
    
    # Negative should be clipped to 0.0
    assert cleaned.iloc[0]["total_load"] == 0.0
    # inf and invalid string should be coerced to NaN
    assert np.isnan(cleaned.iloc[1]["total_load"])
    assert cleaned.iloc[2]["total_load"] == 60.5
    assert np.isnan(cleaned.iloc[3]["total_load"])


def test_check_data_sufficiency_insufficient():
    # Only 10 observations when 168 are required
    df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01", periods=10, freq="1h"),
        "total_load": np.random.uniform(40, 60, size=10)
    })
    
    result = check_data_sufficiency(df, min_observations=168, target_col="total_load")
    assert result["sufficient"] is False
    assert result["observations"] == 10
    assert result["required_minimum"] == 168
    assert "Not enough historical observations" in result["message"]


def test_check_data_sufficiency_sufficient():
    # 200 observations
    df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01", periods=200, freq="1h"),
        "total_load": np.random.uniform(40, 60, size=200)
    })
    
    result = check_data_sufficiency(df, min_observations=168, target_col="total_load")
    assert result["sufficient"] is True
    assert result["observations"] == 200
    assert result["missing_pct"] == 0.0


def test_check_data_sufficiency_excessive_missing():
    # 200 rows but 50% are NaN
    vals = [50.0 if i % 2 == 0 else np.nan for i in range(200)]
    df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01", periods=200, freq="1h"),
        "total_load": vals
    })
    
    result = check_data_sufficiency(df, min_observations=50, max_missing_pct=0.25, target_col="total_load")
    assert result["sufficient"] is False
    assert "Data quality check failed" in result["message"]
