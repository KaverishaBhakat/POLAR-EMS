"""
Weather Forecaster Model for POLAR-EMS ML Service.
Tabular gradient-boosted regressor for polar meteorological forecasting (temperature, wind speed, pressure).
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.config import settings

logger = logging.getLogger("polar_ems_ml.weather_forecaster")


class WeatherForecaster:
    """
    Forecaster for Antarctic Weather Time-Series (e.g. Ambient Temperature, Wind Speed).
    Wraps Scikit-Learn's HistGradientBoostingRegressor with feature tracking and metadata serialization.
    """

    def __init__(
        self,
        station_code: str = "MAITRI",
        target_name: str = "temperature",
        model_params: Optional[Dict[str, Any]] = None,
    ):
        self.station_code = station_code.upper()
        self.target_name = target_name
        self.default_params = {
            "loss": "squared_error",
            "learning_rate": 0.05,
            "max_iter": 300,
            "max_leaf_nodes": 31,
            "min_samples_leaf": 20,
            "l2_regularization": 0.1,
            "random_state": 42,
        }
        if model_params:
            self.default_params.update(model_params)

        self.model = HistGradientBoostingRegressor(**self.default_params)
        self.feature_names: List[str] = []
        self.metadata: Dict[str, Any] = {}
        self.is_fitted: bool = False

    def train(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        feature_names: Optional[List[str]] = None,
    ) -> "WeatherForecaster":
        """Train the underlying gradient boosting regressor."""
        if feature_names is not None:
            self.feature_names = list(feature_names)
        else:
            self.feature_names = list(X_train.columns)

        X_mat = X_train[self.feature_names].values
        y_vec = y_train.values

        logger.info(f"Training WeatherForecaster for {self.station_code} ({self.target_name}) on {len(X_train)} samples with {len(self.feature_names)} features.")
        self.model.fit(X_mat, y_vec)
        self.is_fitted = True
        return self

    def predict(self, X: Union[pd.DataFrame, np.ndarray]) -> np.ndarray:
        """Generate point forecasts for input feature matrix."""
        if not self.is_fitted:
            raise RuntimeError("Model is not fitted. Train or load weights before predicting.")

        if isinstance(X, pd.DataFrame):
            # Ensure all required features are present
            missing_cols = [c for c in self.feature_names if c not in X.columns]
            if missing_cols:
                raise ValueError(f"Missing required feature columns: {missing_cols}")
            X_mat = X[self.feature_names].values
        else:
            X_mat = X

        return self.model.predict(X_mat)

    def evaluate(
        self,
        X_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> Dict[str, float]:
        """Compute evaluation metrics on a test set."""
        y_pred = self.predict(X_test)
        y_true = y_test.values

        mae = float(mean_absolute_error(y_true, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        r2 = float(r2_score(y_true, y_pred))

        return {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
        }

    def compute_permutation_importance(
        self,
        X_val: pd.DataFrame,
        y_val: pd.Series,
        n_repeats: int = 10,
    ) -> Dict[str, float]:
        """Compute permutation feature importances."""
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before computing feature importance.")

        X_mat = X_val[self.feature_names].values
        y_vec = y_val.values
        result = permutation_importance(
            self.model,
            X_mat,
            y_vec,
            n_repeats=n_repeats,
            random_state=42,
            scoring="neg_mean_squared_error",
        )
        importances = {
            self.feature_names[i]: float(result.importances_mean[i])
            for i in range(len(self.feature_names))
        }
        # Sort descending
        return dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    def save(
        self,
        model_path: Optional[Union[str, Path]] = None,
        metadata_path: Optional[Union[str, Path]] = None,
        additional_metadata: Optional[Dict[str, Any]] = None,
    ) -> Path:
        """Persist model artifact and metadata JSON to disk."""
        if not self.is_fitted:
            raise RuntimeError("Cannot save an unfitted model.")

        if model_path is None:
            model_dir = settings.model_dir
            model_dir.mkdir(parents=True, exist_ok=True)
            model_path = model_dir / "weather_model.joblib"
        else:
            model_path = Path(model_path)
            model_path.parent.mkdir(parents=True, exist_ok=True)

        if metadata_path is None:
            metadata_path = model_path.parent / f"{model_path.stem}_metadata.json"
        else:
            metadata_path = Path(metadata_path)

        # Save model joblib
        joblib.dump(self.model, model_path)

        # Build metadata payload
        meta = {
            "station_code": self.station_code,
            "target_variable": self.target_name,
            "model_type": self.model.__class__.__name__,
            "model_params": self.default_params,
            "feature_names": self.feature_names,
            "feature_count": len(self.feature_names),
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }
        if additional_metadata:
            meta.update(additional_metadata)
        if self.metadata:
            meta.update(self.metadata)

        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        logger.info(f"Saved weather model to {model_path} and metadata to {metadata_path}")
        return model_path

    def load(
        self,
        model_path: Optional[Union[str, Path]] = None,
        metadata_path: Optional[Union[str, Path]] = None,
    ) -> "WeatherForecaster":
        """Load fitted model artifact and metadata from disk."""
        if model_path is None:
            model_path = settings.model_dir / "weather_model.joblib"
        else:
            model_path = Path(model_path)

        if not model_path.exists():
            raise FileNotFoundError(f"Model file '{model_path}' not found.")

        if metadata_path is None:
            metadata_path = model_path.parent / f"{model_path.stem}_metadata.json"
        else:
            metadata_path = Path(metadata_path)

        self.model = joblib.load(model_path)
        self.is_fitted = True

        if metadata_path.exists():
            with open(metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            self.station_code = self.metadata.get("station_code", self.station_code)
            self.target_name = self.metadata.get("target_variable", self.target_name)
            self.feature_names = self.metadata.get("feature_names", [])

        logger.info(f"Loaded weather model from {model_path} ({len(self.feature_names)} features).")
        return self


def predict_weather(
    features_df: pd.DataFrame,
    model_path: Optional[Union[str, Path]] = None,
) -> np.ndarray:
    """
    Reusable prediction function:
    1. Loads the saved joblib model artifact.
    2. Validates and extracts expected features.
    3. Returns regression predictions without retraining.
    """
    forecaster = WeatherForecaster()
    forecaster.load(model_path=model_path)
    return forecaster.predict(features_df)
