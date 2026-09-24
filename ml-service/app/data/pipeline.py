"""
ML Dataset Preparation Pipeline for POLAR-EMS ML Service.
Orchestrates: PostgreSQL Loading → Cleaning & Validation → Time Alignment → Feature Engineering → ML-Ready Output.
"""

import logging
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
import pandas as pd

from app.db import resolve_station_info
from app.data.loaders import load_weather_data, load_energy_data, load_renewable_data
from app.data.cleaning import validate_and_clean_time_series
from app.data.alignment import align_time_series
from app.data.features import (
    add_calendar_features,
    add_lag_features,
    add_rolling_features,
    align_with_weather_features,
    DEFAULT_LAGS,
    DEFAULT_ROLLING_WINDOWS,
)

logger = logging.getLogger("polar_ems_ml.pipeline")

DEFAULT_TARGET_COLUMNS = {
    "weather": "temperature",
    "energy": "total_load",
    "renewable": "total_renewable",
}


def prepare_ml_dataset(
    data_type: str,
    station_id: str,
    start_date: Optional[Union[str, datetime]] = None,
    end_date: Optional[Union[str, datetime]] = None,
    frequency: Optional[str] = None,
    target_col: Optional[str] = None,
    lags: Optional[List[int]] = None,
    rolling_windows: Optional[List[int]] = None,
    add_time_features: bool = True,
    include_weather: bool = False,
    drop_lag_na: bool = False,
) -> Dict[str, Any]:
    """
    End-to-end pipeline preparing an ML-ready dataset without modifying PostgreSQL data.
    
    Returns:
      {
        "data": pandas.DataFrame,
        "metadata": {
          "station_id": str,
          "station_code": str,
          "station_name": str,
          "data_type": str,
          "frequency": str,
          "rows": int,
          "start_time": str,
          "end_time": str,
          "features": List[str],
          "target_col": str
        },
        "validation_report": Dict[str, Any]
      }
    """
    dtype = data_type.lower()
    if dtype not in ["weather", "energy", "renewable"]:
        raise ValueError(f"Unsupported data_type '{data_type}'. Must be 'weather', 'energy', or 'renewable'.")

    # 1. Resolve Station Info
    station_info = resolve_station_info(station_id)
    station_code = station_info["code"] if station_info else station_id
    station_name = station_info["name"] if station_info else station_id
    actual_id = station_info["id"] if station_info else station_id

    # 2. Load Raw Data
    if dtype == "weather":
        raw_df = load_weather_data(actual_id, start_date=start_date, end_date=end_date)
        non_neg = ["solar_radiation", "humidity", "wind_speed"]
    elif dtype == "energy":
        raw_df = load_energy_data(actual_id, start_date=start_date, end_date=end_date)
        non_neg = ["total_load", "heating_load", "water_load", "communication_load",
                   "laboratory_load", "refrigeration_load", "flexible_load"]
    else:  # renewable
        raw_df = load_renewable_data(actual_id, start_date=start_date, end_date=end_date)
        non_neg = ["solar_power", "wind_power", "total_renewable"]

    # 3. Clean & Validate Time Series
    clean_df, validation_report = validate_and_clean_time_series(
        raw_df,
        timestamp_col="timestamp",
        non_negative_cols=non_neg
    )

    if clean_df.empty:
        return {
            "data": clean_df,
            "metadata": {
                "station_id": actual_id,
                "station_code": station_code,
                "station_name": station_name,
                "data_type": dtype,
                "frequency": frequency or "raw",
                "rows": 0,
                "start_time": None,
                "end_time": None,
                "features": [],
                "target_col": target_col or DEFAULT_TARGET_COLUMNS.get(dtype)
            },
            "validation_report": validation_report
        }

    # 4. Optional Frequency Alignment (Resampling)
    if frequency:
        clean_df = align_time_series(clean_df, frequency=frequency, timestamp_col="timestamp")

    # 5. Optional Exogenous Weather Alignment (for energy or renewable datasets)
    if include_weather and dtype in ["energy", "renewable"]:
        raw_weather = load_weather_data(actual_id, start_date=start_date, end_date=end_date)
        clean_weather, _ = validate_and_clean_time_series(raw_weather, timestamp_col="timestamp")
        if not clean_weather.empty:
            if frequency:
                clean_weather = align_time_series(clean_weather, frequency=frequency, timestamp_col="timestamp")
            clean_df = align_with_weather_features(clean_df, clean_weather, timestamp_col="timestamp")

    # 6. Add Calendar & Cyclical Features
    if add_time_features:
        clean_df = add_calendar_features(clean_df, timestamp_col="timestamp")

    # 7. Add Lag Features
    eff_target = target_col or DEFAULT_TARGET_COLUMNS.get(dtype)
    if lags is not None and eff_target and eff_target in clean_df.columns:
        clean_df = add_lag_features(clean_df, target_col=eff_target, lags=lags)

    # 8. Add Rolling Features
    if rolling_windows is not None and eff_target and eff_target in clean_df.columns:
        clean_df = add_rolling_features(clean_df, target_col=eff_target, windows=rolling_windows)

    # 9. Optional drop of initial NaN lag rows
    if drop_lag_na and lags:
        max_lag = max(lags)
        if len(clean_df) > max_lag:
            clean_df = clean_df.iloc[max_lag:].reset_index(drop=True)

    # Extract metadata details
    start_ts = clean_df["timestamp"].min().isoformat() if not clean_df.empty and pd.notnull(clean_df["timestamp"].min()) else None
    end_ts = clean_df["timestamp"].max().isoformat() if not clean_df.empty and pd.notnull(clean_df["timestamp"].max()) else None
    feature_names = [c for c in clean_df.columns if c not in ["id", "station_id", "stationId", "created_at", "createdAt"]]

    metadata = {
        "station_id": actual_id,
        "station_code": station_code,
        "station_name": station_name,
        "data_type": dtype,
        "frequency": frequency or "raw",
        "rows": len(clean_df),
        "start_time": start_ts,
        "end_time": end_ts,
        "features": feature_names,
        "target_col": eff_target
    }

    return {
        "data": clean_df,
        "metadata": metadata,
        "validation_report": validation_report
    }
