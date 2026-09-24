"""
Unit tests for the prepare_ml_dataset pipeline orchestrator.
"""

import pytest
from unittest.mock import patch
import pandas as pd
import numpy as np
from app.data.pipeline import prepare_ml_dataset


def test_prepare_ml_dataset_weather():
    mock_weather_df = pd.DataFrame({
        "id": [f"id-{i}" for i in range(50)],
        "station_id": ["MAITRI"] * 50,
        "timestamp": pd.date_range("2016-12-01 10:00:00", periods=50, freq="1h", tz="UTC"),
        "temperature": np.random.uniform(-25, -10, size=50),
        "pressure": np.random.uniform(980, 1010, size=50),
        "humidity": np.random.uniform(40, 80, size=50),
        "wind_speed": np.random.uniform(5, 25, size=50),
        "wind_direction": ["NE"] * 50,
        "solar_radiation": np.random.uniform(0, 400, size=50),
        "created_at": pd.date_range("2016-12-01 10:00:00", periods=50, freq="1h", tz="UTC")
    })

    with patch("app.data.pipeline.load_weather_data") as mock_loader, \
         patch("app.data.pipeline.resolve_station_info") as mock_station:
        mock_station.return_value = {"id": "uuid-maitri", "code": "MAITRI", "name": "Maitri Station"}
        mock_loader.return_value = mock_weather_df

        result = prepare_ml_dataset(
            data_type="weather",
            station_id="MAITRI",
            frequency="1h",
            target_col="temperature",
            lags=[1, 2, 24],
            rolling_windows=[3, 6, 24],
            add_time_features=True
        )

        assert "data" in result
        assert "metadata" in result
        assert "validation_report" in result

        df_out = result["data"]
        assert len(df_out) == 50
        assert "hour" in df_out.columns
        assert "day_of_week" in df_out.columns
        assert "week_of_year" in df_out.columns
        assert "lag_1" in df_out.columns
        assert "lag_24" in df_out.columns
        assert "rolling_mean_3" in df_out.columns

        meta = result["metadata"]
        assert meta["station_code"] == "MAITRI"
        assert meta["data_type"] == "weather"
        assert meta["rows"] == 50
        assert meta["frequency"] == "1h"


def test_prepare_ml_dataset_empty():
    with patch("app.data.pipeline.load_weather_data") as mock_loader, \
         patch("app.data.pipeline.resolve_station_info") as mock_station:
        mock_station.return_value = {"id": "uuid-bharati", "code": "BHARATI", "name": "Bharati Station"}
        mock_loader.return_value = pd.DataFrame()

        result = prepare_ml_dataset(
            data_type="weather",
            station_id="BHARATI"
        )

        assert result["data"].empty
        assert result["metadata"]["rows"] == 0
        assert result["validation_report"]["status"] == "empty"
