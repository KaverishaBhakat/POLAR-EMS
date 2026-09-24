"""
Data Pipeline API Endpoints for POLAR-EMS ML Service.
"""

import logging
from typing import Optional, List
import pandas as pd
from fastapi import APIRouter, HTTPException, Query, status

from app.db import resolve_station_info
from app.data.loaders import load_weather_data, load_energy_data, load_renewable_data
from app.data.cleaning import validate_and_clean_time_series
from app.data.pipeline import prepare_ml_dataset
from app.schemas.data_schemas import (
    RawDataResponse,
    PreparedDatasetResponse,
    ValidationReportSchema,
    DatasetMetadataSchema,
)

logger = logging.getLogger("polar_ems_ml.api")
router = APIRouter(prefix="/data", tags=["Data Pipeline"])


def _parse_int_list(csv_str: Optional[str]) -> Optional[List[int]]:
    """Parse comma-separated integer string (e.g. '1,2,3,24') to List[int]."""
    if not csv_str:
        return None
    try:
        return [int(x.strip()) for x in csv_str.split(",") if x.strip()]
    except ValueError:
        return None


def _format_dataframe_records(df: pd.DataFrame, limit: Optional[int] = None) -> List[dict]:
    """Helper to convert DataFrame rows to JSON-serializable dictionaries."""
    if df.empty:
        return []
    df_out = df.copy()
    if "timestamp" in df_out.columns:
        df_out["timestamp"] = df_out["timestamp"].astype(str)
    if "created_at" in df_out.columns:
        df_out["created_at"] = df_out["created_at"].astype(str)
    
    # Replace NaN / inf with None for valid JSON serialization
    records = df_out.where(pd.notnull(df_out), None).to_dict(orient="records")
    if limit and limit > 0:
        return records[:limit]
    return records


# ==========================================
# Raw Data Endpoints
# ==========================================

@router.get("/weather/{station_id}", response_model=RawDataResponse)
def get_raw_weather_data(
    station_id: str,
    start_date: Optional[str] = Query(None, description="Start date ISO filter"),
    end_date: Optional[str] = Query(None, description="End date ISO filter"),
    limit: int = Query(500, description="Max records to return", ge=1, le=5000),
):
    """Load historical weather records for a station with data validation."""
    station = resolve_station_info(station_id)
    raw_df = load_weather_data(station_id, start_date=start_date, end_date=end_date)
    clean_df, report = validate_and_clean_time_series(raw_df, timestamp_col="timestamp")

    return {
        "status": "success",
        "station_id": station["id"] if station else station_id,
        "station_code": station["code"] if station else station_id,
        "data_type": "weather",
        "total_rows": len(clean_df),
        "validation_report": report,
        "records": _format_dataframe_records(clean_df, limit=limit),
    }


@router.get("/energy/{station_id}", response_model=RawDataResponse)
def get_raw_energy_data(
    station_id: str,
    start_date: Optional[str] = Query(None, description="Start date ISO filter"),
    end_date: Optional[str] = Query(None, description="End date ISO filter"),
    limit: int = Query(500, description="Max records to return", ge=1, le=5000),
):
    """Load historical energy load records for a station with data validation."""
    station = resolve_station_info(station_id)
    raw_df = load_energy_data(station_id, start_date=start_date, end_date=end_date)
    clean_df, report = validate_and_clean_time_series(
        raw_df,
        timestamp_col="timestamp",
        non_negative_cols=["total_load"]
    )

    return {
        "status": "success",
        "station_id": station["id"] if station else station_id,
        "station_code": station["code"] if station else station_id,
        "data_type": "energy",
        "total_rows": len(clean_df),
        "validation_report": report,
        "records": _format_dataframe_records(clean_df, limit=limit),
    }


@router.get("/renewable/{station_id}", response_model=RawDataResponse)
def get_raw_renewable_data(
    station_id: str,
    start_date: Optional[str] = Query(None, description="Start date ISO filter"),
    end_date: Optional[str] = Query(None, description="End date ISO filter"),
    limit: int = Query(500, description="Max records to return", ge=1, le=5000),
):
    """Load historical renewable generation records for a station with data validation."""
    station = resolve_station_info(station_id)
    raw_df = load_renewable_data(station_id, start_date=start_date, end_date=end_date)
    clean_df, report = validate_and_clean_time_series(
        raw_df,
        timestamp_col="timestamp",
        non_negative_cols=["total_renewable"]
    )

    return {
        "status": "success",
        "station_id": station["id"] if station else station_id,
        "station_code": station["code"] if station else station_id,
        "data_type": "renewable",
        "total_rows": len(clean_df),
        "validation_report": report,
        "records": _format_dataframe_records(clean_df, limit=limit),
    }


# ==========================================
# Prepared ML Dataset Endpoints
# ==========================================

@router.get("/weather/{station_id}/prepared", response_model=PreparedDatasetResponse)
def get_prepared_weather_dataset(
    station_id: str,
    frequency: Optional[str] = Query("1h", description="Resampling frequency ('1min', '15min', '1h', '1d')"),
    start_date: Optional[str] = Query(None, description="Start date ISO filter"),
    end_date: Optional[str] = Query(None, description="End date ISO filter"),
    lags: Optional[str] = Query("1,2,3,24", description="Comma-separated lags"),
    rolling_windows: Optional[str] = Query("3,6,24", description="Comma-separated rolling windows"),
    add_time_features: bool = Query(True, description="Add calendar features"),
    limit: int = Query(500, description="Max records to return", ge=1, le=5000),
):
    """Prepares an ML-ready weather dataset with calendar, lag, and rolling features."""
    parsed_lags = _parse_int_list(lags)
    parsed_windows = _parse_int_list(rolling_windows)

    result = prepare_ml_dataset(
        data_type="weather",
        station_id=station_id,
        start_date=start_date,
        end_date=end_date,
        frequency=frequency,
        target_col="temperature",
        lags=parsed_lags,
        rolling_windows=parsed_windows,
        add_time_features=add_time_features,
    )

    return {
        "status": "success",
        "metadata": result["metadata"],
        "validation_report": result["validation_report"],
        "records": _format_dataframe_records(result["data"], limit=limit),
    }


@router.get("/energy/{station_id}/prepared", response_model=PreparedDatasetResponse)
def get_prepared_energy_dataset(
    station_id: str,
    frequency: Optional[str] = Query("1h", description="Resampling frequency ('1min', '15min', '1h', '1d')"),
    start_date: Optional[str] = Query(None, description="Start date ISO filter"),
    end_date: Optional[str] = Query(None, description="End date ISO filter"),
    lags: Optional[str] = Query("1,2,3,24", description="Comma-separated lags"),
    rolling_windows: Optional[str] = Query("3,6,24", description="Comma-separated rolling windows"),
    add_time_features: bool = Query(True, description="Add calendar features"),
    include_weather: bool = Query(True, description="Align with exogenous weather variables"),
    limit: int = Query(500, description="Max records to return", ge=1, le=5000),
):
    """Prepares an ML-ready energy load dataset with calendar, weather, lag, and rolling features."""
    parsed_lags = _parse_int_list(lags)
    parsed_windows = _parse_int_list(rolling_windows)

    result = prepare_ml_dataset(
        data_type="energy",
        station_id=station_id,
        start_date=start_date,
        end_date=end_date,
        frequency=frequency,
        target_col="total_load",
        lags=parsed_lags,
        rolling_windows=parsed_windows,
        add_time_features=add_time_features,
        include_weather=include_weather,
    )

    return {
        "status": "success",
        "metadata": result["metadata"],
        "validation_report": result["validation_report"],
        "records": _format_dataframe_records(result["data"], limit=limit),
    }


@router.get("/renewable/{station_id}/prepared", response_model=PreparedDatasetResponse)
def get_prepared_renewable_dataset(
    station_id: str,
    frequency: Optional[str] = Query("1h", description="Resampling frequency ('1min', '15min', '1h', '1d')"),
    start_date: Optional[str] = Query(None, description="Start date ISO filter"),
    end_date: Optional[str] = Query(None, description="End date ISO filter"),
    lags: Optional[str] = Query("1,2,3,24", description="Comma-separated lags"),
    rolling_windows: Optional[str] = Query("3,6,24", description="Comma-separated rolling windows"),
    add_time_features: bool = Query(True, description="Add calendar features"),
    include_weather: bool = Query(True, description="Align with solar and wind weather features"),
    limit: int = Query(500, description="Max records to return", ge=1, le=5000),
):
    """Prepares an ML-ready renewable generation dataset with calendar, weather, lag, and rolling features."""
    parsed_lags = _parse_int_list(lags)
    parsed_windows = _parse_int_list(rolling_windows)

    result = prepare_ml_dataset(
        data_type="renewable",
        station_id=station_id,
        start_date=start_date,
        end_date=end_date,
        frequency=frequency,
        target_col="total_renewable",
        lags=parsed_lags,
        rolling_windows=parsed_windows,
        add_time_features=add_time_features,
        include_weather=include_weather,
    )

    return {
        "status": "success",
        "metadata": result["metadata"],
        "validation_report": result["validation_report"],
        "records": _format_dataframe_records(result["data"], limit=limit),
    }
