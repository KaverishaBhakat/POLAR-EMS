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


# Weather Forecast Schema Models
class WeatherForecastRequest(BaseModel):
    station_id: str = Field(..., description="Station code (e.g. 'MAITRI') or Station UUID")
    horizon_hours: Optional[int] = Field(24, description="Forecast horizon in hours (default 24)")
    temperature_history: Optional[List[float]] = Field(None, description="Optional recent temperature observations list (minimum 24 required)")
    timestamps: Optional[List[str]] = Field(None, description="Optional ISO timestamps corresponding to temperature_history")
    humidity: Optional[float] = Field(None, description="Latest ambient relative humidity (%)")
    wind_speed: Optional[float] = Field(None, description="Latest wind speed (m/s)")
    wind_direction: Optional[float] = Field(None, description="Latest wind direction (degrees)")
    pressure: Optional[float] = Field(None, description="Latest atmospheric pressure (hPa)")


class WeatherPredictionPoint(BaseModel):
    timestamp: str
    predictedTemperature: float


class ModelEvaluationMetadata(BaseModel):
    name: str = "HistGradientBoostingRegressor"
    mae: float
    rmse: float
    r2: float


class WeatherForecastResponse(BaseModel):
    status: str = "success"
    stationId: str
    target: str = "temperature"
    unit: str = "°C"
    horizonHours: int = 24
    generatedAt: str
    predictions: List[WeatherPredictionPoint]
    model: ModelEvaluationMetadata


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
    weather: Optional[Dict[str, StationModelStatus]] = None
    energy: Dict[str, StationModelStatus]
    renewable: Dict[str, StationModelStatus]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: Dict[str, Any]
