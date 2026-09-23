"""
24-Hour Horizon Multi-step Recursive Forecaster for POLAR-EMS ML Service.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from app.config import settings
from app.database.postgres import resolve_station
from app.data.loader import load_weather_data, load_energy_data, load_renewable_data
from app.data.cleaner import clean_time_series_data
from app.data.features import (
    add_calendar_features,
    DEFAULT_LAGS,
    DEFAULT_ROLLING_WINDOWS,
    AVAILABLE_WEATHER_COLUMNS
)
from app.models.energy_forecaster import EnergyForecaster
from app.models.renewable_forecaster import RenewableForecaster

logger = logging.getLogger("polar_ems_ml.predictor")


def generate_forecast_step_features(
    history_df: pd.DataFrame,
    target_col: str,
    target_ts: pd.Timestamp,
    weather_row: Optional[pd.Series] = None,
    expected_feature_names: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Constructs a single-row feature vector for forecasting timestamp `target_ts`
    using historical series up to target_ts.
    """
    row_dict: Dict[str, Any] = {"timestamp": target_ts}

    # Calendar & Cyclical features
    cal_df = add_calendar_features(pd.DataFrame([row_dict]))
    for c in ["hour", "day_of_week", "day_of_year", "month", "is_weekend",
              "hour_sin", "hour_cos", "month_sin", "month_cos"]:
        row_dict[c] = cal_df[c].iloc[0]

    # Weather features
    if weather_row is not None:
        for wcol in AVAILABLE_WEATHER_COLUMNS:
            if wcol in weather_row:
                row_dict[wcol] = weather_row[wcol]

    # Target series from history (sorted chronologically)
    history_values = history_df[target_col].dropna().values

    # Lag features
    for lag in DEFAULT_LAGS:
        if len(history_values) >= lag:
            row_dict[f"lag_{lag}"] = float(history_values[-lag])
        else:
            row_dict[f"lag_{lag}"] = float(history_values[0]) if len(history_values) > 0 else 0.0

    # Rolling features
    for w in DEFAULT_ROLLING_WINDOWS:
        if len(history_values) >= 1:
            window_slice = history_values[-w:] if len(history_values) >= w else history_values
            row_dict[f"rolling_mean_{w}"] = float(np.mean(window_slice))
        else:
            row_dict[f"rolling_mean_{w}"] = 0.0

    for w in [6, 24]:
        if len(history_values) >= 2:
            window_slice = history_values[-w:] if len(history_values) >= w else history_values
            row_dict[f"rolling_std_{w}"] = float(np.std(window_slice, ddof=1)) if len(window_slice) > 1 else 0.0
        else:
            row_dict[f"rolling_std_{w}"] = 0.0

    feat_df = pd.DataFrame([row_dict])
    
    # Fill any missing expected features with 0.0 or NaN
    if expected_feature_names:
        for f in expected_feature_names:
            if f not in feat_df.columns:
                feat_df[f] = 0.0

    return feat_df


def forecast_energy(
    station_identifier: str,
    horizon_hours: int = 24
) -> Dict[str, Any]:
    """
    Generate 24-hour energy demand forecast for a station.
    """
    station = resolve_station(station_identifier)
    if not station:
        return {
            "status": "error",
            "message": f"Station '{station_identifier}' not found in database."
        }

    station_id = station["id"]
    station_code = station["code"]

    logger.info(f"Energy forecast requested for station={station_code}, horizon={horizon_hours}h")

    # 1. Load Model
    forecaster = EnergyForecaster(station_code=station_code)
    if not forecaster.load():
        return {
            "status": "not_trained",
            "message": f"Energy forecasting model for station '{station_code}' is not trained yet. Please trigger POST /train/energy first."
        }

    # 2. Load latest historical energy and weather data
    raw_energy = load_energy_data(station_id)
    if raw_energy.empty:
        return {
            "status": "insufficient_data",
            "message": f"No historical energy load readings available for station '{station_code}' to seed the forecast."
        }

    clean_energy = clean_time_series_data(raw_energy, timestamp_col="timestamp", non_negative_cols=["total_load"])
    raw_weather = load_weather_data(station_id)
    clean_weather = clean_time_series_data(raw_weather, timestamp_col="timestamp")

    last_ts = clean_energy["timestamp"].max()
    now_ts = datetime.now(timezone.utc)
    base_ts = last_ts if pd.notnull(last_ts) else now_ts

    # Extract latest weather values for exogenous features
    latest_weather_row = None
    if not clean_weather.empty:
        latest_weather_row = clean_weather.iloc[-1]

    # 3. Recursive 24-Hour Forecasting Loop
    history_tracker = clean_energy[["timestamp", "total_load"]].copy()
    predictions: List[Dict[str, Any]] = []

    for step in range(1, horizon_hours + 1):
        target_timestamp = base_ts + timedelta(hours=step)
        
        # Build feature vector for step
        feat_df = generate_forecast_step_features(
            history_df=history_tracker,
            target_col="total_load",
            target_ts=target_timestamp,
            weather_row=latest_weather_row,
            expected_feature_names=forecaster.feature_names
        )

        pred_val = float(forecaster.predict(feat_df)[0])
        pred_val = round(max(0.0, pred_val), 2)

        predictions.append({
            "timestamp": target_timestamp.isoformat(),
            "predicted_value": pred_val
        })

        # Append recursive prediction back to history for subsequent lag/rolling calculations
        new_row = pd.DataFrame([{"timestamp": target_timestamp, "total_load": pred_val}])
        history_tracker = pd.concat([history_tracker, new_row], ignore_index=True)

    logger.info(f"Energy forecast completed for station={station_code}. Generated {len(predictions)} predictions.")

    return {
        "status": "success",
        "station": station_code,
        "target": "energy_load",
        "unit": "kW",
        "horizon_hours": horizon_hours,
        "generated_at": now_ts.isoformat(),
        "predictions": predictions
    }


def forecast_renewable(
    station_identifier: str,
    horizon_hours: int = 24
) -> Dict[str, Any]:
    """
    Generate 24-hour renewable generation forecast for a station.
    """
    station = resolve_station(station_identifier)
    if not station:
        return {
            "status": "error",
            "message": f"Station '{station_identifier}' not found in database."
        }

    station_id = station["id"]
    station_code = station["code"]

    logger.info(f"Renewable forecast requested for station={station_code}, horizon={horizon_hours}h")

    # 1. Load Model
    forecaster = RenewableForecaster(station_code=station_code)
    if not forecaster.load():
        return {
            "status": "not_trained",
            "message": f"Renewable forecasting model for station '{station_code}' is not trained yet. Please trigger POST /train/renewable first."
        }

    # 2. Load latest historical renewable and weather data
    raw_renewable = load_renewable_data(station_id)
    if raw_renewable.empty:
        return {
            "status": "insufficient_data",
            "message": f"No historical renewable readings available for station '{station_code}' to seed the forecast."
        }

    clean_renewable = clean_time_series_data(
        raw_renewable,
        timestamp_col="timestamp",
        non_negative_cols=["total_renewable"]
    )
    raw_weather = load_weather_data(station_id)
    clean_weather = clean_time_series_data(raw_weather, timestamp_col="timestamp")

    last_ts = clean_renewable["timestamp"].max()
    now_ts = datetime.now(timezone.utc)
    base_ts = last_ts if pd.notnull(last_ts) else now_ts

    latest_weather_row = None
    if not clean_weather.empty:
        latest_weather_row = clean_weather.iloc[-1]

    # 3. Recursive 24-Hour Forecasting Loop
    history_tracker = clean_renewable[["timestamp", "total_renewable"]].copy()
    predictions: List[Dict[str, Any]] = []

    for step in range(1, horizon_hours + 1):
        target_timestamp = base_ts + timedelta(hours=step)
        
        # Build feature vector for step
        feat_df = generate_forecast_step_features(
            history_df=history_tracker,
            target_col="total_renewable",
            target_ts=target_timestamp,
            weather_row=latest_weather_row,
            expected_feature_names=forecaster.feature_names
        )

        pred_val = float(forecaster.predict(feat_df)[0])
        pred_val = round(max(0.0, pred_val), 2)

        predictions.append({
            "timestamp": target_timestamp.isoformat(),
            "predicted_value": pred_val
        })

        # Append recursive prediction back to history for subsequent lag/rolling calculations
        new_row = pd.DataFrame([{"timestamp": target_timestamp, "total_renewable": pred_val}])
        history_tracker = pd.concat([history_tracker, new_row], ignore_index=True)

    logger.info(f"Renewable forecast completed for station={station_code}. Generated {len(predictions)} predictions.")

    return {
        "status": "success",
        "station": station_code,
        "target": "renewable_generation",
        "unit": "kW",
        "horizon_hours": horizon_hours,
        "generated_at": now_ts.isoformat(),
        "predictions": predictions
    }
