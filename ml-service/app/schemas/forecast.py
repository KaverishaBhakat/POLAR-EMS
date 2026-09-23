"""
Pydantic response and request models for POLAR-EMS ML API.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class TrainRequest(BaseModel):
    station_id: str = Field(..., description="Station code (e.g. 'MAITRI', 'BHARATI') or Station UUID")
    start_date: Optional[str] = Field(None, description="ISO format start date filter (optional)")
    end_date: Optional[str] = Field(None, description="ISO format end date filter (optional)")
    min_observations: Optional[int] = Field(None, description="Override minimum required observations threshold")


class PredictionPoint(BaseModel):
    timestamp: str
    predicted_value: float


class ForecastResponse(BaseModel):
    status: str = "success"
    station: str
    target: str
    unit: str
    horizon_hours: int
    generated_at: str
    predictions: List[PredictionPoint]


class StationModelStatus(BaseModel):
    trained: bool
    trained_at: Optional[str] = None
    training_observations: Optional[int] = None
    test_observations: Optional[int] = None
    total_observations: Optional[int] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    r2: Optional[float] = None
    mape: Optional[float] = None
    feature_count: Optional[int] = None
    target: Optional[str] = None
    unit: Optional[str] = None


class ModelStatusResponse(BaseModel):
    energy: Dict[str, StationModelStatus]
    renewable: Dict[str, StationModelStatus]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: Dict[str, Any]
