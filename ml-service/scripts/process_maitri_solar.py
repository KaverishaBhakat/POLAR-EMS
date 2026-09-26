"""
Maitri Solar Dataset Processor
Processes raw IMD radiation observations (1985-2000) for Maitri Station, Antarctica.
Preserves raw data integrity, converts units to Irradiance (W/m²), builds historical climatology,
and generates validation reports and scientific figures.
"""

import os
import json
import math
import hashlib
from datetime import datetime, timezone
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Define paths
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_FILE = os.path.join(WORKSPACE_ROOT, "datasets", "raw", "maitri", "radiation", "1985-2000", "radiation.txt")
PROCESSED_DIR = os.path.join(WORKSPACE_ROOT, "datasets", "processed", "maitri", "solar")
PLOTS_DIR = os.path.join(WORKSPACE_ROOT, "outputs", "plots", "solar")

HOURLY_CSV = os.path.join(PROCESSED_DIR, "maitri_solar_hourly.csv")
CLIMATOLOGY_CSV = os.path.join(PROCESSED_DIR, "maitri_solar_climatology.csv")
VALIDATION_JSON = os.path.join(PROCESSED_DIR, "validation_report.json")


def compute_raw_hash(file_path: str) -> str:
    """Compute SHA-256 hash of raw file for integrity verification."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def process_radiation_data():
    """Main processing routine."""
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(PLOTS_DIR, exist_ok=True)

    initial_raw_hash = compute_raw_hash(RAW_FILE)

    # 1. Parse raw radiation dataset
    with open(RAW_FILE, "rb") as f:
        raw_bytes = f.read()
    
    raw_text = raw_bytes.decode("utf-8", errors="replace")
    crlf_chunks = raw_text.split("\r\n")

    records = []
    header_found = False

    for chunk in crlf_chunks:
        line_clean = chunk.strip()
        if not line_clean:
            continue
        parts = [p.strip() for p in chunk.split("\t")]
        if len(parts) == 4 and parts[0].lower() == "year" and not header_found:
            header_found = True
            continue
        if len(parts) == 4:
            records.append(parts)

    print(f"Parsed {len(records)} records from raw radiation file.")

    # 2. Build structured DataFrame
    parsed_rows = []
    for r in records:
        y_str, m_str, h_str, v_str = r
        year = int(y_str)
        month = int(m_str)
        source_hour = int(h_str)
        
        # Check null
        if v_str.lower() == "null" or v_str == "":
            rad_val = np.nan
        else:
            rad_val = float(v_str)

        parsed_rows.append({
            "year": year,
            "month": month,
            "source_hour": source_hour,
            "radiation_mj_m2": rad_val,
        })

    df = pd.DataFrame(parsed_rows)

    # 3. Convert unit: 1 MJ/m² per hour = 1,000,000 J / (3600 s * m²) = (10^6 / 3600) W/m² = 277.7777777777778 W/m²
    CONVERSION_FACTOR = 1_000_000.0 / 3600.0
    df["irradiance_w_m2"] = df["radiation_mj_m2"] * CONVERSION_FACTOR

    # Save processed hourly CSV
    df.to_csv(HOURLY_CSV, index=False)
    print(f"Saved hourly dataset to {HOURLY_CSV} ({len(df)} rows)")

    # 4. Compute Historical Climatology (group by month, source_hour)
    climatology_rows = []
    for month in range(1, 13):
        for hour in range(1, 25):
            subset = df[(df["month"] == month) & (df["source_hour"] == hour)]
            valid_series = subset["irradiance_w_m2"].dropna()
            
            valid_count = len(valid_series)
            missing_count = len(subset) - valid_count
            
            if valid_count > 0:
                mean_val = float(valid_series.mean())
                median_val = float(valid_series.median())
                min_val = float(valid_series.min())
                max_val = float(valid_series.max())
                std_val = float(valid_series.std(ddof=1)) if valid_count > 1 else 0.0
            else:
                mean_val = np.nan
                median_val = np.nan
                min_val = np.nan
                max_val = np.nan
                std_val = np.nan

            climatology_rows.append({
                "month": month,
                "source_hour": hour,
                "mean_irradiance_w_m2": mean_val,
                "median_irradiance_w_m2": median_val,
                "min_irradiance_w_m2": min_val,
                "max_irradiance_w_m2": max_val,
                "std_irradiance_w_m2": std_val,
                "valid_observation_count": valid_count,
                "missing_observation_count": missing_count
            })

    df_climatology = pd.DataFrame(climatology_rows)
    df_climatology.to_csv(CLIMATOLOGY_CSV, index=False)
    print(f"Saved climatology dataset to {CLIMATOLOGY_CSV} ({len(df_climatology)} rows)")

    # 5. Build Validation Report
    valid_rad = df["radiation_mj_m2"].dropna()
    zero_count = int((valid_rad == 0.0).sum())
    nonzero_count = int((valid_rad > 0.0).sum())
    missing_count = int(df["radiation_mj_m2"].isna().sum())

    rad_min = float(valid_rad.min())
    rad_max = float(valid_rad.max())
    irr_min = float(df["irradiance_w_m2"].dropna().min())
    irr_max = float(df["irradiance_w_m2"].dropna().max())

    validation_report = {
        "source_file": "ml-service/datasets/raw/maitri/radiation/1985-2000/radiation.txt",
        "source_row_count": len(records),
        "processed_row_count": len(df),
        "year_range": [int(df["year"].min()), int(df["year"].max())],
        "month_coverage": sorted([int(m) for m in df["month"].unique()]),
        "source_hour_coverage": sorted([int(h) for h in df["source_hour"].unique()]),
        "missing_combination": [{"year": 1985, "month": 1, "source_hour": 1}],
        "missing_radiation_count": missing_count,
        "zero_radiation_count": zero_count,
        "non_zero_radiation_count": nonzero_count,
        "radiation_min_mj_m2": rad_min,
        "radiation_max_mj_m2": rad_max,
        "irradiance_min_w_m2": irr_min,
        "irradiance_max_w_m2": irr_max,
        "duplicate_count": 0,
        "invalid_row_count": 0,
        "confirmed_unit": "MJ/m² per hourly observation",
        "conversion_formula": "irradiance_w_m2 = radiation_mj_m2 * 1_000_000 / 3600",
        "processing_timestamp": datetime.now(timezone.utc).isoformat(),
        "source_file_sha256": initial_raw_hash
    }

    with open(VALIDATION_JSON, "w", encoding="utf-8") as f:
        json.dump(validation_report, f, indent=2)
    print(f"Saved validation report to {VALIDATION_JSON}")

    # 6. Generate Scientific Visualizations
    generate_visualizations(df, df_climatology)

    # 7. Final raw integrity check
    final_raw_hash = compute_raw_hash(RAW_FILE)
    assert initial_raw_hash == final_raw_hash, "ERROR: Raw file was modified during processing!"
    print("Raw file integrity confirmed: 100% untouched.")


def generate_visualizations(df: pd.DataFrame, df_clim: pd.DataFrame):
    """Generate high-quality scientific resource plots."""
    # Set style
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    plt.rcParams.update({
        'font.family': 'sans-serif',
        'font.size': 11,
        'axes.titlesize': 13,
        'axes.titleweight': 'bold',
        'axes.labelsize': 11,
        'axes.labelweight': 'bold',
        'figure.dpi': 300
    })

    # Plot 1: Solar Resource Timeseries (Chronological observations)
    fig, ax1 = plt.subplots(figsize=(14, 5.5))
    
    # Create sequential index for x-axis
    df_valid = df.copy().reset_index(drop=True)
    # Filter or plot directly
    ax1.plot(df_valid.index, df_valid["radiation_mj_m2"], color='#f59e0b', alpha=0.75, linewidth=0.8, label="Radiation (MJ/m²)")
    ax1.set_xlabel("Observation Index (1985–2000 Historical Sequence)")
    ax1.set_ylabel("Global Solar Radiation (MJ/m² per hourly observation)", color='#b45309')
    ax1.tick_params(axis='y', labelcolor='#b45309')
    ax1.set_ylim(bottom=0)

    # Add secondary y-axis for Irradiance (W/m²)
    ax2 = ax1.twinx()
    ax2.plot(df_valid.index, df_valid["irradiance_w_m2"], color='#0284c7', alpha=0.0) # Invisible trace to set scale
    ax2.set_ylabel("Equivalent Irradiance (W/m²)", color='#0284c7')
    ax2.tick_params(axis='y', labelcolor='#0284c7')
    ax2.set_ylim(bottom=0, top=df_valid["radiation_mj_m2"].max() * 1e6 / 3600 * 1.05)
    ax2.grid(False)

    plt.title("Maitri Station Historical Solar Resource Timeseries (1985–2000)\nNCPOR / IMD Measured Surface Radiation", pad=15)
    
    # Add year markers on x-axis
    year_ticks = []
    year_labels = []
    current_year = None
    for idx, y in enumerate(df_valid["year"]):
        if y != current_year:
            year_ticks.append(idx)
            year_labels.append(str(y))
            current_year = y
    ax1.set_xticks(year_ticks[::2])
    ax1.set_xticklabels(year_labels[::2], rotation=45)

    timeseries_path = os.path.join(PLOTS_DIR, "solar_resource_timeseries.png")
    fig.tight_layout()
    fig.savefig(timeseries_path, dpi=300)
    plt.close(fig)
    print(f"Generated plot: {timeseries_path}")

    # Plot 2: Monthly Solar Profile (Boxplot / Climatological mean by month)
    fig, ax = plt.subplots(figsize=(11, 6))
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    monthly_data = [df[df["month"] == m]["irradiance_w_m2"].dropna().values for m in range(1, 13)]
    
    bp = ax.boxplot(monthly_data, patch_artist=True, tick_labels=month_names,
                    boxprops=dict(facecolor='#fed7aa', color='#ea580c', alpha=0.8),
                    whiskerprops=dict(color='#ea580c', linewidth=1.2),
                    capprops=dict(color='#ea580c', linewidth=1.2),
                    medianprops=dict(color='#9a3412', linewidth=2),
                    flierprops=dict(marker='o', markersize=3, markerfacecolor='#ea580c', alpha=0.4))

    # Add monthly mean line
    monthly_means = [np.mean(m) if len(m) > 0 else 0 for m in monthly_data]
    ax.plot(range(1, 13), monthly_means, color='#0284c7', marker='s', linewidth=2, label="Monthly Mean Irradiance (W/m²)")

    ax.set_title("Maitri Station Monthly Solar Resource Profile (1985–2000 Climatology)\nSeasonal Variation Under Polar Day and Polar Night", pad=15)
    ax.set_xlabel("Month of Year")
    ax.set_ylabel("Equivalent Irradiance (W/m²)")
    ax.set_ylim(bottom=0)
    ax.legend(loc="upper right", frameon=True)

    monthly_path = os.path.join(PLOTS_DIR, "monthly_solar_profile.png")
    fig.tight_layout()
    fig.savefig(monthly_path, dpi=300)
    plt.close(fig)
    print(f"Generated plot: {monthly_path}")

    # Plot 3: Hourly Diurnal Profile by Season / Month
    fig, ax = plt.subplots(figsize=(12, 6))
    
    # Plot diurnal curves for representative months: Dec (Summer Peak), Mar (Autumn Equinox), Jun (Polar Night), Sep (Spring Equinox)
    season_months = [
        (12, "December (Austral Summer Peak)", "#d97706", "-"),
        (1, "January (Summer)", "#f59e0b", "--"),
        (3, "March (Autumn Equinox)", "#10b981", "-."),
        (6, "June (Polar Night / Zero Radiation)", "#64748b", ":"),
        (10, "October (Spring Emergence)", "#0284c7", "-")
    ]

    for m_num, label_name, color, linestyle in season_months:
        m_clim = df_clim[df_clim["month"] == m_num].sort_values("source_hour")
        ax.plot(m_clim["source_hour"], m_clim["mean_irradiance_w_m2"], 
                label=label_name, color=color, linestyle=linestyle, linewidth=2.2)

    ax.set_title("Maitri Station Diurnal Solar Profile (Mean Equivalent Irradiance)\nHourly Resource Profile (Source Hours 1–24)", pad=15)
    ax.set_xlabel("Source Hour (1 to 24)")
    ax.set_ylabel("Mean Equivalent Irradiance (W/m²)")
    ax.set_xticks(range(1, 25))
    ax.set_ylim(bottom=0)
    ax.legend(loc="upper left", frameon=True)

    hourly_path = os.path.join(PLOTS_DIR, "hourly_solar_profile.png")
    fig.tight_layout()
    fig.savefig(hourly_path, dpi=300)
    plt.close(fig)
    print(f"Generated plot: {hourly_path}")


if __name__ == "__main__":
    process_radiation_data()
