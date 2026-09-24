"""
Unit tests for data validation, cleaning, and reporting.
"""

import pytest
import pandas as pd
import numpy as np
from app.data.cleaning import validate_and_clean_time_series


def test_validate_and_clean_empty():
    df = pd.DataFrame()
    clean_df, report = validate_and_clean_time_series(df)
    assert clean_df.empty
    assert report["status"] == "empty"
    assert report["rows_before"] == 0
    assert report["rows_after"] == 0


def test_validate_and_clean_missing_timestamp_col():
    df = pd.DataFrame({"temperature": [10.0, 12.0]})
    clean_df, report = validate_and_clean_time_series(df, timestamp_col="timestamp")
    assert report["status"] == "error"
    assert "timestamp" in report["message"]


def test_validate_and_clean_chronological_and_deduplicate():
    df = pd.DataFrame({
        "timestamp": [
            "2016-12-01T12:00:00Z",
            "2016-12-01T10:00:00Z",
            "2016-12-01T11:00:00Z",
            "2016-12-01T11:00:00Z",  # Duplicate timestamp
        ],
        "temperature": [-10.5, -12.0, -11.0, -11.2],
        "wind_speed": [5.0, 4.2, 6.1, 6.5]
    })
    clean_df, report = validate_and_clean_time_series(df)

    assert report["rows_before"] == 4
    assert report["rows_after"] == 3
    assert report["duplicates"] == 1
    assert report["status"] == "cleaned_with_corrections"
    # Ensure chronological order
    assert clean_df["timestamp"].tolist() == sorted(clean_df["timestamp"].tolist())
    # Ensure last duplicate observation is kept
    assert clean_df.iloc[1]["temperature"] == -11.2


def test_validate_and_clean_numeric_and_bounds():
    df = pd.DataFrame({
        "timestamp": [
            "2016-12-01T10:00:00Z",
            "2016-12-01T11:00:00Z",
            "2016-12-01T12:00:00Z",
            "2016-12-01T13:00:00Z",
        ],
        "total_load": [-25.0, np.inf, 55.4, "bad_str"],
        "solar_radiation": [100.0, -50.0, 200.0, 150.0]
    })

    clean_df, report = validate_and_clean_time_series(
        df,
        non_negative_cols=["total_load", "solar_radiation"]
    )

    assert report["rows_after"] == 4
    assert report["invalid_numeric_values"] == 2  # inf and "bad_str"
    # Negative load and solar clipped to 0.0
    assert clean_df.iloc[0]["total_load"] == 0.0
    assert np.isnan(clean_df.iloc[1]["total_load"])
    assert clean_df.iloc[2]["total_load"] == 55.4
    assert np.isnan(clean_df.iloc[3]["total_load"])
    assert clean_df.iloc[1]["solar_radiation"] == 0.0
