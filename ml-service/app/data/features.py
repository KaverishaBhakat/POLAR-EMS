"""
Feature Engineering Module for POLAR-EMS ML Service.
Extracts temporal, cyclical, autoregressive lag, and rolling statistics for tabular ML datasets.
"""

import logging
from typing import List, Optional, Dict, Any, Union
import pandas as pd
import numpy as np

logger = logging.getLogger("polar_ems_ml.features")

# Default lag and rolling parameters
DEFAULT_LAGS: List[int] = [1, 2, 3, 6, 12, 24]
DEFAULT_ROLLING_WINDOWS: List[int] = [3, 6, 12, 24]

# Weather columns matching PostgreSQL schema
AVAILABLE_WEATHER_COLUMNS: List[str] = [
    "temperature",
    "pressure",
    "humidity",
    "wind_speed",
    "solar_radiation",
]


def add_calendar_features(
    df: pd.DataFrame,
    timestamp_col: str = "timestamp"
) -> pd.DataFrame:
    """
    Extracts temporal and cyclical features from a timestamp column:
    - hour (0-23)
    - day_of_week (0-6)
    - day_of_month (1-31)
    - day_of_year (1-366)
    - month (1-12)
    - week_of_year (1-53)
    - is_weekend (0 or 1)
    - hour_sin, hour_cos (cyclical 24h)
    - month_sin, month_cos (cyclical 12m)
    """
    df_feat = df.copy()
    if timestamp_col not in df_feat.columns:
        raise ValueError(f"Timestamp column '{timestamp_col}' not found in DataFrame.")

    ts = pd.to_datetime(df_feat[timestamp_col], utc=True)

    df_feat["hour"] = ts.dt.hour
    df_feat["day_of_week"] = ts.dt.dayofweek
    df_feat["day_of_month"] = ts.dt.day
    df_feat["day_of_year"] = ts.dt.dayofyear
    df_feat["month"] = ts.dt.month
    df_feat["week_of_year"] = ts.dt.isocalendar().week.astype(int)
    df_feat["is_weekend"] = (ts.dt.dayofweek >= 5).astype(int)

    # Cyclical representations preserving continuity
    df_feat["hour_sin"] = np.sin(2 * np.pi * df_feat["hour"] / 24.0)
    df_feat["hour_cos"] = np.cos(2 * np.pi * df_feat["hour"] / 24.0)
    df_feat["month_sin"] = np.sin(2 * np.pi * (df_feat["month"] - 1) / 12.0)
    df_feat["month_cos"] = np.cos(2 * np.pi * (df_feat["month"] - 1) / 12.0)

    return df_feat


def add_lag_features(
    df: pd.DataFrame,
    target_col: str,
    lags: Optional[List[int]] = None
) -> pd.DataFrame:
    """
    Generates historical autoregressive lag features for the specified target column.
    
    Only creates lags where length of DataFrame allows it.
    """
    if lags is None:
        lags = DEFAULT_LAGS

    df_feat = df.copy()
    if target_col not in df_feat.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    total_rows = len(df_feat)
    applied_lags = []
    for lag in lags:
        if lag < total_rows:
            df_feat[f"lag_{lag}"] = df_feat[target_col].shift(lag)
            applied_lags.append(lag)
        else:
            logger.debug(f"Skipping lag_{lag}: dataset length ({total_rows}) is less than or equal to lag window.")

    return df_feat


def add_rolling_features(
    df: pd.DataFrame,
    target_col: str,
    windows: Optional[List[int]] = None,
    metrics: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Generates rolling statistics (mean, std) for the specified target column.
    
    IMPORTANT: Shifts target by 1 step before computing rolling statistics
    to prevent target leakage of the current time observation.
    """
    if windows is None:
        windows = DEFAULT_ROLLING_WINDOWS
    if metrics is None:
        metrics = ["mean", "std"]

    df_feat = df.copy()
    if target_col not in df_feat.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    total_rows = len(df_feat)
    shifted_target = df_feat[target_col].shift(1)

    for w in windows:
        if w <= total_rows:
            if "mean" in metrics:
                df_feat[f"rolling_mean_{w}"] = shifted_target.rolling(window=w, min_periods=1).mean()
            if "std" in metrics and w >= 2:
                df_feat[f"rolling_std_{w}"] = shifted_target.rolling(window=w, min_periods=2).std().fillna(0.0)

    return df_feat


def align_with_weather_features(
    target_df: pd.DataFrame,
    weather_df: pd.DataFrame,
    timestamp_col: str = "timestamp"
) -> pd.DataFrame:
    """
    Merges target dataset with weather dataset on timestamp using nearest-time alignment.
    Only includes existing valid weather columns from schema.
    """
    if weather_df.empty:
        return target_df.copy()

    w_df = weather_df.copy()
    w_df[timestamp_col] = pd.to_datetime(w_df[timestamp_col], utc=True)
    target_copy = target_df.copy()
    target_copy[timestamp_col] = pd.to_datetime(target_copy[timestamp_col], utc=True)

    weather_cols_to_keep = [c for c in AVAILABLE_WEATHER_COLUMNS if c in w_df.columns]
    if not weather_cols_to_keep:
        return target_copy

    cols = [timestamp_col] + weather_cols_to_keep
    merged = pd.merge_asof(
        target_copy.sort_values(timestamp_col),
        w_df[cols].sort_values(timestamp_col),
        on=timestamp_col,
        direction="nearest",
        tolerance=pd.Timedelta("1 hour")
    )

    return merged


def build_feature_matrix(
    target_df: pd.DataFrame,
    target_col: str,
    weather_df: Optional[pd.DataFrame] = None,
    drop_na_rows: bool = True
) -> pd.DataFrame:
    """
    End-to-end feature pipeline:
    1. Calendar & cyclical features
    2. Weather alignment (if available)
    3. Lag features
    4. Rolling statistic features
    5. Drop initial NaN rows if requested
    """
    df_feat = add_calendar_features(target_df)

    if weather_df is not None and not weather_df.empty:
        df_feat = align_with_weather_features(df_feat, weather_df)

    df_feat = add_lag_features(df_feat, target_col=target_col)
    df_feat = add_rolling_features(df_feat, target_col=target_col)

    if drop_na_rows:
        max_lag = max(DEFAULT_LAGS)
        if len(df_feat) > max_lag:
            df_feat = df_feat.iloc[max_lag:].reset_index(drop=True)

    return df_feat

