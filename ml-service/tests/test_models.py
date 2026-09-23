"""
Unit tests for Energy and Renewable forecasters, train/test split, and metric calculations.
"""

import pytest
import pandas as pd
import numpy as np
from app.models.energy_forecaster import EnergyForecaster
from app.models.renewable_forecaster import RenewableForecaster
from app.training.trainer import calculate_metrics, split_chronologically
from app.forecasting.predictor import generate_forecast_step_features


def test_chronological_split():
    df = pd.DataFrame({
        "id": range(100),
        "val": range(100)
    })
    train_df, test_df = split_chronologically(df, split_ratio=0.80)
    
    assert len(train_df) == 80
    assert len(test_df) == 20
    assert train_df.iloc[-1]["val"] == 79
    assert test_df.iloc[0]["val"] == 80


def test_calculate_metrics():
    y_true = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
    y_pred = np.array([11.0, 19.0, 30.0, 42.0, 48.0])
    
    metrics = calculate_metrics(y_true, y_pred)
    
    assert "mae" in metrics
    assert "rmse" in metrics
    assert "r2" in metrics
    assert "mape" in metrics
    assert metrics["mae"] == 1.2  # (|1| + |1| + 0 + |2| + |2|) / 5 = 6/5 = 1.2
    assert metrics["r2"] > 0.95


def test_energy_forecaster_train_predict_save_load(tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "MODEL_STORAGE_PATH", str(tmp_path))

    # Generate synthetic training dataframe
    np.random.seed(42)
    n = 200
    df = pd.DataFrame({
        "hour": np.tile(range(24), (n // 24) + 1)[:n],
        "hour_sin": np.sin(2 * np.pi * np.tile(range(24), (n // 24) + 1)[:n] / 24.0),
        "lag_1": np.random.uniform(40, 80, size=n),
        "rolling_mean_3": np.random.uniform(40, 80, size=n),
    })
    y = df["lag_1"] * 0.8 + df["hour"] * 0.5 + np.random.normal(0, 1, size=n)

    forecaster = EnergyForecaster(station_code="TEST_STATION")
    forecaster.train(df, y)

    # Predictions
    preds = forecaster.predict(df.iloc[:10])
    assert len(preds) == 10
    assert np.all(preds >= 0.0)

    # Save artifact
    save_path = forecaster.save({"test_meta": "value"})
    assert save_path.exists()

    # Load into new instance
    loaded_forecaster = EnergyForecaster(station_code="TEST_STATION")
    assert loaded_forecaster.load() is True
    assert loaded_forecaster.is_trained() is True
    assert loaded_forecaster.metadata.get("test_meta") == "value"

    loaded_preds = loaded_forecaster.predict(df.iloc[:10])
    assert np.allclose(preds, loaded_preds)


def test_renewable_forecaster_train_predict_save_load(tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "MODEL_STORAGE_PATH", str(tmp_path))

    np.random.seed(42)
    n = 200
    df = pd.DataFrame({
        "hour": np.tile(range(24), (n // 24) + 1)[:n],
        "solar_radiation": np.random.uniform(0, 500, size=n),
        "wind_speed": np.random.uniform(2, 20, size=n),
        "lag_1": np.random.uniform(0, 50, size=n),
    })
    y = np.maximum(0.0, df["solar_radiation"] * 0.05 + df["wind_speed"] * 1.2 + np.random.normal(0, 1, size=n))

    forecaster = RenewableForecaster(station_code="TEST_RENEWABLE")
    forecaster.train(df, y)

    preds = forecaster.predict(df.iloc[:10])
    assert len(preds) == 10
    assert np.all(preds >= 0.0)

    forecaster.save()
    loaded_forecaster = RenewableForecaster(station_code="TEST_RENEWABLE")
    assert loaded_forecaster.load() is True
    assert np.allclose(preds, loaded_forecaster.predict(df.iloc[:10]))


def test_recursive_step_feature_generation():
    history_df = pd.DataFrame({
        "timestamp": pd.date_range("2026-01-01 00:00:00", periods=48, freq="1h", tz="UTC"),
        "total_load": np.linspace(40, 60, 48)
    })
    target_ts = pd.Timestamp("2026-01-03 00:00:00", tz="UTC")
    
    step_feat = generate_forecast_step_features(
        history_df=history_df,
        target_col="total_load",
        target_ts=target_ts,
        expected_feature_names=["hour", "hour_sin", "lag_1", "lag_24", "rolling_mean_24"]
    )
    
    assert len(step_feat) == 1
    assert step_feat.iloc[0]["hour"] == 0
    assert step_feat.iloc[0]["lag_1"] == 60.0
    assert "rolling_mean_24" in step_feat.columns
