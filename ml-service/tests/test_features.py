"""
Unit tests for feature engineering pipeline in POLAR-EMS ML Service.
"""

import pytest
import pandas as pd
import numpy as np
from app.data.features import (
    add_calendar_features,
    add_lag_features,
    add_rolling_features,
    align_with_weather_features,
    build_feature_matrix
)


def test_add_calendar_features():
    df = pd.DataFrame({
        "timestamp": pd.to_datetime(["2026-06-15 00:00:00", "2026-06-15 12:00:00"], utc=True)
    })
    
    res = add_calendar_features(df)
    
    assert "hour" in res.columns
    assert "day_of_week" in res.columns
    assert "hour_sin" in res.columns
    assert "hour_cos" in res.columns
    assert "month_sin" in res.columns
    assert "month_cos" in res.columns
    
    # 00:00 hour should have hour=0, hour_sin=0, hour_cos=1
    assert res.iloc[0]["hour"] == 0
    assert np.isclose(res.iloc[0]["hour_sin"], 0.0)
    assert np.isclose(res.iloc[0]["hour_cos"], 1.0)
    
    # 12:00 hour should have hour=12, hour_sin~0, hour_cos~-1
    assert res.iloc[1]["hour"] == 12
    assert np.isclose(res.iloc[1]["hour_cos"], -1.0)


def test_add_lag_features():
    df = pd.DataFrame({
        "total_load": [10.0, 20.0, 30.0, 40.0, 50.0]
    })
    
    res = add_lag_features(df, target_col="total_load", lags=[1, 2])
    
    assert "lag_1" in res.columns
    assert "lag_2" in res.columns
    
    # Check shift correctness
    assert np.isnan(res.iloc[0]["lag_1"])
    assert res.iloc[1]["lag_1"] == 10.0
    assert res.iloc[2]["lag_1"] == 20.0
    assert res.iloc[2]["lag_2"] == 10.0


def test_add_rolling_features():
    df = pd.DataFrame({
        "total_load": [10.0, 20.0, 30.0, 40.0, 50.0]
    })
    
    res = add_rolling_features(df, target_col="total_load", windows=[3])
    
    assert "rolling_mean_3" in res.columns
    # Rolling is shifted by 1 to prevent target leakage
    # For index 3 (value 40), the previous 3 values are [10, 20, 30] -> mean = 20.0
    assert res.iloc[3]["rolling_mean_3"] == 20.0


def test_align_with_weather_features():
    energy_df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01 00:00:00", periods=5, freq="1h", tz="UTC"),
        "total_load": [50.0, 52.0, 55.0, 53.0, 51.0]
    })
    weather_df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01 00:00:00", periods=5, freq="1h", tz="UTC"),
        "temperature": [-25.0, -25.5, -26.0, -24.8, -23.5],
        "wind_speed": [12.0, 14.5, 18.0, 15.0, 10.0]
    })
    
    aligned = align_with_weather_features(energy_df, weather_df)
    
    assert "temperature" in aligned.columns
    assert "wind_speed" in aligned.columns
    assert len(aligned) == 5
    assert aligned.iloc[0]["temperature"] == -25.0


def test_build_feature_matrix_pipeline():
    energy_df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01 00:00:00", periods=100, freq="1h", tz="UTC"),
        "total_load": np.random.uniform(40, 80, size=100)
    })
    
    matrix = build_feature_matrix(energy_df, target_col="total_load", drop_na_rows=True)
    
    # 100 rows - 24 lag drop = 76 rows
    assert len(matrix) == 76
    assert "lag_24" in matrix.columns
    assert "rolling_mean_24" in matrix.columns
    assert "hour_sin" in matrix.columns
    assert matrix["lag_1"].isna().sum() == 0
