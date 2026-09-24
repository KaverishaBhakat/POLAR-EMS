"""
Unit tests for feature engineering (calendar, cyclical, lags, rolling stats).
"""

import pytest
import pandas as pd
import numpy as np
from app.data.features import (
    add_calendar_features,
    add_lag_features,
    add_rolling_features,
    align_with_weather_features
)


def test_add_calendar_features_all():
    df = pd.DataFrame({
        "timestamp": pd.to_datetime(["2016-12-01 10:00:00", "2016-12-04 15:00:00"], utc=True)
    })

    res = add_calendar_features(df)

    assert "hour" in res.columns
    assert "day_of_week" in res.columns
    assert "day_of_month" in res.columns
    assert "day_of_year" in res.columns
    assert "month" in res.columns
    assert "week_of_year" in res.columns
    assert "is_weekend" in res.columns
    assert "hour_sin" in res.columns
    assert "hour_cos" in res.columns
    assert "month_sin" in res.columns
    assert "month_cos" in res.columns

    # 2016-12-01 is a Thursday (day_of_week = 3), not weekend (0)
    assert res.iloc[0]["hour"] == 10
    assert res.iloc[0]["day_of_month"] == 1
    assert res.iloc[0]["month"] == 12
    assert res.iloc[0]["is_weekend"] == 0

    # 2016-12-04 is a Sunday (day_of_week = 6), is_weekend (1)
    assert res.iloc[1]["day_of_week"] == 6
    assert res.iloc[1]["is_weekend"] == 1


def test_add_lag_features_custom():
    df = pd.DataFrame({
        "total_load": [10.0, 20.0, 30.0, 40.0, 50.0]
    })

    res = add_lag_features(df, target_col="total_load", lags=[1, 2, 24])

    assert "lag_1" in res.columns
    assert "lag_2" in res.columns
    # lag_24 should be skipped because dataset length is 5 < 24
    assert "lag_24" not in res.columns

    assert np.isnan(res.iloc[0]["lag_1"])
    assert res.iloc[1]["lag_1"] == 10.0
    assert res.iloc[2]["lag_2"] == 10.0


def test_add_rolling_features_shift_leak_prevention():
    df = pd.DataFrame({
        "total_load": [10.0, 20.0, 30.0, 40.0, 50.0]
    })

    res = add_rolling_features(df, target_col="total_load", windows=[3])

    assert "rolling_mean_3" in res.columns
    # Row index 3 (value 40.0): previous 3 observations are [10, 20, 30] -> mean = 20.0
    assert res.iloc[3]["rolling_mean_3"] == 20.0
