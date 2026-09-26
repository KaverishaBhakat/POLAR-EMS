"""
API endpoint integration tests using FastAPI TestClient.
"""

import pytest
from unittest.mock import patch
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "POLAR-EMS" in data["service"]
    assert "version" in data
    assert "weather_forecaster" in data["models"]


def test_health_endpoint():
    with patch("app.main.check_database_connection") as mock_db:
        mock_db.return_value = {"connected": True, "error": None}
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"]["connected"] is True


def test_data_weather_raw_endpoint():
    mock_df = pd.DataFrame({
        "id": ["1", "2"],
        "station_id": ["uuid-1", "uuid-1"],
        "timestamp": pd.date_range("2016-12-01 10:00:00", periods=2, freq="1h", tz="UTC"),
        "temperature": [-10.0, -11.0],
        "pressure": [990.0, 992.0],
        "humidity": [60.0, 65.0],
        "wind_speed": [12.0, 15.0],
        "wind_direction": ["NE", "E"],
        "solar_radiation": [200.0, 250.0],
        "created_at": pd.date_range("2016-12-01 10:00:00", periods=2, freq="1h", tz="UTC")
    })

    with patch("app.api.data_routes.load_weather_data") as mock_load, \
         patch("app.api.data_routes.resolve_station_info") as mock_st:
        mock_st.return_value = {"id": "uuid-1", "code": "MAITRI", "name": "Maitri Station"}
        mock_load.return_value = mock_df

        response = client.get("/data/weather/MAITRI")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["data_type"] == "weather"
        assert data["total_rows"] == 2
        assert len(data["records"]) == 2
        assert data["validation_report"]["status"] == "clean"


def test_data_weather_prepared_endpoint():
    mock_df = pd.DataFrame({
        "id": [f"id-{i}" for i in range(30)],
        "station_id": ["uuid-1"] * 30,
        "timestamp": pd.date_range("2016-12-01 10:00:00", periods=30, freq="1h", tz="UTC"),
        "temperature": np.random.uniform(-20, -5, size=30),
        "pressure": np.random.uniform(980, 1000, size=30),
        "humidity": np.random.uniform(50, 80, size=30),
        "wind_speed": np.random.uniform(5, 20, size=30),
        "wind_direction": ["NE"] * 30,
        "solar_radiation": np.random.uniform(0, 300, size=30),
        "created_at": pd.date_range("2016-12-01 10:00:00", periods=30, freq="1h", tz="UTC")
    })

    with patch("app.data.pipeline.load_weather_data") as mock_load, \
         patch("app.data.pipeline.resolve_station_info") as mock_st:
        mock_st.return_value = {"id": "uuid-1", "code": "MAITRI", "name": "Maitri Station"}
        mock_load.return_value = mock_df

        response = client.get("/data/weather/MAITRI/prepared?frequency=1h&lags=1,2,24&rolling_windows=3,6")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["metadata"]["station_code"] == "MAITRI"
        assert "lag_1" in data["metadata"]["features"]
        assert "rolling_mean_3" in data["metadata"]["features"]
        assert len(data["records"]) == 30


def test_forecast_weather_get_endpoint():
    """Test GET /forecast/weather/MAITRI returns valid 24h temperature forecast."""
    response = client.get("/forecast/weather/MAITRI?horizon_hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["stationId"] == "MAITRI"
    assert data["target"] == "temperature"
    assert data["unit"] == "°C"
    assert len(data["predictions"]) == 24
    assert "model" in data
    assert data["model"]["name"] == "HistGradientBoostingRegressor"
    assert "mae" in data["model"]
    assert "rmse" in data["model"]
    assert "r2" in data["model"]


def test_forecast_weather_post_endpoint():
    """Test POST /forecast/weather with custom historical telemetry."""
    history = [-10.0 - i * 0.1 for i in range(24)]
    payload = {
        "station_id": "MAITRI",
        "horizon_hours": 12,
        "temperature_history": history,
        "humidity": 70.0,
        "wind_speed": 15.0,
        "wind_direction": 130.0,
        "pressure": 965.0
    }
    response = client.post("/forecast/weather", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["predictions"]) == 12
    assert data["horizonHours"] == 12


def test_forecast_weather_insufficient_history():
    """Test POST /forecast/weather with < 24 observations returns 422."""
    payload = {
        "station_id": "MAITRI",
        "horizon_hours": 24,
        "temperature_history": [-10.0, -11.0]
    }
    response = client.post("/forecast/weather", json=payload)
    assert response.status_code == 422


def test_model_status_includes_weather():
    """Test GET /model/status returns weather model status."""
    response = client.get("/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "weather" in data
    assert "MAITRI" in data["weather"]
    assert data["weather"]["MAITRI"]["trained"] is True
    assert data["weather"]["MAITRI"]["target"] == "temperature"
