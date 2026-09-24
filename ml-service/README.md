# POLAR-EMS ML Data Pipeline

Foundation data engineering module for the POLAR-EMS Machine Learning service, tailored for extreme-environment Antarctic research stations (**Maitri Station** and **Bharati Station**).

> [!IMPORTANT]
> **This module prepares historical data for ML; it does not perform forecasting yet.**
> Forecasting models, optimization algorithms, and automated dispatch will consume the datasets prepared by this pipeline in subsequent phases.

---

## 1. Overview & Purpose

In remote Antarctic microgrids, raw sensor data from SCADA and Automatic Weather Stations (AWS) arrives with irregular timestamps, packet drops from blizzard interference, and varying physical units.

The **ML Data Pipeline** establishes a robust, reproducible data foundation:
```text
Neon PostgreSQL → Load → Clean & Validate → Time Alignment → Feature Engineering → ML-Ready Dataset
```

It guarantees that all future machine learning modules (energy demand forecasting, renewable generation forecasting, and battery dispatch optimization) receive high-integrity, chronological, leak-free tabular datasets without mutating the underlying database.

---

## 2. Architecture & Directory Structure

```text
ml-service/
├── app/
│   ├── __init__.py
│   ├── config.py             # Environment & settings configuration (Pydantic Settings)
│   ├── db.py                 # SQLAlchemy connection, URL sanitizer & station resolver
│   ├── data/
│   │   ├── __init__.py
│   │   ├── loaders.py        # Parameterized PostgreSQL data loaders
│   │   ├── cleaning.py       # Timestamp parsing, deduplication, validation reporting
│   │   ├── alignment.py      # Time-series resampling & frequency alignment (1min, 15min, 1h)
│   │   ├── features.py       # Calendar, cyclical, configurable lag & rolling statistics
│   │   └── pipeline.py       # prepare_ml_dataset orchestrator
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── data_schemas.py   # Pydantic v2 validation & dataset schemas
│   ├── api/
│   │   ├── __init__.py
│   │   └── data_routes.py    # REST API endpoints for raw & prepared data
│   └── main.py               # FastAPI application
├── tests/
│   ├── test_cleaning.py      # Tests for deduplication, missing values, bounds
│   ├── test_alignment.py     # Tests for time alignment & resampling
│   ├── test_features.py      # Tests for calendar, lag, and rolling features
│   ├── test_pipeline.py      # Tests for prepare_ml_dataset orchestration
│   └── test_api.py           # Tests for FastAPI endpoints
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Database Connection & Schema Alignment

The pipeline connects directly to the project's Neon PostgreSQL database using SQLAlchemy and parameterized SQL queries to prevent SQL injection.

### Neon Connection Sanitizer
PostgreSQL URLs containing Prisma/Neon-specific query options (such as `pgbouncer=true` or `channel_binding=require`) are dynamically sanitized in `app/db.py` to ensure complete compatibility with `psycopg2-binary` and `libpq`.

### PostgreSQL / Prisma Tables Used:
1. **`weather_data`**: `"stationId"`, `timestamp`, `temperature`, `pressure`, `humidity`, `"windSpeed"`, `"windDirection"`, `"solarRadiation"`
2. **`energy_loads`**: `"stationId"`, `timestamp`, `"totalLoad"`, `"heatingLoad"`, `"waterLoad"`, `"communicationLoad"`, `"laboratoryLoad"`, `"refrigerationLoad"`, `"flexibleLoad"`
3. **`renewable_generation`**: `"stationId"`, `timestamp`, `"solarPower"`, `"windPower"`, `"totalRenewable"`
4. **`stations`**: `id` (UUID), `code` (`'MAITRI'`, `'BHARATI'`), `name`, `latitude`, `longitude`, `status`

---

## 4. Data Validation & Cleaning

Every dataset undergoes automated validation without silent data deletion.

### Validation Checks:
1. **Timestamp Verification & Parsing**: Converts timestamps to UTC-normalized pandas `datetime`.
2. **Chronological Sorting**: Ensures strict past-to-present ordering.
3. **Deduplication**: Identifies duplicate timestamps and retains the latest observation.
4. **Invalid Numeric Detection**: Coerces non-numeric strings and infinite values (`inf`, `-inf`) to `NaN`.
5. **Physical Bounds Enforcement**: Clamps non-negative physical values (such as `total_load`, `solar_power`, `solar_radiation`) to $\ge 0.0$.
6. **Detailed Cleaning Report**:
   ```json
   {
     "rows_before": 435,
     "rows_after": 435,
     "duplicates": 0,
     "missing_values": 0,
     "invalid_rows": 0,
     "invalid_numeric_values": 0,
     "start_time": "2016-12-01T10:00:00+00:00",
     "end_time": "2016-12-19T12:00:00+00:00",
     "status": "clean"
   }
   ```

---

## 5. Time Alignment & Resampling

The `align_time_series(df, frequency)` utility converts irregular readings into regular time-series intervals:

- **Supported Frequencies**: `"1min"`, `"15min"`, `"30min"`, `"1h"`, `"1d"`.
- **Continuous Physical Measurements**: Resampled using `mean()` aggregation across the interval (e.g. average temperature, average kW load).
- **Categorical / Station Metadata**: Preserved using `first()` (e.g. `station_id`, `wind_direction`).

---

## 6. Feature Engineering

The feature engine generates structured tabular features for time-series modeling:

1. **Calendar & Temporal Features**:
   - `hour` (0–23), `day_of_week` (0–6), `day_of_month` (1–31), `day_of_year` (1–366), `month` (1–12), `week_of_year` (1–53), `is_weekend` (0 or 1).
2. **Continuous Cyclical Features**:
   - $\text{hour\_sin} = \sin(2\pi \cdot \text{hour} / 24)$, $\text{hour\_cos} = \cos(2\pi \cdot \text{hour} / 24)$
   - $\text{month\_sin} = \sin(2\pi \cdot (\text{month} - 1) / 12)$, $\text{month\_cos} = \cos(2\pi \cdot (\text{month} - 1) / 12)$
3. **Autoregressive Lag Features** (Configurable):
   - e.g. `lag_1`, `lag_2`, `lag_3`, `lag_24`.
   - *Safeguard*: Lags are only created if sufficient historical records exist.
4. **Rolling Window Statistics** (Configurable):
   - e.g. `rolling_mean_3`, `rolling_mean_6`, `rolling_mean_24`, `rolling_std_6`, `rolling_std_24`.
   - *Data Leakage Prevention*: Targets are shifted by 1 step before rolling window computation so that the current time step's target value is never leaked into input features.
5. **Exogenous Weather Alignment**:
   - Joins weather variables (`temperature`, `pressure`, `humidity`, `wind_speed`, `solar_radiation`) onto energy/renewable loads based on nearest-hour timestamps.

---

## 7. Real Data Compatibility & NCPOR Transparency

- The dataset contains real Maitri AWS historical records (e.g., 435 hourly observations from 2016-12-01 10:00:00 through 2016-12-19 12:00:00).
- **Zero Fabrication Policy**: If a station has no observations (e.g. Bharati Station in a fresh environment) or if a requested date range is empty, the pipeline returns a clean empty dataset with `rows: 0` and `status: "empty"` rather than generating synthetic data.

---

## 8. API Endpoints

### 1. Health & Database Check
```http
GET /health
```
```json
{
  "status": "ok",
  "service": "POLAR-EMS ML Service",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "error": null
  }
}
```

### 2. Raw Validated Data
```http
GET /data/weather/{station_id}?start_date=2016-12-01&end_date=2016-12-19&limit=500
GET /data/energy/{station_id}?limit=500
GET /data/renewable/{station_id}?limit=500
```

### 3. ML-Ready Prepared Dataset
```http
GET /data/weather/{station_id}/prepared?frequency=1h&lags=1,2,24&rolling_windows=3,6,24
GET /data/energy/{station_id}/prepared?frequency=1h&include_weather=true&lags=1,2,3,24&rolling_windows=3,6,24
GET /data/renewable/{station_id}/prepared?frequency=1h&include_weather=true&lags=1,2,3,24&rolling_windows=3,6,24
```

**Example Prepared Response:**
```json
{
  "status": "success",
  "metadata": {
    "station_id": "5e70a9cf-fe6b-4c3a-a615-79fd2e453b60",
    "station_code": "MAITRI",
    "station_name": "Maitri Station",
    "data_type": "weather",
    "frequency": "1h",
    "rows": 435,
    "start_time": "2016-12-01T10:00:00+00:00",
    "end_time": "2016-12-19T12:00:00+00:00",
    "features": [
      "timestamp", "temperature", "pressure", "humidity", "wind_speed",
      "solar_radiation", "hour", "day_of_week", "day_of_month", "day_of_year",
      "month", "week_of_year", "is_weekend", "hour_sin", "hour_cos",
      "month_sin", "month_cos", "lag_1", "lag_2", "lag_24",
      "rolling_mean_3", "rolling_mean_6", "rolling_mean_24"
    ],
    "target_col": "temperature"
  },
  "validation_report": {
    "rows_before": 435,
    "rows_after": 435,
    "duplicates": 0,
    "missing_values": 0,
    "invalid_rows": 0,
    "status": "clean"
  },
  "records": [ ... ]
}
```

---

## 9. Running & Testing

### 1. Activate Environment
```powershell
cd ml-service
.\.venv\Scripts\Activate.ps1
```

### 2. Run Test Suite
```powershell
pytest tests -v
```

### 3. Start API Service
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
Interactive OpenAPI documentation will be accessible at: `http://localhost:8001/docs`.
