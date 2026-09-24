"""
POLAR-EMS Weather Forecasting Model Training Pipeline.
Executes end-to-end data loading, cleaning, feature engineering, chronological train/test split,
HistGradientBoostingRegressor training, persistence baseline comparison, artifact serialization,
and Matplotlib visualization.
"""

import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import json
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for file generation
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.data.weather_loader import (
    inspect_raw_datasets,
    load_or_process_weather_dataset,
    build_weather_feature_matrix,
    PROCESSED_DIR,
    RAW_2019_DIR,
    RAW_HISTORICAL_DIR
)
from app.models.weather_forecaster import WeatherForecaster

OUTPUT_PLOTS_DIR = PROJECT_ROOT / "outputs" / "plots"
TRAINED_MODELS_DIR = PROJECT_ROOT / "trained_models"


def generate_plots(
    df_raw_hourly: pd.DataFrame,
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    y_test: np.ndarray,
    y_pred: np.ndarray,
    feature_importances: dict,
    output_dir: Path
):
    """
    Generate and save all required evaluation and diagnostic plots using Matplotlib.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Historical Target Values (Full 2019 Year)
    plt.figure(figsize=(12, 5), dpi=150)
    plt.plot(df_raw_hourly["timestamp"], df_raw_hourly["temperature"], color="#0284c7", linewidth=0.8, label="Hourly Temperature (°C)")
    plt.title("Maitri Station Historical Ambient Temperature (Full Year 2019)", fontsize=13, fontweight="bold", pad=12)
    plt.xlabel("Date", fontsize=11)
    plt.ylabel("Ambient Temperature (°C)", fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper right")
    plt.tight_layout()
    hist_plot_path = output_dir / "historical_data.png"
    plt.savefig(hist_plot_path)
    plt.close()

    # 2. Training vs Testing Period (Chronological 80/20 Split)
    plt.figure(figsize=(12, 5), dpi=150)
    plt.plot(train_df["timestamp"], train_df["temperature"], color="#16a34a", linewidth=0.8, label=f"Training Period ({len(train_df)} hrs - 80%)")
    plt.plot(test_df["timestamp"], test_df["temperature"], color="#ea580c", linewidth=0.8, label=f"Testing Period ({len(test_df)} hrs - 20%)")
    plt.axvline(x=test_df["timestamp"].iloc[0], color="#dc2626", linestyle="--", linewidth=1.5, label="Chronological Split Point")
    plt.title("Maitri Station Weather Dataset - Chronological Train / Test Split", fontsize=13, fontweight="bold", pad=12)
    plt.xlabel("Timestamp", fontsize=11)
    plt.ylabel("Ambient Temperature (°C)", fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper right")
    plt.tight_layout()
    split_plot_path = output_dir / "training_vs_testing.png"
    plt.savefig(split_plot_path)
    plt.close()

    # 3. Actual vs Predicted Values (on Test Set)
    plt.figure(figsize=(14, 5.5), dpi=150)
    # Zoom in on a representative 2-week testing window (336 hours) for crystal-clear visual clarity
    zoom_len = min(336, len(test_df))
    plt.plot(test_df["timestamp"].iloc[:zoom_len], y_test[:zoom_len], color="#1e293b", linewidth=1.5, label="Actual Observed Temperature")
    plt.plot(test_df["timestamp"].iloc[:zoom_len], y_pred[:zoom_len], color="#0284c7", linewidth=1.5, linestyle="--", label="HistGradientBoosting Forecast")
    plt.title("Actual vs Predicted Ambient Temperature (Out-of-Sample Test Window)", fontsize=13, fontweight="bold", pad=12)
    plt.xlabel("Timestamp", fontsize=11)
    plt.ylabel("Temperature (°C)", fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper right")
    plt.tight_layout()
    actual_pred_plot_path = output_dir / "actual_vs_predicted.png"
    plt.savefig(actual_pred_plot_path)
    plt.close()

    # 4. Prediction Error / Residuals
    residuals = y_test - y_pred
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5), dpi=150)
    
    # Residuals time-series
    ax1.plot(test_df["timestamp"], residuals, color="#e11d48", linewidth=0.7, alpha=0.8)
    ax1.axhline(0, color="black", linestyle="--", linewidth=1)
    ax1.set_title("Prediction Residuals Over Time (Test Set)", fontsize=11, fontweight="bold")
    ax1.set_xlabel("Timestamp", fontsize=10)
    ax1.set_ylabel("Error: (Actual - Predicted) [°C]", fontsize=10)
    ax1.grid(True, linestyle="--", alpha=0.5)

    # Residuals histogram/distribution
    ax2.hist(residuals, bins=40, color="#6366f1", edgecolor="white", alpha=0.85, density=True)
    ax2.axvline(0, color="red", linestyle="--", linewidth=1)
    ax2.set_title(f"Residual Error Distribution (Mean={np.mean(residuals):.2f}, Std={np.std(residuals):.2f})", fontsize=11, fontweight="bold")
    ax2.set_xlabel("Residual Error (°C)", fontsize=10)
    ax2.set_ylabel("Density", fontsize=10)
    ax2.grid(True, linestyle="--", alpha=0.5)

    plt.tight_layout()
    residual_plot_path = output_dir / "prediction_error.png"
    plt.savefig(residual_plot_path)
    plt.close()

    # 5. Feature Importance (Permutation Importance)
    plt.figure(figsize=(10, 6), dpi=150)
    top_features = list(feature_importances.items())[:12]
    feat_names = [f[0] for f in reversed(top_features)]
    feat_vals = [f[1] for f in reversed(top_features)]

    plt.barh(feat_names, feat_vals, color="#3b82f6", edgecolor="#1d4ed8")
    plt.title("Top Feature Importances (Permutation MSE Reduction)", fontsize=12, fontweight="bold", pad=12)
    plt.xlabel("Permutation Importance Score", fontsize=10)
    plt.ylabel("Feature", fontsize=10)
    plt.grid(True, axis="x", linestyle="--", alpha=0.5)
    plt.tight_layout()
    feat_plot_path = output_dir / "feature_importance.png"
    plt.savefig(feat_plot_path)
    plt.close()

    # 6. Multi-step Horizon Forecast View
    plt.figure(figsize=(12, 5), dpi=150)
    horizon_len = min(48, len(y_test))  # 48-hour forecast window
    plt.plot(range(1, horizon_len + 1), y_test[:horizon_len], marker="o", markersize=4, color="#0f172a", label="Actual Observations")
    plt.plot(range(1, horizon_len + 1), y_pred[:horizon_len], marker="s", markersize=4, color="#2563eb", linestyle="--", label="Model Point Predictions")
    plt.title(f"{horizon_len}-Hour Continuous Horizon Weather Forecast", fontsize=13, fontweight="bold", pad=12)
    plt.xlabel("Forecast Step Ahead (Hours)", fontsize=11)
    plt.ylabel("Ambient Temperature (°C)", fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(loc="upper right")
    plt.tight_layout()
    horizon_plot_path = output_dir / "forecast_horizon.png"
    plt.savefig(horizon_plot_path)
    plt.close()

    return {
        "historical_data": str(hist_plot_path),
        "training_vs_testing": str(split_plot_path),
        "actual_vs_predicted": str(actual_pred_plot_path),
        "prediction_error": str(residual_plot_path),
        "feature_importance": str(feat_plot_path),
        "forecast_horizon": str(horizon_plot_path),
    }


def run_training_pipeline() -> dict:
    """
    Execute complete end-to-end ML training workflow.
    """
    print("==================================================")
    print("POLAR-EMS: COMMENCING REAL DATA ML TRAINING PIPELINE")
    print("==================================================")

    # 1. Dataset Inspection & Ingestion
    inspection = inspect_raw_datasets()
    print(f"\n[1/7] Inspecting Datasets...")
    print(f"  - Raw 2019 Maitri MDB Files Found: {inspection['raw_2019_count']}")
    print(f"  - Raw Historical Files Found: {inspection['raw_historical_count']}")

    df_clean, prep_report = load_or_process_weather_dataset(force_reprocess=False)
    print(f"\n[2/7] Preprocessing Report:")
    for k, v in prep_report.items():
        print(f"  - {k}: {v}")

    # 2. Feature Engineering
    target_col = "temperature"
    print(f"\n[3/7] Generating Time-Series Lag & Rolling Features (Target='{target_col}')...")
    feature_df = build_weather_feature_matrix(df_clean, target_col=target_col)
    
    exclude_cols = {"timestamp", target_col}
    feature_cols = [c for c in feature_df.columns if c not in exclude_cols]
    print(f"  - Feature Matrix Shape: {feature_df.shape}")
    print(f"  - Engineered Features ({len(feature_cols)}): {feature_cols}")

    # 3. Chronological 80/20 Train/Test Split
    print(f"\n[4/7] Performing Chronological 80/20 Train/Test Split...")
    n_samples = len(feature_df)
    train_size = int(n_samples * 0.80)
    train_df = feature_df.iloc[:train_size].reset_index(drop=True)
    test_df = feature_df.iloc[train_size:].reset_index(drop=True)

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_test, y_test = test_df[feature_cols], test_df[target_col]

    train_start = str(train_df["timestamp"].min())
    train_end = str(train_df["timestamp"].max())
    test_start = str(test_df["timestamp"].min())
    test_end = str(test_df["timestamp"].max())

    print(f"  - Training Period: {train_start} to {train_end} ({len(train_df)} rows)")
    print(f"  - Testing Period:  {test_start} to {test_end} ({len(test_df)} rows)")

    # 4. Model Training
    print(f"\n[5/7] Training HistGradientBoostingRegressor on Real Dataset...")
    forecaster = WeatherForecaster(station_code="MAITRI", target_name=target_col)
    forecaster.train(X_train, y_train, feature_names=feature_cols)

    # 5. Out-of-Sample Test Evaluation & Baseline Comparison
    print(f"\n[6/7] Evaluating ML Model vs Persistence Baseline on Test Set...")
    y_pred = forecaster.predict(X_test)
    y_test_arr = y_test.values

    # Baseline: Persistence predictor (next value = previous observed value -> lag_1)
    baseline_pred = test_df["lag_1"].values
    baseline_mae = float(mean_absolute_error(y_test_arr, baseline_pred))
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test_arr, baseline_pred)))
    baseline_r2 = float(r2_score(y_test_arr, baseline_pred))

    ml_mae = float(mean_absolute_error(y_test_arr, y_pred))
    ml_rmse = float(np.sqrt(mean_squared_error(y_test_arr, y_pred)))
    ml_r2 = float(r2_score(y_test_arr, y_pred))

    print(f"  - Persistence Baseline: MAE={baseline_mae:.4f} °C, RMSE={baseline_rmse:.4f} °C, R²={baseline_r2:.4f}")
    print(f"  - ML Gradient Boosting: MAE={ml_mae:.4f} °C, RMSE={ml_rmse:.4f} °C, R²={ml_r2:.4f}")

    # Compute Permutation Feature Importance
    importances = forecaster.compute_permutation_importance(X_test, y_test)

    # 6. Artifact Serialization
    TRAINED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = TRAINED_MODELS_DIR / "weather_model.joblib"
    metadata_path = TRAINED_MODELS_DIR / "weather_model_metadata.json"

    now_iso = datetime.now(timezone.utc).isoformat()
    meta_payload = {
        "dataset_name": "Maitri AWS 2019 (IMD)",
        "dataset_files_used": 365,
        "target_variable": target_col,
        "target_unit": "°C",
        "total_raw_observations": 525600,
        "total_hourly_observations": len(df_clean),
        "feature_count": len(feature_cols),
        "features": feature_cols,
        "model_type": "HistGradientBoostingRegressor",
        "training_rows": len(X_train),
        "testing_rows": len(X_test),
        "training_start": train_start,
        "training_end": train_end,
        "testing_start": test_start,
        "testing_end": test_end,
        "baseline_metrics": {
            "strategy": "persistence (next value = previous value)",
            "mae": round(baseline_mae, 4),
            "rmse": round(baseline_rmse, 4),
            "r2": round(baseline_r2, 4),
        },
        "ml_metrics": {
            "mae": round(ml_mae, 4),
            "rmse": round(ml_rmse, 4),
            "r2": round(ml_r2, 4),
        },
        "training_timestamp": now_iso,
    }

    forecaster.metadata = meta_payload
    forecaster.save(model_path=model_path, metadata_path=metadata_path)

    # 7. Matplotlib Visualizations
    print(f"\n[7/7] Generating Matplotlib Evaluation Plots...")
    plots = generate_plots(
        df_raw_hourly=df_clean,
        train_df=train_df,
        test_df=test_df,
        y_test=y_test_arr,
        y_pred=y_pred,
        feature_importances=importances,
        output_dir=OUTPUT_PLOTS_DIR
    )

    # Final Summary Output
    print("\n========================================")
    print("POLAR-EMS ML TRAINING REPORT")
    print("========================================")
    print(f"Dataset(s):          Maitri Station AWS 2019 (365 .mdb files)")
    print(f"Target:              {target_col} (°C)")
    print(f"Number of observations: {len(df_clean):,} hourly ({prep_report['rows_before']:,} 1-min raw)")
    print(f"Time range:          {prep_report['timestamp_start']} to {prep_report['timestamp_end']}")
    print(f"Sampling frequency:  {prep_report['sampling_frequency']}")
    print(f"Features ({len(feature_cols)}):        {', '.join(feature_cols)}")
    print(f"Model:               HistGradientBoostingRegressor")
    print(f"Training rows:       {len(X_train):,}")
    print(f"Testing rows:        {len(X_test):,}")
    print(f"Baseline MAE:        {baseline_mae:.4f} °C")
    print(f"ML MAE:              {ml_mae:.4f} °C")
    print(f"Baseline RMSE:       {baseline_rmse:.4f} °C")
    print(f"ML RMSE:             {ml_rmse:.4f} °C")
    print(f"R²:                  {ml_r2:.4f}")
    print(f"Model saved:         {model_path}")
    print(f"Metadata saved:      {metadata_path}")
    print(f"Plots saved:         {OUTPUT_PLOTS_DIR}")
    for pname, ppath in plots.items():
        print(f"  - {pname}: {ppath}")
    print("========================================\n")

    return meta_payload


if __name__ == "__main__":
    run_training_pipeline()
