"""
Training pipeline for POLAR-EMS Forecasting Models.
Orchestrates data loading, cleaning, chronological 80/20 train-test splitting,
model training, evaluation (MAE, RMSE, R2, safe MAPE), and artifact persistence.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.config import settings
from app.database.postgres import resolve_station
from app.data.loader import load_weather_data, load_energy_data, load_renewable_data
from app.data.cleaner import clean_time_series_data, check_data_sufficiency
from app.data.features import build_feature_matrix, AVAILABLE_WEATHER_COLUMNS
from app.models.energy_forecaster import EnergyForecaster
from app.models.renewable_forecaster import RenewableForecaster

logger = logging.getLogger("polar_ems_ml.trainer")


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Computes regression evaluation metrics: MAE, RMSE, R2, and zero-safe MAPE.
    """
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))

    # Safe MAPE: only evaluate on non-zero values (> 0.1) to prevent division by zero
    non_zero_mask = np.abs(y_true) > 0.1
    if np.any(non_zero_mask):
        mape = float(np.mean(np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) / y_true[non_zero_mask])) * 100.0)
    else:
        mape = 0.0

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "mape": round(mape, 2),
    }


def split_chronologically(
    df: pd.DataFrame,
    split_ratio: float = 0.80
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Chronological time-series split.
    Earliest observations -> Train, Latest observations -> Test.
    Prevents temporal data leakage.
    """
    n = len(df)
    train_size = int(n * split_ratio)
    train_df = df.iloc[:train_size].reset_index(drop=True)
    test_df = df.iloc[train_size:].reset_index(drop=True)
    return train_df, test_df


def train_energy_model(
    station_identifier: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_observations: Optional[int] = None
) -> Dict[str, Any]:
    """
    Train and save an energy load forecaster for the given station.
    Target: total_load (from energy_loads table).
    """
    min_obs = min_observations or settings.MIN_TRAINING_OBSERVATIONS
    
    # 1. Resolve Station
    station = resolve_station(station_identifier)
    if not station:
        return {
            "status": "error",
            "message": f"Station '{station_identifier}' not found in database.",
        }

    station_id = station["id"]
    station_code = station["code"]
    station_name = station["name"]

    logger.info(
        f"Starting energy model training for station={station_code} ({station_name}), "
        f"date_range=[{start_date or 'ALL'} to {end_date or 'ALL'}]"
    )

    # 2. Load Data from PostgreSQL
    try:
        raw_energy_df = load_energy_data(station_id, start_date=start_date, end_date=end_date)
        raw_weather_df = load_weather_data(station_id, start_date=start_date, end_date=end_date)
    except Exception as e:
        logger.error(f"Failed to load data for station {station_code}: {e}")
        return {
            "status": "error",
            "message": f"Database read failure: {str(e)}"
        }

    # 3. Clean and Validate
    clean_energy = clean_time_series_data(
        raw_energy_df,
        timestamp_col="timestamp",
        non_negative_cols=["total_load"]
    )
    clean_weather = clean_time_series_data(raw_weather_df, timestamp_col="timestamp")

    sufficiency = check_data_sufficiency(
        clean_energy,
        min_observations=min_obs,
        target_col="total_load"
    )

    if not sufficiency["sufficient"]:
        logger.warning(f"Energy training rejected for {station_code}: {sufficiency['message']}")
        return {
            "status": "insufficient_data",
            "station": station_code,
            "target": "total_load",
            "message": sufficiency["message"],
            "observations": sufficiency["observations"],
            "required_minimum": sufficiency["required_minimum"],
            "date_range": sufficiency["date_range"],
            "missing_pct": sufficiency["missing_pct"]
        }

    # 4. Feature Engineering
    feature_df = build_feature_matrix(
        target_df=clean_energy,
        target_col="total_load",
        weather_df=clean_weather,
        drop_na_rows=True
    )

    if len(feature_df) < (min_obs // 2):
        return {
            "status": "insufficient_data",
            "station": station_code,
            "target": "total_load",
            "message": f"After creating lag and rolling features, only {len(feature_df)} valid samples remain.",
            "observations": len(feature_df),
            "required_minimum": min_obs // 2
        }

    # Identify features
    exclude_cols = {"id", "station_id", "timestamp", "created_at", "total_load", 
                    "heating_load", "water_load", "communication_load", "laboratory_load",
                    "refrigeration_load", "flexible_load"}
    feature_cols = [c for c in feature_df.columns if c not in exclude_cols]

    # 5. Chronological Train/Test Split (80/20)
    train_df, test_df = split_chronologically(feature_df, split_ratio=0.80)

    X_train, y_train = train_df[feature_cols], train_df["total_load"]
    X_test, y_test = test_df[feature_cols], test_df["total_load"]

    # 6. Train HistGradientBoostingRegressor Model
    forecaster = EnergyForecaster(station_code=station_code)
    forecaster.train(X_train, y_train, feature_names=feature_cols)

    # 7. Evaluate on Test Set
    test_preds = forecaster.predict(X_test)
    metrics = calculate_metrics(y_test.values, test_preds)

    logger.info(
        f"Energy model training completed for {station_code}. "
        f"Train samples: {len(X_train)}, Test samples: {len(X_test)}, "
        f"MAE: {metrics['mae']} kW, RMSE: {metrics['rmse']} kW, R2: {metrics['r2']}"
    )

    # 8. Save Model Artifact
    now_iso = datetime.now(timezone.utc).isoformat()
    metadata = {
        "station_id": station_id,
        "station_code": station_code,
        "station_name": station_name,
        "target": "total_load",
        "unit": "kW",
        "trained_at": now_iso,
        "training_observations": len(X_train),
        "test_observations": len(X_test),
        "total_observations": len(feature_df),
        "feature_count": len(feature_cols),
        "feature_names": feature_cols,
        "metrics": metrics,
        "date_range": sufficiency["date_range"],
    }
    forecaster.metadata = metadata
    saved_path = forecaster.save(additional_metadata=metadata)

    return {
        "status": "success",
        "station": station_code,
        "target": "total_load",
        "unit": "kW",
        "trained_at": now_iso,
        "training_observations": len(X_train),
        "test_observations": len(X_test),
        "features": feature_cols,
        "metrics": metrics,
        "artifact_path": str(saved_path),
    }


def train_renewable_model(
    station_identifier: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_observations: Optional[int] = None
) -> Dict[str, Any]:
    """
    Train and save a renewable generation forecaster for the given station.
    Target: total_renewable (from renewable_generation table).
    """
    min_obs = min_observations or settings.MIN_TRAINING_OBSERVATIONS
    
    # 1. Resolve Station
    station = resolve_station(station_identifier)
    if not station:
        return {
            "status": "error",
            "message": f"Station '{station_identifier}' not found in database.",
        }

    station_id = station["id"]
    station_code = station["code"]
    station_name = station["name"]

    logger.info(
        f"Starting renewable model training for station={station_code} ({station_name}), "
        f"date_range=[{start_date or 'ALL'} to {end_date or 'ALL'}]"
    )

    # 2. Load Data from PostgreSQL
    try:
        raw_renewable_df = load_renewable_data(station_id, start_date=start_date, end_date=end_date)
        raw_weather_df = load_weather_data(station_id, start_date=start_date, end_date=end_date)
    except Exception as e:
        logger.error(f"Failed to load renewable data for station {station_code}: {e}")
        return {
            "status": "error",
            "message": f"Database read failure: {str(e)}"
        }

    # 3. Clean and Validate
    clean_renewable = clean_time_series_data(
        raw_renewable_df,
        timestamp_col="timestamp",
        non_negative_cols=["total_renewable", "solar_power", "wind_power"]
    )
    clean_weather = clean_time_series_data(raw_weather_df, timestamp_col="timestamp")

    sufficiency = check_data_sufficiency(
        clean_renewable,
        min_observations=min_obs,
        target_col="total_renewable"
    )

    if not sufficiency["sufficient"]:
        logger.warning(f"Renewable training rejected for {station_code}: {sufficiency['message']}")
        return {
            "status": "insufficient_data",
            "station": station_code,
            "target": "total_renewable",
            "message": sufficiency["message"],
            "observations": sufficiency["observations"],
            "required_minimum": sufficiency["required_minimum"],
            "date_range": sufficiency["date_range"],
            "missing_pct": sufficiency["missing_pct"]
        }

    # 4. Feature Engineering
    feature_df = build_feature_matrix(
        target_df=clean_renewable,
        target_col="total_renewable",
        weather_df=clean_weather,
        drop_na_rows=True
    )

    if len(feature_df) < (min_obs // 2):
        return {
            "status": "insufficient_data",
            "station": station_code,
            "target": "total_renewable",
            "message": f"After creating lag and rolling features, only {len(feature_df)} valid samples remain.",
            "observations": len(feature_df),
            "required_minimum": min_obs // 2
        }

    # Identify features
    exclude_cols = {"id", "station_id", "timestamp", "created_at", "total_renewable", "solar_power", "wind_power"}
    feature_cols = [c for c in feature_df.columns if c not in exclude_cols]

    # 5. Chronological Train/Test Split (80/20)
    train_df, test_df = split_chronologically(feature_df, split_ratio=0.80)

    X_train, y_train = train_df[feature_cols], train_df["total_renewable"]
    X_test, y_test = test_df[feature_cols], test_df["total_renewable"]

    # 6. Train HistGradientBoostingRegressor Model
    forecaster = RenewableForecaster(station_code=station_code)
    forecaster.train(X_train, y_train, feature_names=feature_cols)

    # 7. Evaluate on Test Set
    test_preds = forecaster.predict(X_test)
    metrics = calculate_metrics(y_test.values, test_preds)

    logger.info(
        f"Renewable model training completed for {station_code}. "
        f"Train samples: {len(X_train)}, Test samples: {len(X_test)}, "
        f"MAE: {metrics['mae']} kW, RMSE: {metrics['rmse']} kW, R2: {metrics['r2']}"
    )

    # 8. Save Model Artifact
    now_iso = datetime.now(timezone.utc).isoformat()
    metadata = {
        "station_id": station_id,
        "station_code": station_code,
        "station_name": station_name,
        "target": "total_renewable",
        "unit": "kW",
        "trained_at": now_iso,
        "training_observations": len(X_train),
        "test_observations": len(X_test),
        "total_observations": len(feature_df),
        "feature_count": len(feature_cols),
        "feature_names": feature_cols,
        "metrics": metrics,
        "date_range": sufficiency["date_range"],
    }
    forecaster.metadata = metadata
    saved_path = forecaster.save(additional_metadata=metadata)

    return {
        "status": "success",
        "station": station_code,
        "target": "total_renewable",
        "unit": "kW",
        "trained_at": now_iso,
        "training_observations": len(X_train),
        "test_observations": len(X_test),
        "features": feature_cols,
        "metrics": metrics,
        "artifact_path": str(saved_path),
    }
