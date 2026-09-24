"""
FastAPI Main Application for POLAR-EMS ML & Forecasting Service.
"""

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.config import settings
from app.database.postgres import check_database_connection, resolve_station, get_db_engine
from app.models.energy_forecaster import EnergyForecaster
from app.models.renewable_forecaster import RenewableForecaster
from app.training.trainer import train_energy_model, train_renewable_model
from app.forecasting.predictor import forecast_energy, forecast_renewable
from app.schemas.forecast import (
    TrainRequest,
    ForecastResponse,
    ModelStatusResponse,
    StationModelStatus,
    HealthResponse
)

from app.api.data_routes import router as data_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("polar_ems_ml.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing POLAR-EMS ML Service Data Pipeline...")
    logger.info(f"Model storage path: {settings.model_dir.absolute()}")
    yield
    logger.info("Shutting down POLAR-EMS ML Service...")


app = FastAPI(
    title="POLAR-EMS ML Service & Data Pipeline",
    description="Production-ready foundational ML data pipeline and tabular time-series forecasting service for Antarctic research stations (Maitri & Bharati).",
    version=__version__,
    lifespan=lifespan
)

# CORS configuration to allow local Node backend and Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include foundational data pipeline routes (/data/weather, /data/energy, /data/renewable, etc.)
app.include_router(data_router)


@app.get("/", tags=["General"])
def root():
    """Service metadata and basic endpoints overview."""
    return {
        "service": "POLAR-EMS ML & Forecasting Service",
        "version": __version__,
        "status": "operational",
        "docs_url": "/docs",
        "models": {
            "energy_forecaster": "HistGradientBoostingRegressor (Target: totalLoad)",
            "renewable_forecaster": "HistGradientBoostingRegressor (Target: totalRenewable)",
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["General"])
def health_check():
    """Health check endpoint verifying service operational status and database connection."""
    db_status = check_database_connection()
    overall_status = "ok" if db_status["connected"] else "degraded"
    return {
        "status": overall_status,
        "service": "POLAR-EMS ML Service",
        "version": __version__,
        "database": db_status
    }


@app.post("/train/energy", tags=["Training"])
def train_energy_endpoint(payload: TrainRequest):
    """
    Train an Energy Demand forecaster for a specific station using historical energy_loads.
    Uses chronological 80/20 train/test split.
    """
    result = train_energy_model(
        station_identifier=payload.station_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        min_observations=payload.min_observations
    )

    if result.get("status") == "insufficient_data":
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=result)
    elif result.get("status") == "error":
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=result)

    return result


@app.post("/train/renewable", tags=["Training"])
def train_renewable_endpoint(payload: TrainRequest):
    """
    Train a Renewable Generation forecaster for a specific station using historical renewable_generation.
    Uses chronological 80/20 train/test split.
    """
    result = train_renewable_model(
        station_identifier=payload.station_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        min_observations=payload.min_observations
    )

    if result.get("status") == "insufficient_data":
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=result)
    elif result.get("status") == "error":
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=result)

    return result


@app.get("/forecast/energy/{station_id}", response_model=ForecastResponse, tags=["Forecasting"])
def get_energy_forecast(station_id: str, horizon_hours: int = 24):
    """
    Generate 24-hour ahead energy load forecast for the specified station.
    """
    result = forecast_energy(station_identifier=station_id, horizon_hours=horizon_hours)

    if result.get("status") == "not_trained":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    elif result.get("status") == "insufficient_data":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result["message"]
        )
    elif result.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@app.get("/forecast/renewable/{station_id}", response_model=ForecastResponse, tags=["Forecasting"])
def get_renewable_forecast(station_id: str, horizon_hours: int = 24):
    """
    Generate 24-hour ahead renewable power generation forecast for the specified station.
    """
    result = forecast_renewable(station_identifier=station_id, horizon_hours=horizon_hours)

    if result.get("status") == "not_trained":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    elif result.get("status") == "insufficient_data":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result["message"]
        )
    elif result.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@app.get("/model/status", response_model=ModelStatusResponse, tags=["Model Status"])
def get_model_status():
    """
    Returns the training and metric status for all station models.
    """
    stations = ["MAITRI", "BHARATI"]
    energy_status: Dict[str, StationModelStatus] = {}
    renewable_status: Dict[str, StationModelStatus] = {}

    for st in stations:
        # Energy forecaster status
        ef = EnergyForecaster(station_code=st)
        is_ef_trained = ef.load()
        if is_ef_trained and ef.metadata:
            m = ef.metadata
            metrics = m.get("metrics", {})
            energy_status[st] = StationModelStatus(
                trained=True,
                trained_at=m.get("trained_at"),
                training_observations=m.get("training_observations"),
                test_observations=m.get("test_observations"),
                total_observations=m.get("total_observations"),
                mae=metrics.get("mae"),
                rmse=metrics.get("rmse"),
                r2=metrics.get("r2"),
                mape=metrics.get("mape"),
                feature_count=m.get("feature_count"),
                target=m.get("target"),
                unit=m.get("unit")
            )
        else:
            energy_status[st] = StationModelStatus(trained=False)

        # Renewable forecaster status
        rf = RenewableForecaster(station_code=st)
        is_rf_trained = rf.load()
        if is_rf_trained and rf.metadata:
            m = rf.metadata
            metrics = m.get("metrics", {})
            renewable_status[st] = StationModelStatus(
                trained=True,
                trained_at=m.get("trained_at"),
                training_observations=m.get("training_observations"),
                test_observations=m.get("test_observations"),
                total_observations=m.get("total_observations"),
                mae=metrics.get("mae"),
                rmse=metrics.get("rmse"),
                r2=metrics.get("r2"),
                mape=metrics.get("mape"),
                feature_count=m.get("feature_count"),
                target=m.get("target"),
                unit=m.get("unit")
            )
        else:
            renewable_status[st] = StationModelStatus(trained=False)

    return {
        "energy": energy_status,
        "renewable": renewable_status
    }
