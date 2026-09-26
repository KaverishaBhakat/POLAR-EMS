"""
FastAPI Main Application for POLAR-EMS ML & Forecasting Service.
"""

import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.config import settings
from app.database.postgres import check_database_connection, resolve_station, get_db_engine
from app.models.energy_forecaster import EnergyForecaster
from app.models.renewable_forecaster import RenewableForecaster
from app.models.weather_forecaster import WeatherForecaster
from app.training.trainer import train_energy_model, train_renewable_model
from app.forecasting.predictor import (
    forecast_energy,
    forecast_renewable,
    forecast_weather,
    get_weather_forecaster
)
from app.schemas.forecast import (
    TrainRequest,
    ForecastResponse,
    WeatherForecastRequest,
    WeatherForecastResponse,
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
    # Pre-load the saved real-data weather forecaster model once into memory
    wf = get_weather_forecaster()
    if wf.is_fitted:
        logger.info(f"Weather model ready for inference (target={wf.target_name}, features={len(wf.feature_names)}).")
    else:
        logger.warning("Weather model weights not yet found in trained_models/.")
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
    wf = get_weather_forecaster()
    return {
        "service": "POLAR-EMS ML & Forecasting Service",
        "version": __version__,
        "status": "operational",
        "docs_url": "/docs",
        "models": {
            "weather_forecaster": {
                "model": "HistGradientBoostingRegressor",
                "target": "ambient_temperature",
                "status": "loaded" if wf.is_fitted else "unloaded"
            },
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


# Weather Forecast Endpoints
@app.post("/forecast/weather", response_model=WeatherForecastResponse, tags=["Forecasting"])
def post_weather_forecast(payload: WeatherForecastRequest):
    """
    Generate 24-hour ahead ambient temperature forecast for a station using the real trained ML model.
    Accepts optional inline temperature history or pulls from station historical readings.
    """
    result = forecast_weather(
        station_identifier=payload.station_id,
        horizon_hours=payload.horizon_hours or 24,
        temperature_history=payload.temperature_history,
        timestamps=payload.timestamps,
        humidity=payload.humidity,
        wind_speed=payload.wind_speed,
        wind_direction=payload.wind_direction,
        pressure=payload.pressure,
    )

    if result.get("status") == "not_trained":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    elif result.get("status") == "insufficient_data":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.get("message", "INSUFFICIENT_HISTORY_FOR_FORECAST")
        )
    elif result.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


@app.get("/forecast/weather/{station_id}", response_model=WeatherForecastResponse, tags=["Forecasting"])
def get_weather_forecast(station_id: str, horizon_hours: int = 24):
    """
    Generate 24-hour forward ambient temperature forecast for the specified station.
    Uses recursive forward autoregression based on the saved real-data weather model.
    """
    result = forecast_weather(station_identifier=station_id, horizon_hours=horizon_hours)

    if result.get("status") == "not_trained":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["message"]
        )
    elif result.get("status") == "insufficient_data":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.get("message", "INSUFFICIENT_HISTORY_FOR_FORECAST")
        )
    elif result.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


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
    Returns the training and metric status for all station models (weather, energy, renewable).
    """
    stations = ["MAITRI", "BHARATI"]
    energy_status: Dict[str, StationModelStatus] = {}
    renewable_status: Dict[str, StationModelStatus] = {}
    weather_status: Dict[str, StationModelStatus] = {}

    # Weather Forecaster status
    wf = get_weather_forecaster()
    if wf.is_fitted and wf.metadata:
        m = wf.metadata
        metrics = m.get("ml_metrics", {})
        weather_status["MAITRI"] = StationModelStatus(
            trained=True,
            trained_at=m.get("training_timestamp") or m.get("saved_at"),
            training_observations=m.get("training_rows"),
            test_observations=m.get("testing_rows"),
            total_observations=m.get("total_hourly_observations"),
            mae=metrics.get("mae"),
            rmse=metrics.get("rmse"),
            r2=metrics.get("r2"),
            feature_count=m.get("feature_count"),
            target=m.get("target_variable"),
            unit=m.get("target_unit", "°C")
        )
    else:
        weather_status["MAITRI"] = StationModelStatus(trained=False)

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
        "weather": weather_status,
        "energy": energy_status,
        "renewable": renewable_status
    }


# 24-Hour MILP Energy Dispatch Optimization Endpoint
@app.get("/optimization/dispatch/{station_id}", tags=["Optimization"])
def get_optimization_dispatch(
    station_id: str,
    horizon_hours: int = 24,
    initial_soc: float = 75.0,
):
    """
    Computes 24-Hour MILP optimal generator unit commitment and battery dispatch
    using Google OR-Tools based on demonstration scenario inputs.
    """
    from app.optimization.dispatcher import (
        build_demonstration_scenario_inputs,
        optimize_24h_dispatch
    )

    try:
        station = resolve_station(station_id)
        station_code = station["code"] if station else station_id.upper()
    except Exception:
        station_code = station_id.upper()

    # 1. Build demonstration scenario inputs
    scenario_inputs = build_demonstration_scenario_inputs(
        station_identifier=station_code,
        horizon_hours=horizon_hours,
        initial_soc=initial_soc,
    )

    # 2. Run OR-Tools MILP optimizer
    result = optimize_24h_dispatch(
        demand=scenario_inputs["demand"],
        solar=scenario_inputs["solar"],
        wind=scenario_inputs["wind"],
        initial_soc=scenario_inputs["initialSOC"],
        station_id=station_code,
        timestamps=scenario_inputs["timestamps"],
        hours_labels=scenario_inputs["hours"],
        scenario_metadata=scenario_inputs.get("scenarioMetadata"),
    )

    if result.get("status") == "ERROR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Optimization execution failed.")
        )
    elif result.get("status") == "INFEASIBLE":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.get("message", "Optimization problem is infeasible.")
        )

    return result
