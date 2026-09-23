"""
Verification and diagnostic script for ML Service environment, database, loaders, and models.
"""

import sys
import os
from pathlib import Path

# Add ml-service to path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import settings
from app.database.postgres import check_database_connection, resolve_station
from app.data.loader import load_weather_data, load_energy_data, load_renewable_data
from app.data.cleaner import check_data_sufficiency, clean_time_series_data
from app.data.features import build_feature_matrix
from app.training.trainer import train_energy_model, train_renewable_model

print("=" * 60)
print("POLAR-EMS ML SERVICE DIAGNOSTICS")
print("=" * 60)

# 1. Environment Check
print(f"Python Version: {sys.version.split()[0]}")
print(f"Model Storage: {settings.model_dir.absolute()}")

# 2. Database Connection Check
db_status = check_database_connection()
print(f"Database Connection: {'PASS' if db_status['connected'] else 'FAIL'} ({db_status})")

if db_status["connected"]:
    # Check stations
    for station_code in ["MAITRI", "BHARATI"]:
        st = resolve_station(station_code)
        print(f"\nStation '{station_code}': {st['name'] if st else 'NOT FOUND'} (id: {st['id'] if st else None})")
        if st:
            st_id = st["id"]
            # Test loaders
            w_df = load_weather_data(st_id)
            e_df = load_energy_data(st_id)
            r_df = load_renewable_data(st_id)
            
            print(f"  - Weather records: {len(w_df)}")
            print(f"  - Energy records: {len(e_df)}")
            print(f"  - Renewable records: {len(r_df)}")
            
            # Check training response
            print(f"\n  Testing Energy Training for {station_code}:")
            e_train_res = train_energy_model(station_code)
            print(f"  Result: status={e_train_res.get('status')}, message={e_train_res.get('message', 'N/A')}")
            
            print(f"\n  Testing Renewable Training for {station_code}:")
            r_train_res = train_renewable_model(station_code)
            print(f"  Result: status={r_train_res.get('status')}, message={r_train_res.get('message', 'N/A')}")
print("=" * 60)
