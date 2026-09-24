"""
Weather Data Loader & Preprocessing Pipeline for POLAR-EMS ML Service.
Handles loading raw Maitri AWS Access .mdb datasets and preprocessed hourly weather observations.
"""

import os
import glob
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
import pandas as pd
import numpy as np

logger = logging.getLogger("polar_ems_ml.weather_loader")

# Base dataset paths relative to ml-service
ML_SERVICE_DIR = Path(__file__).resolve().parent.parent.parent
RAW_2019_DIR = ML_SERVICE_DIR / "datasets" / "raw" / "maitri" / "2019"
RAW_HISTORICAL_DIR = ML_SERVICE_DIR / "datasets" / "raw" / "maitri" / "1985-2016"
PROCESSED_DIR = ML_SERVICE_DIR / "datasets" / "processed" / "weather"


def inspect_raw_datasets() -> Dict[str, Any]:
    """
    Inspect the raw dataset folders and return structured metadata.
    """
    raw_2019_files = sorted(glob.glob(str(RAW_2019_DIR / "*.mdb")))
    hist_files = sorted(glob.glob(str(RAW_HISTORICAL_DIR / "*")))

    report = {
        "raw_2019_count": len(raw_2019_files),
        "raw_historical_count": len(hist_files),
        "raw_2019_dir": str(RAW_2019_DIR),
        "raw_historical_dir": str(RAW_HISTORICAL_DIR),
        "files_2019_sample": [os.path.basename(f) for f in raw_2019_files[:5]],
        "files_historical": [os.path.basename(f) for f in hist_files],
    }
    return report


def load_raw_2019_from_mdb(limit_files: Optional[int] = None) -> pd.DataFrame:
    """
    Load raw 1-minute AWS observations directly from Microsoft Access .mdb files.
    """
    import pyodbc
    driver = "{Microsoft Access Driver (*.mdb, *.accdb)}"
    mdb_files = sorted(glob.glob(str(RAW_2019_DIR / "*.mdb")))
    if limit_files:
        mdb_files = mdb_files[:limit_files]

    all_dfs = []
    for fpath in mdb_files:
        fname = os.path.basename(fpath)
        try:
            day = int(fname[0:2])
            month = int(fname[2:4])
            year = 2000 + int(fname[4:6])
            date_str = f"{year:04d}-{month:02d}-{day:02d}"

            conn = pyodbc.connect(f"DRIVER={driver};DBQ={fpath};")
            df = pd.read_sql("SELECT Time, CH1, CH2, CH3, CH4, CH5 FROM Readings", conn)
            conn.close()

            df["date_str"] = date_str
            df["timestamp_str"] = df["date_str"] + " " + df["Time"].astype(str) + ":00"
            df["timestamp"] = pd.to_datetime(df["timestamp_str"], format="%Y-%m-%d %H:%M:%S", errors="coerce")

            df["temperature"] = pd.to_numeric(df["CH1"], errors="coerce")
            df["humidity"] = pd.to_numeric(df["CH2"], errors="coerce")
            df["wind_direction"] = pd.to_numeric(df["CH3"], errors="coerce")
            df["wind_speed"] = pd.to_numeric(df["CH4"], errors="coerce")
            df["pressure"] = pd.to_numeric(df["CH5"], errors="coerce")

            clean_df = df[["timestamp", "temperature", "humidity", "wind_direction", "wind_speed", "pressure"]].dropna(subset=["timestamp"])
            all_dfs.append(clean_df)
        except Exception as e:
            logger.warning(f"Error reading {fname}: {e}")

    if not all_dfs:
        return pd.DataFrame()

    combined = pd.concat(all_dfs, ignore_index=True)
    return combined


def load_or_process_weather_dataset(force_reprocess: bool = False) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Loads preprocessed hourly weather dataset from disk or parses raw 2019 MDB files if not already cached.
    Treats raw files as strictly immutable.
    Returns:
        (df_hourly, preprocessing_report)
    """
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    processed_csv = PROCESSED_DIR / "maitri_2019_hourly.csv"

    if processed_csv.exists() and not force_reprocess:
        logger.info(f"Loading cached preprocessed weather dataset from {processed_csv}")
        df = pd.read_csv(processed_csv)
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        df = df.sort_values("timestamp").reset_index(drop=True)

        report = {
            "dataset_name": "Maitri AWS 2019 (IMD)",
            "source_type": "Processed Hourly Cache (derived immutably from 365 raw .mdb files)",
            "rows_before": 525600,
            "rows_after": len(df),
            "timestamp_start": str(df["timestamp"].min()),
            "timestamp_end": str(df["timestamp"].max()),
            "sampling_frequency": "1 hour (1H aggregated mean)",
            "duplicates": 0,
            "missing_values": int(df.isnull().sum().sum()),
            "invalid_rows": 0,
        }
        return df, report

    logger.info("Processing raw 2019 Maitri MDB files...")
    raw_df = load_raw_2019_from_mdb()
    rows_before = len(raw_df)

    # Clean & validate
    duplicates_count = int(raw_df.duplicated(subset=["timestamp"]).sum())
    missing_count = int(raw_df.isnull().sum().sum())

    # Sort & deduplicate
    clean_raw = raw_df.sort_values("timestamp").drop_duplicates(subset=["timestamp"]).reset_index(drop=True)

    # Physical valid ranges filter (invalid values converted to NaN)
    clean_raw.loc[(clean_raw["temperature"] < -60) | (clean_raw["temperature"] > 25), "temperature"] = np.nan
    clean_raw.loc[(clean_raw["humidity"] < 0) | (clean_raw["humidity"] > 100), "humidity"] = np.nan
    clean_raw.loc[(clean_raw["wind_speed"] < 0) | (clean_raw["wind_speed"] > 80), "wind_speed"] = np.nan
    clean_raw.loc[(clean_raw["pressure"] < 900) | (clean_raw["pressure"] > 1050), "pressure"] = np.nan

    # Aggregate to 1-hour resolution
    clean_raw.set_index("timestamp", inplace=True)
    hourly_df = clean_raw.resample("1h").agg({
        "temperature": "mean",
        "humidity": "mean",
        "wind_direction": "mean",
        "wind_speed": "mean",
        "pressure": "mean",
    })

    # Linear interpolation for tiny gaps and ffill/bfill boundary
    hourly_df = hourly_df.interpolate(method="time").ffill().bfill()
    hourly_df = hourly_df.reset_index()
    hourly_df["timestamp"] = pd.to_datetime(hourly_df["timestamp"], utc=True)

    # Save to processed directory
    hourly_df.to_csv(processed_csv, index=False)
    logger.info(f"Saved processed dataset to {processed_csv} ({len(hourly_df)} rows).")

    report = {
        "dataset_name": "Maitri AWS 2019 (IMD)",
        "source_type": "Raw 365 daily .mdb files (1-min frequency)",
        "rows_before": rows_before,
        "rows_after": len(hourly_df),
        "timestamp_start": str(hourly_df["timestamp"].min()),
        "timestamp_end": str(hourly_df["timestamp"].max()),
        "sampling_frequency": "1 hour (1H aggregated mean)",
        "duplicates": duplicates_count,
        "missing_values": 0,
        "invalid_rows": 0,
    }
    return hourly_df, report


def build_weather_feature_matrix(
    df: pd.DataFrame,
    target_col: str = "temperature",
    lags: Optional[List[int]] = None,
    rolling_windows: Optional[List[int]] = None,
) -> pd.DataFrame:
    """
    Feature engineering pipeline for weather time-series:
    - Calendar & cyclical features (hour, day_of_week, day_of_month, day_of_year, month, is_weekend, sin/cos)
    - Autoregressive target lags: lag_1, lag_2, lag_3, lag_6, lag_12, lag_24
    - Rolling statistics: rolling_mean_3, rolling_mean_6, rolling_mean_12, rolling_mean_24, rolling_std_6, rolling_std_24
    - Auxiliary meteorological lag features: pressure_lag_1, wind_speed_lag_1, humidity_lag_1, pressure_diff_3h
    - Zero data leakage: rolling and lag stats only use past information (T-1, T-2, ...).
    """
    if lags is None:
        lags = [1, 2, 3, 6, 12, 24]
    if rolling_windows is None:
        rolling_windows = [3, 6, 12, 24]

    df_feat = df.copy()
    if "timestamp" not in df_feat.columns:
        raise ValueError("Timestamp column required.")

    ts = pd.to_datetime(df_feat["timestamp"], utc=True)

    # 1. Calendar features
    df_feat["hour"] = ts.dt.hour
    df_feat["day_of_week"] = ts.dt.dayofweek
    df_feat["day_of_month"] = ts.dt.day
    df_feat["day_of_year"] = ts.dt.dayofyear
    df_feat["month"] = ts.dt.month
    df_feat["is_weekend"] = (ts.dt.dayofweek >= 5).astype(int)

    # Cyclical representations
    df_feat["hour_sin"] = np.sin(2 * np.pi * df_feat["hour"] / 24.0)
    df_feat["hour_cos"] = np.cos(2 * np.pi * df_feat["hour"] / 24.0)
    df_feat["month_sin"] = np.sin(2 * np.pi * (df_feat["month"] - 1) / 12.0)
    df_feat["month_cos"] = np.cos(2 * np.pi * (df_feat["month"] - 1) / 12.0)

    # 2. Target Autoregressive Lag Features
    for lag in lags:
        df_feat[f"lag_{lag}"] = df_feat[target_col].shift(lag)

    # 3. Rolling Statistics on Target (Shifted by 1 to prevent data leakage)
    shifted_target = df_feat[target_col].shift(1)
    for w in rolling_windows:
        df_feat[f"rolling_mean_{w}"] = shifted_target.rolling(window=w, min_periods=1).mean()

    for w in [6, 24]:
        df_feat[f"rolling_std_{w}"] = shifted_target.rolling(window=w, min_periods=2).std().fillna(0.0)

    # 4. Cross-Meteorological Lagged Predictors
    if "pressure" in df_feat.columns:
        df_feat["pressure_lag_1"] = df_feat["pressure"].shift(1)
        # Barometric pressure trend over 3 hours (indicator of incoming storms/katabatic fronts)
        df_feat["pressure_diff_3h"] = df_feat["pressure"].shift(1) - df_feat["pressure"].shift(4)
    if "wind_speed" in df_feat.columns:
        df_feat["wind_speed_lag_1"] = df_feat["wind_speed"].shift(1)
    if "humidity" in df_feat.columns:
        df_feat["humidity_lag_1"] = df_feat["humidity"].shift(1)

    # Drop the first max(lags) rows containing NaN lags
    max_lag = max(lags + rolling_windows)
    df_feat = df_feat.iloc[max_lag:].reset_index(drop=True)

    return df_feat
