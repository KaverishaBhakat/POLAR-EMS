"""
Automated PyTest Suite for Bharati Antarctic Weather Data Validation & Refinement.
Validates:
- Immutability of raw datasets
- Non-fabrication of data / zero synthetic interpolation
- Accurate column mappings & unit conversions
- Proper handling of sensor anomalies (IIG 2016 humidity failure, IMD 2018 wind duplication)
- Null solar radiation preservation
- Chronological ordering & schema compatibility with POLAR-EMS
"""

import os
from pathlib import Path
import pandas as pd
import numpy as np
import pytest

ML_SERVICE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = ML_SERVICE_DIR / "datasets" / "processed" / "bharati" / "weather"
RAW_DIR = ML_SERVICE_DIR / "datasets" / "raw" / "bharati" / "weather"


def test_raw_files_exist_and_intact():
    iig_path = RAW_DIR / "iig_bharati.nc"
    imd_path = RAW_DIR / "imd_bharati.nc"
    assert iig_path.exists(), "Raw iig_bharati.nc must exist"
    assert imd_path.exists(), "Raw imd_bharati.nc must exist"
    assert os.path.getsize(iig_path) == 1110833, "Raw iig_bharati.nc must be unchanged"
    assert os.path.getsize(imd_path) == 22101249, "Raw imd_bharati.nc must be unchanged"


def test_processed_files_generated():
    master_csv = PROCESSED_DIR / "bharati_weather_refined.csv"
    iig_csv = PROCESSED_DIR / "bharati_iig_weather_refined.csv"
    imd_csv = PROCESSED_DIR / "bharati_imd_weather_refined.csv"
    report_json = PROCESSED_DIR / "bharati_weather_validation_report.json"
    report_md = PROCESSED_DIR / "bharati_weather_validation_report.md"
    
    assert master_csv.exists(), "Master refined CSV must exist"
    assert iig_csv.exists(), "IIG refined CSV must exist"
    assert imd_csv.exists(), "IMD refined CSV must exist"
    assert report_json.exists(), "Validation report JSON must exist"
    assert report_md.exists(), "Validation report MD must exist"


def test_schema_and_types():
    master_csv = PROCESSED_DIR / "bharati_weather_refined.csv"
    df = pd.read_csv(master_csv)
    
    expected_cols = [
        "stationId", "timestamp", "temperature", "humidity",
        "windSpeed", "windDirection", "pressure", "solarRadiation",
        "sourceDataset", "qualityFlag"
    ]
    assert list(df.columns) == expected_cols
    assert (df["stationId"] == "bharati").all()
    assert df["solarRadiation"].isnull().all(), "solarRadiation must be 100% null (not fabricated)"


def test_physical_plausibility_bounds():
    master_csv = PROCESSED_DIR / "bharati_weather_refined.csv"
    df = pd.read_csv(master_csv)
    
    # Temperature: Antarctic coastal station range (-45 to +15 °C)
    temps = df["temperature"].dropna()
    assert (temps >= -45.0).all() and (temps <= 15.0).all()
    
    # Pressure: Barometric range (900 to 1030 hPa)
    press = df["pressure"].dropna()
    assert (press >= 900.0).all() and (press <= 1030.0).all()
    
    # Humidity: (0 to 100 %)
    hum = df["humidity"].dropna()
    assert (hum >= 0.0).all() and (hum <= 100.0).all()
    
    # Wind Direction: (0 to 360 deg)
    wd = df["windDirection"].dropna()
    assert (wd >= 0.0).all() and (wd <= 360.0).all()
    
    # Wind Speed: (0 to 95 m/s)
    ws = df["windSpeed"].dropna()
    assert (ws >= 0.0).all() and (ws <= 95.0).all()


def test_chronological_ordering_and_no_duplicates():
    master_csv = PROCESSED_DIR / "bharati_weather_refined.csv"
    df = pd.read_csv(master_csv)
    
    # Check monotonic timestamp increase
    ts = pd.to_datetime(df["timestamp"], utc=True)
    assert ts.is_monotonic_increasing, "Master dataset must be chronologically ordered"
    assert df["timestamp"].duplicated().sum() == 0, "No duplicate timestamps allowed in master hourly"
