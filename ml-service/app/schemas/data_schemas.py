"""
Pydantic Schemas for Data Pipeline Endpoints in POLAR-EMS ML Service.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ValidationReportSchema(BaseModel):
    rows_before: int
    rows_after: int
    duplicates: int
    missing_values: int
    invalid_rows: int
    invalid_numeric_values: Optional[int] = 0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    column_missing_counts: Optional[Dict[str, int]] = None
    status: str
    message: Optional[str] = None


class DatasetMetadataSchema(BaseModel):
    station_id: str
    station_code: str
    station_name: str
    data_type: str
    frequency: str
    rows: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    features: List[str]
    target_col: Optional[str] = None


class PreparedDatasetResponse(BaseModel):
    status: str = "success"
    metadata: DatasetMetadataSchema
    validation_report: ValidationReportSchema
    records: List[Dict[str, Any]]


class RawDataResponse(BaseModel):
    status: str = "success"
    station_id: str
    station_code: Optional[str] = None
    data_type: str
    total_rows: int
    validation_report: Optional[ValidationReportSchema] = None
    records: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: Dict[str, Any]
