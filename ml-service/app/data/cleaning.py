"""
Data Validation and Cleaning utilities for POLAR-EMS ML Service.
Ensures data integrity, timestamp parsing, chronological sorting, deduplication,
numeric validation, and comprehensive validation reporting without silent deletions.
"""

import logging
from typing import Dict, Any, Optional, Tuple, List
import pandas as pd
import numpy as np

logger = logging.getLogger("polar_ems_ml.cleaning")


def validate_and_clean_time_series(
    df: pd.DataFrame,
    timestamp_col: str = "timestamp",
    numeric_cols: Optional[List[str]] = None,
    non_negative_cols: Optional[List[str]] = None,
    drop_all_nan_rows: bool = False,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Validates and cleans a time-series DataFrame.
    
    Operations performed:
    1. Validates timestamp column existence.
    2. Parses timestamps into UTC pandas datetimes.
    3. Sorts chronologically.
    4. Detects and handles duplicate timestamps (keeping the latest observation).
    5. Converts numeric columns safely, replacing inf/-inf with NaN.
    6. Applies non-negative physical bounds where required.
    7. Computes a detailed validation and cleaning report.
    
    Returns:
      (cleaned_df, validation_report)
    """
    rows_before = len(df)
    
    if df.empty:
        report = {
            "rows_before": 0,
            "rows_after": 0,
            "duplicates": 0,
            "missing_values": 0,
            "invalid_rows": 0,
            "start_time": None,
            "end_time": None,
            "column_missing_counts": {},
            "status": "empty",
            "message": "DataFrame is empty."
        }
        return df.copy(), report

    df_clean = df.copy()

    # 1. Verify and parse timestamp
    if timestamp_col not in df_clean.columns:
        report = {
            "rows_before": rows_before,
            "rows_after": rows_before,
            "duplicates": 0,
            "missing_values": int(df_clean.isna().sum().sum()),
            "invalid_rows": 0,
            "start_time": None,
            "end_time": None,
            "column_missing_counts": df_clean.isna().sum().to_dict(),
            "status": "error",
            "message": f"Required timestamp column '{timestamp_col}' not found."
        }
        return df_clean, report

    # Convert timestamp
    df_clean[timestamp_col] = pd.to_datetime(df_clean[timestamp_col], utc=True, errors="coerce")
    invalid_timestamps = int(df_clean[timestamp_col].isna().sum())
    if invalid_timestamps > 0:
        df_clean = df_clean.dropna(subset=[timestamp_col])

    # 2. Sort chronologically
    df_clean = df_clean.sort_values(by=timestamp_col, ascending=True)

    # 3. Detect and handle duplicates
    duplicate_count = int(df_clean.duplicated(subset=[timestamp_col]).sum())
    if duplicate_count > 0:
        df_clean = df_clean.drop_duplicates(subset=[timestamp_col], keep="last")

    df_clean = df_clean.reset_index(drop=True)

    # 4. Handle numeric columns
    cols_to_convert = numeric_cols if numeric_cols is not None else [
        c for c in df_clean.columns
        if c not in [timestamp_col, "id", "station_id", "stationId", "windDirection", "wind_direction", "created_at", "createdAt"]
    ]

    invalid_numeric_count = 0
    for col in cols_to_convert:
        if col in df_clean.columns:
            raw_series = df_clean[col].copy()
            coerced_series = pd.to_numeric(raw_series, errors="coerce")
            # Count how many non-null raw values became NaN (invalid strings) or were infinite
            invalid_mask = (
                (raw_series.notnull() & coerced_series.isna()) |
                coerced_series.isin([np.inf, -np.inf])
            )
            invalid_numeric_count += int(invalid_mask.sum())
            
            df_clean[col] = coerced_series.replace([np.inf, -np.inf], np.nan)

    # 5. Non-negative constraints for physical measurements (e.g. total_load, solar_power)
    if non_negative_cols:
        for col in non_negative_cols:
            if col in df_clean.columns:
                df_clean[col] = df_clean[col].apply(
                    lambda x: max(0.0, float(x)) if pd.notnull(x) and not np.isnan(x) else np.nan
                )

    # Optional: drop rows where all numeric target features are NaN
    if drop_all_nan_rows and cols_to_convert:
        before_drop = len(df_clean)
        df_clean = df_clean.dropna(subset=cols_to_convert, how="all").reset_index(drop=True)
        dropped_nan_rows = before_drop - len(df_clean)
    else:
        dropped_nan_rows = 0

    rows_after = len(df_clean)
    missing_counts = {str(k): int(v) for k, v in df_clean.isna().sum().to_dict().items()}
    total_missing = int(df_clean.isna().sum().sum())

    start_time = df_clean[timestamp_col].min().isoformat() if rows_after > 0 and pd.notnull(df_clean[timestamp_col].min()) else None
    end_time = df_clean[timestamp_col].max().isoformat() if rows_after > 0 and pd.notnull(df_clean[timestamp_col].max()) else None

    status = "clean"
    if duplicate_count > 0 or invalid_timestamps > 0 or invalid_numeric_count > 0:
        status = "cleaned_with_corrections"
    elif total_missing > 0:
        status = "has_missing_values"

    report = {
        "rows_before": rows_before,
        "rows_after": rows_after,
        "duplicates": duplicate_count,
        "missing_values": total_missing,
        "invalid_rows": invalid_timestamps + dropped_nan_rows,
        "invalid_numeric_values": invalid_numeric_count,
        "start_time": start_time,
        "end_time": end_time,
        "column_missing_counts": missing_counts,
        "status": status,
    }

    logger.info(
        f"Cleaned time-series: {rows_before} -> {rows_after} rows. "
        f"Duplicates removed: {duplicate_count}, Missing: {total_missing}"
    )

    return df_clean, report
