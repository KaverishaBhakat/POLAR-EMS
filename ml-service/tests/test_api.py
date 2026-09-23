"""
API endpoint integration tests using FastAPI TestClient.
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "POLAR-EMS ML & Forecasting Service"
    assert "version" in data
    assert "models" in data


def test_health_endpoint():
    with patch("app.main.check_database_connection") as mock_db:
        mock_db.return_value = {"connected": True, "error": None}
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"]["connected"] is True


def test_model_status_endpoint(tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "MODEL_STORAGE_PATH", str(tmp_path))

    response = client.get("/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "energy" in data
    assert "renewable" in data
    assert "MAITRI" in data["energy"]
    assert "BHARATI" in data["energy"]
    assert data["energy"]["MAITRI"]["trained"] is False


def test_train_energy_insufficient_data():
    # Mock resolve_station and load_energy_data to simulate a small dataset
    import pandas as pd
    with patch("app.training.trainer.resolve_station") as mock_station, \
         patch("app.training.trainer.load_energy_data") as mock_energy, \
         patch("app.training.trainer.load_weather_data") as mock_weather:
        
        mock_station.return_value = {"id": "uuid-1", "code": "MAITRI", "name": "Maitri Station"}
        mock_energy.return_value = pd.DataFrame({
            "id": ["1", "2"],
            "station_id": ["uuid-1", "uuid-1"],
            "timestamp": ["2026-01-01T00:00:00Z", "2026-01-01T01:00:00Z"],
            "total_load": [50.0, 52.0]
        })
        mock_weather.return_value = pd.DataFrame()

        response = client.post("/train/energy", json={"station_id": "MAITRI"})
        assert response.status_code == 422
        data = response.json()
        assert data["status"] == "insufficient_data"
        assert data["observations"] == 2


def test_forecast_energy_not_trained(tmp_path, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "MODEL_STORAGE_PATH", str(tmp_path))

    with patch("app.forecasting.predictor.resolve_station") as mock_station:
        mock_station.return_value = {"id": "uuid-1", "code": "MAITRI", "name": "Maitri Station"}
        response = client.get("/forecast/energy/MAITRI")
        assert response.status_code == 404
        assert "not trained yet" in response.json()["detail"]
