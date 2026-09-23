"""
Energy Demand Forecaster using scikit-learn HistGradientBoostingRegressor.
Predicts total load (kW) for Antarctic station microgrids.
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from app.config import settings

logger = logging.getLogger("polar_ems_ml.energy_forecaster")


class EnergyForecaster:
    """
    Station-specific Energy Demand Forecaster.
    Predicts 'total_load' based on calendar, weather, lag, and rolling statistics.
    """

    def __init__(self, station_code: str):
        self.station_code = station_code.upper()
        self.target_name = "total_load"
        self.unit = "kW"
        self.feature_names: List[str] = []
        self.metadata: Dict[str, Any] = {}
        self.model: Optional[HistGradientBoostingRegressor] = None

    @property
    def model_filename(self) -> str:
        return f"{self.station_code}_energy_model.joblib"

    @property
    def model_path(self) -> Path:
        return settings.model_dir / self.model_filename

    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        feature_names: Optional[List[str]] = None,
        hyperparameters: Optional[Dict[str, Any]] = None
    ) -> "EnergyForecaster":
        """
        Train the HistGradientBoostingRegressor model on tabular feature matrix X and target y.
        """
        if feature_names is None:
            self.feature_names = X.columns.tolist()
        else:
            self.feature_names = feature_names

        params = {
            "max_iter": 150,
            "max_leaf_nodes": 31,
            "min_samples_leaf": 10,
            "learning_rate": 0.08,
            "l2_regularization": 0.1,
            "random_state": 42,
        }
        if hyperparameters:
            params.update(hyperparameters)

        logger.info(
            f"Training EnergyForecaster for station={self.station_code} on {len(X)} rows "
            f"with {len(self.feature_names)} features: {self.feature_names}"
        )

        self.model = HistGradientBoostingRegressor(**params)
        self.model.fit(X[self.feature_names], y)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Generate energy load predictions.
        Enforces non-negative energy load outputs.
        """
        if self.model is None:
            raise ValueError(f"Model for station {self.station_code} is not loaded or trained.")

        X_input = X[self.feature_names]
        raw_preds = self.model.predict(X_input)
        # Total load cannot be negative in physical microgrid operations
        return np.maximum(0.0, raw_preds)

    def save(self, additional_metadata: Optional[Dict[str, Any]] = None) -> Path:
        """
        Save the model and accompanying metadata to disk.
        """
        if self.model is None:
            raise ValueError("Cannot save an untrained model.")

        save_dict = {
            "station_code": self.station_code,
            "target_name": self.target_name,
            "unit": self.unit,
            "feature_names": self.feature_names,
            "model": self.model,
            "metadata": {
                **(self.metadata or {}),
                **(additional_metadata or {})
            }
        }
        target_path = self.model_path
        joblib.dump(save_dict, target_path)
        logger.info(f"Saved EnergyForecaster artifact to {target_path}")
        return target_path

    def load(self) -> bool:
        """
        Load a trained model artifact from disk.
        Returns True if loaded successfully, False if file does not exist.
        """
        if not self.model_path.exists():
            return False

        try:
            data = joblib.load(self.model_path)
            self.station_code = data["station_code"]
            self.target_name = data.get("target_name", "total_load")
            self.unit = data.get("unit", "kW")
            self.feature_names = data["feature_names"]
            self.model = data["model"]
            self.metadata = data.get("metadata", {})
            logger.info(f"Successfully loaded EnergyForecaster for station {self.station_code}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model from {self.model_path}: {e}")
            return False

    def is_trained(self) -> bool:
        """Check if model is currently loaded in memory or saved on disk."""
        if self.model is not None:
            return True
        return self.load()
