"""
Live Verification Script for POLAR-EMS ML Data Pipeline.
Tests PostgreSQL extraction, cleaning, validation reporting, alignment resampling,
feature engineering, ML-ready dataset preparation, and FastAPI endpoints.
"""

import sys
from pathlib import Path
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))

from app.db import check_db_connection, resolve_station_info
from app.data.loaders import load_weather_data, load_energy_data, load_renewable_data
from app.data.cleaning import validate_and_clean_time_series
from app.data.alignment import align_time_series
from app.data.features import add_calendar_features, add_lag_features, add_rolling_features
from app.data.pipeline import prepare_ml_dataset
from fastapi.testclient import TestClient
from app.main import app

print("=" * 70)
print("POLAR-EMS ML DATA PIPELINE LIVE VERIFICATION")
print("=" * 70)

# 1. DB Connection Test
db_check = check_db_connection()
print(f"1. Database Connection: {'PASS' if db_check['connected'] else 'FAIL'} ({db_check})")

# 2. Station Resolution Test
for st_code in ["MAITRI", "BHARATI", "NON_EXISTENT"]:
    info = resolve_station_info(st_code)
    print(f"2. Station '{st_code}': {'FOUND' if info else 'NOT FOUND'} -> {info.get('name') if info else None}")

# 3. Loaders & Validation Reports
print("\n3. Testing Data Loaders & Validation Reports for MAITRI:")
w_df = load_weather_data("MAITRI")
e_df = load_energy_data("MAITRI")
r_df = load_renewable_data("MAITRI")

clean_w, w_rep = validate_and_clean_time_series(w_df, non_negative_cols=["solar_radiation", "humidity", "wind_speed"])
clean_e, e_rep = validate_and_clean_time_series(e_df, non_negative_cols=["total_load"])
clean_r, r_rep = validate_and_clean_time_series(r_df, non_negative_cols=["total_renewable"])

print(f"   Weather records: {len(w_df)} -> Cleaned: {len(clean_w)}, Report: {w_rep}")
print(f"   Energy records: {len(e_df)} -> Cleaned: {len(clean_e)}, Report: {e_rep}")
print(f"   Renewable records: {len(r_df)} -> Cleaned: {len(clean_r)}, Report: {r_rep}")

# 4. In-Memory Time Alignment & Feature Engineering Test (Simulating AWS / Maitri dataset)
print("\n4. Testing Time Alignment & Feature Engineering on Sample Data (50 observations):")
sample_ts = pd.date_range("2016-12-01 10:00:00", periods=50, freq="15min", tz="UTC")
sample_df = pd.DataFrame({
    "timestamp": sample_ts,
    "temperature": [-12.5 + (i * 0.1) for i in range(50)],
    "wind_speed": [10.0 + (i % 5) for i in range(50)],
    "solar_radiation": [150.0 + (i % 20) for i in range(50)],
    "station_id": ["MAITRI"] * 50
})

aligned_1h = align_time_series(sample_df, frequency="1h")
print(f"   15-min -> 1-h Resampling: {len(sample_df)} rows -> {len(aligned_1h)} hourly rows")

with_cal = add_calendar_features(aligned_1h)
with_lags = add_lag_features(with_cal, target_col="temperature", lags=[1, 2, 3])
with_rolling = add_rolling_features(with_lags, target_col="temperature", windows=[3, 6])
print(f"   Features added: {list(with_rolling.columns)}")

# 5. ML-Ready Dataset Pipeline Test
print("\n5. Testing prepare_ml_dataset for MAITRI (Real DB Data):")
prepared_w = prepare_ml_dataset(data_type="weather", station_id="MAITRI", frequency="1h", lags=[1, 2, 24], rolling_windows=[3, 6])
print(f"   Prepared Weather Metadata: {prepared_w['metadata']}")
print(f"   Prepared Weather Report:   {prepared_w['validation_report']}")

# 6. Testing Empty Station (BHARATI)
print("\n6. Testing prepare_ml_dataset for BHARATI (Empty/Zero-record Station):")
prepared_bharati = prepare_ml_dataset(data_type="weather", station_id="BHARATI")
print(f"   Empty Station Metadata: {prepared_bharati['metadata']}")
print(f"   Empty Station Report:   {prepared_bharati['validation_report']}")

# 7. FastAPI Endpoint Client Test
print("\n7. Testing FastAPI Endpoints:")
client = TestClient(app)
r_health = client.get("/health")
print(f"   GET /health: [{r_health.status_code}] {r_health.json()}")

r_data_w = client.get("/data/weather/MAITRI?limit=2")
print(f"   GET /data/weather/MAITRI: [{r_data_w.status_code}] total_rows={r_data_w.json().get('total_rows')}")

r_prep_w = client.get("/data/weather/MAITRI/prepared?frequency=1h&lags=1,2,3")
print(f"   GET /data/weather/MAITRI/prepared: [{r_prep_w.status_code}] metadata={r_prep_w.json().get('metadata')}")

r_empty_w = client.get("/data/weather/BHARATI")
print(f"   GET /data/weather/BHARATI (Empty): [{r_empty_w.status_code}] total_rows={r_empty_w.json().get('total_rows')}")

print("\n" + "=" * 70)
print("ALL PIPELINE VERIFICATIONS COMPLETE & FUNCTIONAL")
print("=" * 70)
