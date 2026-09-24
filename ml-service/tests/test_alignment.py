"""
Unit tests for time alignment and frequency resampling.
"""

import pytest
import pandas as pd
import numpy as np
from app.data.alignment import align_time_series


def test_align_time_series_1h():
    # 6 observations at 10-minute intervals
    df = pd.DataFrame({
        "timestamp": pd.date_range("2016-12-01 10:00:00", periods=6, freq="10min", tz="UTC"),
        "temperature": [10.0, 12.0, 14.0, 16.0, 18.0, 20.0],
        "station_id": ["MAITRI"] * 6
    })

    res = align_time_series(df, frequency="1h")

    assert len(res) == 1
    assert res.iloc[0]["temperature"] == 15.0  # mean of 10, 12, 14, 16, 18, 20
    assert res.iloc[0]["station_id"] == "MAITRI"


def test_align_time_series_15min():
    # 4 observations at 5-minute intervals
    df = pd.DataFrame({
        "timestamp": pd.date_range("2016-12-01 10:00:00", periods=6, freq="5min", tz="UTC"),
        "total_load": [40.0, 42.0, 44.0, 46.0, 48.0, 50.0]
    })

    res = align_time_series(df, frequency="15min")

    assert len(res) == 2
    # First 15min bucket (10:00, 10:05, 10:10): mean of 40, 42, 44 = 42.0
    assert res.iloc[0]["total_load"] == 42.0
    # Second 15min bucket (10:15, 10:20, 10:25): mean of 46, 48, 50 = 48.0
    assert res.iloc[1]["total_load"] == 48.0


def test_align_time_series_empty():
    df = pd.DataFrame()
    res = align_time_series(df, frequency="1h")
    assert res.empty
