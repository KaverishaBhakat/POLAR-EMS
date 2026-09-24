"""
Comprehensive Test Suite for POLAR-EMS Weather Forecasting Model & Pipeline.
Tests data loading, preprocessing, feature engineering, chronological split,
training, serialization, loading, prediction, and plotting.
"""

import os
from pathlib import Path
import pytest
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.data.weather_loader import (
    inspect_raw_datasets,
    load_or_process_weather_dataset,
    build_weather_feature_matrix,
)
from app.models.weather_forecaster import WeatherForecaster, predict_weather
from scripts.train_weather import generate_plots, run_training_pipeline


@pytest.fixture
def sample_weather_df():
    """Create a continuous 10-day hourly synthetic weather series for testing."""
    dates = pd.date_range("2019-01-01 00:00:00", periods=240, freq="1h", tz="UTC")
    # Base diurnal temperature curve
    hours = dates.hour
    temp = -10.0 + 5.0 * np.sin(2 * np.pi * hours / 24.0) + np.random.normal(0, 0.5, size=len(dates))
    pressure = 970.0 + np.random.normal(0, 2.0, size=len(dates))
    humidity = 65.0 + np.random.normal(0, 5.0, size=len(dates))
    wind_speed = 12.0 + np.random.exponential(5.0, size=len(dates))
    wind_direction = np.random.uniform(0, 360, size=len(dates))

    df = pd.DataFrame({
        "timestamp": dates,
        "temperature": temp,
        "pressure": pressure,
        "humidity": humidity,
        "wind_speed": wind_speed,
        "wind_direction": wind_direction,
    })
    return df


def test_inspect_raw_datasets():
    """Test raw dataset directory inspector."""
    inspection = inspect_raw_datasets()
    assert "raw_2019_count" in inspection
    assert inspection["raw_2019_count"] == 365
    assert "raw_historical_count" in inspection
    assert inspection["raw_historical_count"] >= 1


def test_load_or_process_weather_dataset():
    """Test loading the preprocessed hourly dataset."""
    df, report = load_or_process_weather_dataset()
    assert not df.empty
    assert "timestamp" in df.columns
    assert "temperature" in df.columns
    assert "pressure" in df.columns
    assert "humidity" in df.columns
    assert "wind_speed" in df.columns
    assert df["timestamp"].is_monotonic_increasing
    assert len(df) == 8760
    assert report["missing_values"] == 0


def test_feature_engineering(sample_weather_df):
    """Test feature matrix generation and data leakage prevention."""
    feature_df = build_weather_feature_matrix(sample_weather_df, target_col="temperature")
    
    # Check calendar features
    assert "hour" in feature_df.columns
    assert "month" in feature_df.columns
    assert "hour_sin" in feature_df.columns
    assert "hour_cos" in feature_df.columns

    # Check lag features
    assert "lag_1" in feature_df.columns
    assert "lag_2" in feature_df.columns
    assert "lag_24" in feature_df.columns

    # Check rolling features
    assert "rolling_mean_3" in feature_df.columns
    assert "rolling_mean_24" in feature_df.columns
    assert "rolling_std_6" in feature_df.columns

    # Ensure no NaN rows after max lag truncation
    assert feature_df.isnull().sum().sum() == 0
    assert len(feature_df) == len(sample_weather_df) - 24


def test_model_training_and_evaluation(sample_weather_df):
    """Test model training, fitting, and evaluation."""
    feature_df = build_weather_feature_matrix(sample_weather_df, target_col="temperature")
    feature_cols = [c for c in feature_df.columns if c not in ["timestamp", "temperature"]]

    train_size = int(len(feature_df) * 0.8)
    train_df = feature_df.iloc[:train_size]
    test_df = feature_df.iloc[train_size:]

    X_train, y_train = train_df[feature_cols], train_df["temperature"]
    X_test, y_test = test_df[feature_cols], test_df["temperature"]

    forecaster = WeatherForecaster(station_code="MAITRI", target_name="temperature")
    assert not forecaster.is_fitted

    forecaster.train(X_train, y_train, feature_names=feature_cols)
    assert forecaster.is_fitted

    preds = forecaster.predict(X_test)
    assert len(preds) == len(y_test)
    assert not np.isnan(preds).any()

    metrics = forecaster.evaluate(X_test, y_test)
    assert "mae" in metrics
    assert "rmse" in metrics
    assert "r2" in metrics
    assert metrics["r2"] > 0.0


def test_model_save_and_load(tmp_path, sample_weather_df):
    """Test saving and loading the model artifact and metadata."""
    feature_df = build_weather_feature_matrix(sample_weather_df, target_col="temperature")
    feature_cols = [c for c in feature_df.columns if c not in ["timestamp", "temperature"]]

    forecaster = WeatherForecaster(station_code="MAITRI", target_name="temperature")
    forecaster.train(feature_df[feature_cols], feature_df["temperature"], feature_names=feature_cols)

    save_model_file = tmp_path / "test_model.joblib"
    save_meta_file = tmp_path / "test_model_metadata.json"

    saved_path = forecaster.save(model_path=save_model_file, metadata_path=save_meta_file)
    assert save_model_file.exists()
    assert save_meta_file.exists()

    # Load into fresh instance
    new_forecaster = WeatherForecaster()
    new_forecaster.load(model_path=save_model_file, metadata_path=save_meta_file)
    assert new_forecaster.is_fitted
    assert new_forecaster.feature_names == feature_cols

    # Verify prediction matches exactly
    orig_preds = forecaster.predict(feature_df[feature_cols])
    new_preds = new_forecaster.predict(feature_df[feature_cols])
    np.testing.assert_allclose(orig_preds, new_preds)


def test_predict_weather_function(tmp_path, sample_weather_df):
    """Test top-level predict_weather function."""
    feature_df = build_weather_feature_matrix(sample_weather_df, target_col="temperature")
    feature_cols = [c for c in feature_df.columns if c not in ["timestamp", "temperature"]]

    forecaster = WeatherForecaster(station_code="MAITRI", target_name="temperature")
    forecaster.train(feature_df[feature_cols], feature_df["temperature"], feature_names=feature_cols)

    save_model_file = tmp_path / "weather_model.joblib"
    forecaster.save(model_path=save_model_file)

    preds = predict_weather(feature_df[feature_cols], model_path=save_model_file)
    assert len(preds) == len(feature_df)


def test_generate_plots(tmp_path, sample_weather_df):
    """Test plotting function creates all expected image files."""
    feature_df = build_weather_feature_matrix(sample_weather_df, target_col="temperature")
    feature_cols = [c for c in feature_df.columns if c not in ["timestamp", "temperature"]]

    train_size = int(len(feature_df) * 0.8)
    train_df = feature_df.iloc[:train_size]
    test_df = feature_df.iloc[train_size:]

    forecaster = WeatherForecaster()
    forecaster.train(train_df[feature_cols], train_df["temperature"], feature_names=feature_cols)
    y_test = test_df["temperature"].values
    y_pred = forecaster.predict(test_df[feature_cols])
    importances = {"lag_1": 0.5, "lag_2": 0.2, "hour": 0.1}

    plots = generate_plots(
        df_raw_hourly=sample_weather_df,
        train_df=train_df,
        test_df=test_df,
        y_test=y_test,
        y_pred=y_pred,
        feature_importances=importances,
        output_dir=tmp_path
    )

    for p_name, p_path in plots.items():
        assert Path(p_path).exists(), f"Plot {p_name} was not created at {p_path}"
        assert os.path.getsize(p_path) > 1000
