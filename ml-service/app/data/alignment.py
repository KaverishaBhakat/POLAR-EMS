"""
Time Alignment and Resampling Module for POLAR-EMS ML Service.
Aligns irregular or high-frequency time-series data into standard regular frequencies
("1min", "15min", "1h", "1d") with domain-appropriate aggregation semantics.
"""

import logging
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np

logger = logging.getLogger("polar_ems_ml.alignment")

# Standard frequency mapping to Pandas frequency aliases
FREQUENCY_MAP: Dict[str, str] = {
    "1min": "1min",
    "1m": "1min",
    "15min": "15min",
    "15m": "15min",
    "30min": "30min",
    "1h": "1h",
    "1H": "1h",
    "1d": "1D",
    "1D": "1D",
}


def align_time_series(
    df: pd.DataFrame,
    frequency: str = "1h",
    timestamp_col: str = "timestamp",
    agg_rules: Optional[Dict[str, str]] = None,
) -> pd.DataFrame:
    """
    Resample and align time-series DataFrame to a uniform regular frequency.
    
    Aggregation Semantics:
    - Continuous physical measurements (temperature, pressure, humidity, wind_speed,
      solar_radiation, load, power): aggregated via 'mean' over each interval.
    - Categorical / identifier attributes (station_id, wind_direction): preserved via 'first'.
    - Metadata timestamps: reset index to maintain 'timestamp' as a column.
    
    Supported frequencies:
      - '1min', '15min', '30min', '1h', '1d'
    
    Returns a new aligned DataFrame. Does not mutate the input DataFrame.
    """
    if df.empty:
        return df.copy()

    norm_freq = FREQUENCY_MAP.get(frequency, frequency)

    df_align = df.copy()
    if timestamp_col not in df_align.columns:
        raise ValueError(f"Timestamp column '{timestamp_col}' not found in DataFrame.")

    df_align[timestamp_col] = pd.to_datetime(df_align[timestamp_col], utc=True)
    df_align = df_align.set_index(timestamp_col)

    # Build default aggregation mapping
    agg_dict: Dict[str, Any] = {}
    for col in df_align.columns:
        if agg_rules and col in agg_rules:
            agg_dict[col] = agg_rules[col]
        elif pd.api.types.is_numeric_dtype(df_align[col]):
            agg_dict[col] = "mean"
        else:
            agg_dict[col] = "first"

    # Perform time resampling
    resampled = df_align.resample(norm_freq).agg(agg_dict)

    # Reset timestamp index back to column
    resampled = resampled.reset_index()

    # Drop intervals where all feature values are NaN (i.e. periods with no observations)
    feature_cols = [c for c in df_align.columns if c in resampled.columns]
    if feature_cols:
        resampled = resampled.dropna(subset=feature_cols, how="all").reset_index(drop=True)

    logger.info(
        f"Aligned time series from {len(df)} rows to {len(resampled)} rows at frequency '{frequency}'"
    )
    return resampled
