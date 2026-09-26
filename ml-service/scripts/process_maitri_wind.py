"""
Processing script for Maitri 2019 Wind Generation Modeling.
Ingests measured 2019 Maitri hourly weather observations, validates continuity,
applies the parameterized wind turbine power curve model, generates processed CSVs,
produces validation metrics report, and plots the generation profile.
"""

import os
import sys
import json
import logging
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Add ml-service root to path
ML_SERVICE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_SERVICE_DIR))

from app.models.wind_model import wind_speed_to_power

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("process_maitri_wind")

# File paths
CONFIG_PATH = ML_SERVICE_DIR / "config" / "maitri_wind_config.json"
WEATHER_CSV = ML_SERVICE_DIR / "datasets" / "processed" / "weather" / "maitri_2019_hourly.csv"
OUTPUT_WIND_CSV = ML_SERVICE_DIR / "datasets" / "processed" / "weather" / "maitri_2019_wind_power_hourly.csv"
VALIDATION_REPORT_JSON = ML_SERVICE_DIR / "datasets" / "processed" / "weather" / "maitri_2019_wind_validation_report.json"
OUTPUTS_DIR_JSON = ML_SERVICE_DIR / "outputs" / "wind" / "wind_model_validation.json"
PLOT_PATH_1 = ML_SERVICE_DIR / "datasets" / "processed" / "weather" / "maitri_2019_wind_power_plot.png"
PLOT_PATH_2 = ML_SERVICE_DIR / "outputs" / "plots" / "wind" / "wind_generation_profile.png"


def run_wind_processing():
    logger.info(f"Loading wind turbine configuration from {CONFIG_PATH}...")
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    logger.info(f"Loading weather dataset from {WEATHER_CSV}...")
    df_weather = pd.read_csv(WEATHER_CSV)
    
    # 1. Validation of dataset
    num_obs = len(df_weather)
    logger.info(f"Loaded {num_obs} hourly observations.")

    # Validate timestamps
    df_weather["dt"] = pd.to_datetime(df_weather["timestamp"], utc=True)
    df_weather = df_weather.sort_values("dt").reset_index(drop=True)
    
    start_time = df_weather["dt"].min()
    end_time = df_weather["dt"].max()
    expected_range = pd.date_range(start=start_time, end=end_time, freq="1h")
    missing_timestamps = expected_range.difference(df_weather["dt"])
    duplicate_count = int(df_weather["dt"].duplicated().sum())

    assert len(missing_timestamps) == 0, f"Found {len(missing_timestamps)} missing timestamps!"
    assert duplicate_count == 0, f"Found {duplicate_count} duplicate timestamps!"
    logger.info("Timestamp continuity verified: 100% continuous 8,760 hourly intervals.")

    # Validate wind_speed column
    assert "wind_speed" in df_weather.columns, "Missing 'wind_speed' column in weather dataset!"
    missing_wind_count = int(df_weather["wind_speed"].isnull().sum())
    assert missing_wind_count == 0, f"Found {missing_wind_count} missing wind speed values!"
    logger.info("Wind speed column validation verified: 0 null or missing values.")

    # 2. Apply Wind Turbine Power Curve
    logger.info("Applying aerodynamic piecewise wind power conversion model...")
    results = []
    for idx, row in df_weather.iterrows():
        ws = row["wind_speed"]
        res = wind_speed_to_power(ws, config=config)
        results.append({
            "timestamp": row["timestamp"],
            "wind_speed_ms": res["wind_speed_ms"],
            "modeled_wind_power_kw": res["modeled_wind_power_kw"],
            "is_cut_out": res["is_cut_out"],
            "is_below_cut_in": res["is_below_cut_in"],
            "raw_power_kw": res["raw_power_kw"],
            "status": res["status"],
        })

    df_wind = pd.DataFrame(results)

    # 3. Save processed hourly wind generation CSV
    OUTPUT_WIND_CSV.parent.mkdir(parents=True, exist_ok=True)
    # Output CSV format matching requirement: timestamp, wind_speed_ms, modeled_wind_power_kw, is_cut_out, is_below_cut_in
    output_cols = ["timestamp", "wind_speed_ms", "modeled_wind_power_kw", "is_cut_out", "is_below_cut_in"]
    df_wind[output_cols].to_csv(OUTPUT_WIND_CSV, index=False)
    logger.info(f"Saved processed hourly wind generation to {OUTPUT_WIND_CSV} ({len(df_wind)} rows).")

    # 4. Generate Validation Report Metrics
    min_ws = float(df_wind["wind_speed_ms"].min())
    max_ws = float(df_wind["wind_speed_ms"].max())
    mean_ws = float(df_wind["wind_speed_ms"].mean())
    mean_power = float(df_wind["modeled_wind_power_kw"].mean())
    max_power = float(df_wind["modeled_wind_power_kw"].max())
    total_annual_energy_kwh = float(df_wind["modeled_wind_power_kw"].sum()) # 1h intervals, kW * 1h = kWh

    below_cut_in_hours = int(df_wind["is_below_cut_in"].sum())
    cut_out_hours = int(df_wind["is_cut_out"].sum())
    rated_output_hours = int((df_wind["status"] == "RATED_OUTPUT").sum())
    producing_hours = int((df_wind["modeled_wind_power_kw"] > 0).sum())
    producing_pct = round((producing_hours / num_obs) * 100.0, 2)
    capacity_factor_pct = round((mean_power / (config["wind_capacity_kw"] * config["availability_factor"])) * 100.0, 2)

    report = {
        "dataset": "Maitri AWS 2019 Hourly Wind Power Generation",
        "station": config["station"],
        "source_data": str(WEATHER_CSV),
        "source_provenance": "REAL_MEASURED_DATA (IMD 2019 Surface AWS)",
        "modeled_provenance": "MODELED_DATA (Piecewise Aerodynamic Power Curve)",
        "scenario_assumptions": {
            "wind_capacity_kw": config["wind_capacity_kw"],
            "cut_in_speed_ms": config["cut_in_speed_ms"],
            "rated_speed_ms": config["rated_speed_ms"],
            "cut_out_speed_ms": config["cut_out_speed_ms"],
            "availability_factor": config["availability_factor"],
        },
        "number_of_observations": num_obs,
        "date_range": [str(start_time), str(end_time)],
        "min_wind_speed_ms": round(min_ws, 2),
        "max_wind_speed_ms": round(max_ws, 2),
        "mean_wind_speed_ms": round(mean_ws, 2),
        "mean_modeled_power_kw": round(mean_power, 2),
        "maximum_modeled_power_kw": round(max_power, 2),
        "total_modeled_annual_energy_kwh": round(total_annual_energy_kwh, 1),
        "number_of_below_cut_in_hours": below_cut_in_hours,
        "number_of_cut_out_hours": cut_out_hours,
        "number_of_rated_output_hours": rated_output_hours,
        "percentage_of_hours_producing_power": producing_pct,
        "capacity_factor_percent": capacity_factor_pct,
    }

    VALIDATION_REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(VALIDATION_REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved validation report to {VALIDATION_REPORT_JSON}")

    OUTPUTS_DIR_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUTS_DIR_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved outputs validation report to {OUTPUTS_DIR_JSON}")

    # 5. Create Time-Series Plot
    logger.info("Generating wind speed and power profile plots...")
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 8), sharex=True)

    # Plot 1: Measured Wind Speed
    ax1.plot(df_weather["dt"], df_weather["wind_speed"], color="#0284C7", linewidth=0.8, alpha=0.85, label="Measured Wind Speed (m/s)")
    ax1.axhline(config["cut_in_speed_ms"], color="#10B981", linestyle="--", linewidth=1.2, label=f"Cut-In Speed ({config['cut_in_speed_ms']} m/s)")
    ax1.axhline(config["rated_speed_ms"], color="#F59E0B", linestyle="--", linewidth=1.2, label=f"Rated Speed ({config['rated_speed_ms']} m/s)")
    ax1.axhline(config["cut_out_speed_ms"], color="#EF4444", linestyle="--", linewidth=1.2, label=f"Cut-Out Speed ({config['cut_out_speed_ms']} m/s)")
    ax1.set_ylabel("Wind Speed (m/s)", fontsize=11, fontweight="bold")
    ax1.set_title("Maitri Station 2019 - Measured Hourly Wind Speed (IMD AWS Real Data)", fontsize=12, fontweight="bold")
    ax1.grid(True, linestyle=":", alpha=0.6)
    ax1.legend(loc="upper right", framealpha=0.9)

    # Plot 2: Modeled Electrical Generation
    ax2.plot(df_weather["dt"], df_wind["modeled_wind_power_kw"], color="#10B981", linewidth=0.8, alpha=0.9, label="Modeled Wind Power (kW)")
    ax2.axhline(config["wind_capacity_kw"] * config["availability_factor"], color="#EF4444", linestyle=":", linewidth=1.2, label=f"Max Derated Output ({config['wind_capacity_kw'] * config['availability_factor']} kW)")
    ax2.set_ylabel("Modeled Power (kW)", fontsize=11, fontweight="bold")
    ax2.set_xlabel("Date (UTC)", fontsize=11, fontweight="bold")
    ax2.set_title("Maitri Station 2019 - Modeled Wind Power Output (50 kW Baseline, PR=0.90)", fontsize=12, fontweight="bold")
    ax2.grid(True, linestyle=":", alpha=0.6)
    ax2.legend(loc="upper right", framealpha=0.9)

    plt.tight_layout()
    PLOT_PATH_1.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(PLOT_PATH_1, dpi=200)
    PLOT_PATH_2.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(PLOT_PATH_2, dpi=200)
    plt.close(fig)
    logger.info(f"Saved plots to {PLOT_PATH_1} and {PLOT_PATH_2}")

    print("\n========================================================")
    print("[SUCCESS] MAITRI 2019 WIND POWER PROCESSING COMPLETE")
    print(f"   Observations:               {num_obs}")
    print(f"   Min / Mean / Max Speed:     {min_ws:.2f} / {mean_ws:.2f} / {max_ws:.2f} m/s")
    print(f"   Mean Modeled Power:         {mean_power:.2f} kW")
    print(f"   Maximum Modeled Power:      {max_power:.2f} kW")
    print(f"   Total Annual Energy:        {total_annual_energy_kwh:.1f} kWh ({total_annual_energy_kwh / 1000.0:.2f} MWh)")
    print(f"   Below Cut-In Hours:         {below_cut_in_hours} ({below_cut_in_hours / num_obs * 100:.2f}%)")
    print(f"   Cut-Out Storm Hours:        {cut_out_hours} ({cut_out_hours / num_obs * 100:.2f}%)")
    print(f"   Rated Output Hours:         {rated_output_hours} ({rated_output_hours / num_obs * 100:.2f}%)")
    print(f"   Producing Hours:            {producing_hours} ({producing_pct:.2f}%)")
    print("========================================================\n")


if __name__ == "__main__":
    run_wind_processing()
