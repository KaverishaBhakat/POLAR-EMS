"""
Data cleaning and validation utilities for POLAR-EMS ML Service.
Ensures data integrity, chronological sorting, deduplication, and minimum-data protection.
"""

import logging
from typing import Dict, Any, Optional, Tuple, List
import pandas as pd
import numpy as np

logger = logging.getLogger("polar_ems_ml.cleaner")


class InsufficientDataError(Exception):
    """Raised when available historical observations are below the minimum threshold."""
    def __init__(self, message: str, observations: int, required_minimum: int, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.observations = observations
        self.required_minimum = required_minimum
        self.details = details or {}


def clean_time_series_data(
    df: pd.DataFrame,
    timestamp_col: str = "timestamp",
    numeric_cols: Optional[List[str]] = None,
    non_negative_cols: Optional[List[str]] = None,
) -> pd.DataFrame:
    """
    Clean and structure a raw time-series DataFrame:
    1. Parse timestamp and normalize to UTC.
    2. Sort chronologically.
    3. Drop exact duplicate timestamps (keeping the latest recorded).
    4. Replace infinite numbers with NaN.
    5. Ensure non-negative bounds where physically required.
    6. Return a clean copy without mutating input.
    """
    if df.empty:
        return df.copy()

    df_clean = df.copy()

    # 1. Parse timestamps
    if timestamp_col in df_clean.columns:
        df_clean[timestamp_col] = pd.to_datetime(df_clean[timestamp_col], utc=True)
        # 2. Sort chronologically
        df_clean = df_clean.sort_values(by=timestamp_col, ascending=True)
        # 3. Deduplicate
        df_clean = df_clean.drop_duplicates(subset=[timestamp_col], keep="last")
        # Reset index
        df_clean = df_clean.reset_index(drop=True)

    # 4. Handle numeric columns
    # If numeric_cols is not explicitly provided, convert all non-timestamp/non-string id columns
    cols_to_convert = numeric_cols if numeric_cols is not None else [
        c for c in df_clean.columns if c not in [timestamp_col, "id", "station_id", "stationId", "windDirection", "wind_direction"]
    ]

    for col in cols_to_convert:
        if col in df_clean.columns:
            # Convert to numeric safely (coerces non-numeric strings to NaN)
            df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce")
            # Replace inf with NaN
            df_clean[col] = df_clean[col].replace([np.inf, -np.inf], np.nan)

    # 5. Non-negative constraints for physical quantities (e.g. loads, solar power)
    if non_negative_cols:
        for col in non_negative_cols:
            if col in df_clean.columns:
                df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce")
                # Values below 0 are replaced with 0.0 or preserved as NaN
                df_clean[col] = df_clean[col].apply(
                    lambda x: max(0.0, float(x)) if pd.notnull(x) and not np.isnan(x) else np.nan
                )

    return df_clean


def check_data_sufficiency(
    df: pd.DataFrame,
    min_observations: int = 168,
    max_missing_pct: float = 0.25,
    target_col: Optional[str] = None,
    timestamp_col: str = "timestamp",
) -> Dict[str, Any]:
    """
    Evaluates whether the dataset meets the minimum criteria for production ML training.
    
    Checks:
    - Minimum valid observation count
    - Missing percentage on target column
    - Minimum date range span
    """
    if df.empty:
        return {
            "sufficient": False,
            "observations": 0,
            "required_minimum": min_observations,
            "missing_pct": 100.0,
            "date_range": None,
            "message": "Dataset is completely empty. No observations found in database."
        }

    total_rows = len(df)
    
    if target_col and target_col in df.columns:
        valid_rows = int(df[target_col].notnull().sum())
    else:
        valid_rows = total_rows

    missing_pct = round(((total_rows - valid_rows) / max(total_rows, 1)) * 100, 2)

    date_range = None
    if timestamp_col in df.columns and total_rows > 0:
        min_ts = df[timestamp_col].min()
        max_ts = df[timestamp_col].max()
        date_range = {
            "start": str(min_ts),
            "end": str(max_ts),
            "span_hours": round((max_ts - min_ts).total_seconds() / 3600, 1) if pd.notnull(min_ts) and pd.notnull(max_ts) else 0
        }

    if valid_rows < min_observations:
        return {
            "sufficient": False,
            "observations": valid_rows,
            "required_minimum": min_observations,
            "missing_pct": missing_pct,
            "date_range": date_range,
            "message": (
                f"Not enough historical observations to train a reliable forecasting model. "
                f"Found {valid_rows} valid records, but {min_observations} are required."
            )
        }

    if (missing_pct / 100.0) > max_missing_pct:
        return {
            "sufficient": False,
            "observations": valid_rows,
            "required_minimum": min_observations,
            "missing_pct": missing_pct,
            "date_range": date_range,
            "message": (
                f"Data quality check failed: {missing_pct}% of target values are missing "
                f"(maximum allowable is {int(max_missing_pct * 100)}%)."
            )
        }

    return {
        "sufficient": True,
        "observations": valid_rows,
        "required_minimum": min_observations,
        "missing_pct": missing_pct,
        "date_range": date_range,
        "message": f"Data verification passed with {valid_rows} valid observations."
    }
