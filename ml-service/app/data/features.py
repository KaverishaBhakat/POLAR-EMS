"""
Feature engineering module for POLAR-EMS ML Service.
Generates temporal, cyclical, lag, rolling, and weather-aligned features for tabular time-series models.
"""

import logging
from typing import List, Optional
import pandas as pd
import numpy as np

logger = logging.getLogger("polar_ems_ml.features")

# Standard lag and rolling windows
DEFAULT_LAGS: List[int] = [1, 2, 3, 6, 12, 24]
DEFAULT_ROLLING_WINDOWS: List[int] = [3, 6, 12, 24]

# Valid weather features matching schema.prisma WeatherData table
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
    Extracts cyclical and categorical time-series features from timestamp:
    - hour, day_of_week, day_of_year, month, is_weekend
    - hour_sin, hour_cos, month_sin, month_cos
    """
    df_feat = df.copy()
    if timestamp_col not in df_feat.columns:
        raise ValueError(f"Timestamp column '{timestamp_col}' not found in DataFrame.")

    ts = pd.to_datetime(df_feat[timestamp_col], utc=True)

    df_feat["hour"] = ts.dt.hour
    df_feat["day_of_week"] = ts.dt.dayofweek
    df_feat["day_of_year"] = ts.dt.dayofyear
    df_feat["month"] = ts.dt.month
    df_feat["is_weekend"] = (ts.dt.dayofweek >= 5).astype(int)

    # Cyclical representations to preserve continuity (e.g. hour 23 -> hour 0)
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
    Generates historical lag features for the specified target column.
    """
    if lags is None:
        lags = DEFAULT_LAGS

    df_feat = df.copy()
    if target_col not in df_feat.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    for lag in lags:
        df_feat[f"lag_{lag}"] = df_feat[target_col].shift(lag)

    return df_feat


def add_rolling_features(
    df: pd.DataFrame,
    target_col: str,
    windows: Optional[List[int]] = None
) -> pd.DataFrame:
    """
    Generates rolling mean and rolling std features for the target column.
    Note: shifts by 1 to prevent data leakage of the current observation.
    """
    if windows is None:
        windows = DEFAULT_ROLLING_WINDOWS

    df_feat = df.copy()
    if target_col not in df_feat.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    # Shift by 1 to only use strictly prior information
    shifted_target = df_feat[target_col].shift(1)

    for w in windows:
        df_feat[f"rolling_mean_{w}"] = shifted_target.rolling(window=w, min_periods=1).mean()

    # Add rolling std for standard windows
    for w in [6, 24]:
        if w in windows or w <= max(windows):
            df_feat[f"rolling_std_{w}"] = shifted_target.rolling(window=w, min_periods=2).std().fillna(0.0)

    return df_feat


def align_with_weather_features(
    target_df: pd.DataFrame,
    weather_df: pd.DataFrame,
    timestamp_col: str = "timestamp"
) -> pd.DataFrame:
    """
    Merges target dataset with weather dataset based on timestamp.
    Only includes existing weather columns matching schema.prisma.
    """
    if weather_df.empty:
        return target_df.copy()

    w_df = weather_df.copy()
    w_df[timestamp_col] = pd.to_datetime(w_df[timestamp_col], utc=True)
    target_copy = target_df.copy()
    target_copy[timestamp_col] = pd.to_datetime(target_copy[timestamp_col], utc=True)

    # Filter weather dataframe to valid available columns
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
    2. Historical lag features
    3. Rolling statistic features
    4. Aligned weather features (if available)
    5. Safe NaN handling for training
    """
    # Step 1: Calendar features
    df_feat = add_calendar_features(target_df)

    # Step 2: Weather features
    if weather_df is not None and not weather_df.empty:
        df_feat = align_with_weather_features(df_feat, weather_df)

    # Step 3: Lag features
    df_feat = add_lag_features(df_feat, target_col=target_col)

    # Step 4: Rolling features
    df_feat = add_rolling_features(df_feat, target_col=target_col)

    # Step 5: Filter rows with valid lags if training
    if drop_na_rows:
        max_lag = max(DEFAULT_LAGS)
        # Drop initial rows that lack sufficient history for lags
        df_feat = df_feat.iloc[max_lag:].reset_index(drop=True)

    return df_feat
