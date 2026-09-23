# POLAR-EMS Machine Learning & Forecasting Service

Production-ready time-series AI/ML forecasting service tailored for extreme-environment Antarctic polar station microgrids (**Maitri Station** and **Bharati Station**).

---

## 1. Overview & Purpose

In isolated polar microgrids, weather severity and sudden blizzard fronts directly impact human survival, thermal stability, and energy supply. The **POLAR-EMS ML Service** delivers high-reliability 24-hour forecasts for:
- **Energy Demand (`totalLoad`)**: Critical habitation heating, life support, lab equipment, and base loads.
- **Renewable Generation (`totalRenewable`)**: Combined solar photovoltaic and wind turbine power generation.

The service is built as a modular microservice in Python that connects directly to the existing Neon PostgreSQL database via parameterized queries, trains station-specific gradient boosted decision tree models, and serves forecasts via FastAPI.

---

## 2. Architecture

```text
Next.js Frontend (Port 3000)
        ↓
Node/Express Backend (Port 8000)
        ↓
Neon PostgreSQL (Relational schema: stations, weather_data, energy_loads, renewable_generation)
        ↓
Python ML Service (FastAPI on Port 8001)
        ↓
Station Models (HistGradientBoostingRegressor artifacts in trained_models/)
```

### Direct Database Integration
The Python ML service communicates directly with PostgreSQL using SQLAlchemy connection pooling and parameterized SQL queries to load historical records without data alteration.

---

## 3. Technology Stack & Model Choice

- **Runtime**: Python 3.11+ / Python 3.14
- **Web Framework**: FastAPI, Uvicorn, Pydantic v2
- **Data & ML**: pandas, numpy, scikit-learn (`HistGradientBoostingRegressor`), joblib
- **Database**: SQLAlchemy, psycopg2-binary
- **Testing**: pytest, httpx

### Why `HistGradientBoostingRegressor`?
1. **Superior Tabular Time-Series Accuracy**: Gradient-boosted decision trees (GBDTs) consistently outperform LSTMs, Transformers, and deep learning architectures on small-to-medium tabular time-series with engineered lag and rolling statistics.
2. **Native Missing Value Resilience**: Harsh Antarctic telemetry frequently suffers packet drops due to severe geomagnetic storms and blizzards. `HistGradientBoostingRegressor` natively handles missing values during both training and inference without requiring synthetic or artificial interpolation.
3. **No Heavy Deep Learning Overhead**: Avoids massive multi-gigabyte TensorFlow or PyTorch runtimes, making the model lightweight and fast to train and deploy.
4. **Deterministic & Explainable**: Yields reliable bounding and clear feature dependency.

---

## 4. Prisma Schema Fields Used

The ML service strictly adheres to the database schema defined in `backend/prisma/schema.prisma`.

| Entity | PostgreSQL Table | Database Columns Extracted / Used |
| :--- | :--- | :--- |
| **Station** | `stations` | `id`, `code`, `name`, `latitude`, `longitude`, `status` |
| **Weather** | `weather_data` | `"stationId"`, `timestamp`, `temperature`, `pressure`, `humidity`, `"windSpeed"`, `"solarRadiation"` |
| **Energy Load** | `energy_loads` | `"stationId"`, `timestamp`, `"totalLoad"` (*Primary Target*), `"heatingLoad"`, `"waterLoad"`, `"communicationLoad"`, `"laboratoryLoad"`, `"refrigerationLoad"`, `"flexibleLoad"` |
| **Renewable** | `renewable_generation` | `"stationId"`, `timestamp`, `"solarPower"`, `"windPower"`, `"totalRenewable"` (*Primary Target*) |

---

## 5. Feature Engineering Pipeline

For each hourly observation $t$, the feature pipeline generates:
1. **Calendar / Cyclical Features**:
   - `hour`, `day_of_week`, `day_of_year`, `month`, `is_weekend`
   - Continuous cyclical features: $\sin\left(\frac{2\pi \cdot \text{hour}}{24}\right)$, $\cos\left(\frac{2\pi \cdot \text{hour}}{24}\right)$, $\sin\left(\frac{2\pi \cdot (\text{month}-1)}{12}\right)$, $\cos\left(\frac{2\pi \cdot (\text{month}-1)}{12}\right)$
2. **Autoregressive Lag Features**:
   - $\text{lag}_1, \text{lag}_2, \text{lag}_3, \text{lag}_6, \text{lag}_{12}, \text{lag}_{24}$
3. **Rolling Window Statistics** (shifted by 1 step to prevent target leakage):
   - $\text{rolling\_mean}_3, \text{rolling\_mean}_6, \text{rolling\_mean}_{12}, \text{rolling\_mean}_{24}$
   - $\text{rolling\_std}_6, \text{rolling\_std}_{24}$
4. **Exogenous Weather Variables**:
   - `temperature`, `pressure`, `humidity`, `wind_speed`, `solar_radiation`

---

## 6. Chronological Train/Test Split & Metrics

### Why Chronological Splitting?
Standard random K-Fold cross-validation or random train/test splits cause **temporal data leakage** (using future observations to predict past states), resulting in falsely optimistic validation scores that fail in production. 

The service strictly uses **chronological splitting**:
- **80% Earliest Records**: Model training
- **20% Most Recent Records**: Model testing and metric evaluation

### Evaluation Metrics
- **MAE (Mean Absolute Error)**: $\frac{1}{N} \sum |y_i - \hat{y}_i|$
- **RMSE (Root Mean Squared Error)**: $\sqrt{\frac{1}{N} \sum (y_i - \hat{y}_i)^2}$
- **$R^2$ (Coefficient of Determination)**: $1 - \frac{\sum(y_i - \hat{y}_i)^2}{\sum(y_i - \bar{y})^2}$
- **Zero-Safe MAPE (Mean Absolute Percentage Error)**: Calculated only across records where actual $|y_i| > 0.1$ to prevent division-by-zero errors during periods of zero solar or minimal wind output.

---

## 7. Minimum-Data Protection & Data Provenance

### Strict Zero-Fabrication Policy
The ML service will **never fabricate synthetic observations** or claim artificial accuracy when insufficient real data is available.

- Minimum required observations threshold: **168 hours (1 full week)** by default.
- Maximum allowable missing target values: **25%**.
- If a station has fewer than the required observations, the training endpoint returns HTTP `422 Unprocessable Entity` with a clear diagnostic explanation:

```json
{
  "status": "insufficient_data",
  "station": "MAITRI",
  "target": "total_load",
  "message": "Not enough historical observations to train a reliable forecasting model. Found 48 valid records, but 168 are required.",
  "observations": 48,
  "required_minimum": 168,
  "missing_pct": 0.0
}
```

### Data Provenance Notice
Operational telemetry in initial test databases may be benchmarked against synthetic baseline scenarios. Operational datasets must be identified according to their actual provenance and must **not** be presented as real NCPOR field measurements unless verified against actual physical station SCADA logs.

---

## 8. Installation & Setup

### Prerequisites
- Python 3.11+
- Working PostgreSQL database connection (e.g., Neon PostgreSQL)

### 1. Create Virtual Environment
```bash
cd ml-service
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` matches your PostgreSQL connection string:
```ini
DATABASE_URL=postgresql://neondb_owner:password@ep-divine-breeze.aws.neon.tech/neondb?sslmode=require
ML_SERVICE_PORT=8001
MIN_TRAINING_OBSERVATIONS=168
MODEL_STORAGE_PATH=./trained_models
```

---

## 9. Running the Service

Start the FastAPI application with Uvicorn:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
Interactive OpenAPI Swagger docs will be available at `http://localhost:8001/docs`.

---

## 10. API Endpoints Reference

### 1. Health Check
```http
GET /health
```
**Response (200 OK):**
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

---

### 2. Train Energy Model
```http
POST /train/energy
Content-Type: application/json

{
  "station_id": "MAITRI"
}
```
**Response (200 OK on success):**
```json
{
  "status": "success",
  "station": "MAITRI",
  "target": "total_load",
  "unit": "kW",
  "trained_at": "2026-09-24T00:10:00Z",
  "training_observations": 250,
  "test_observations": 62,
  "features": ["hour", "day_of_week", "hour_sin", "hour_cos", "lag_1", "lag_2", "rolling_mean_3", "temperature"],
  "metrics": {
    "mae": 1.84,
    "rmse": 2.45,
    "r2": 0.91,
    "mape": 3.12
  },
  "artifact_path": "trained_models/MAITRI_energy_model.joblib"
}
```

---

### 3. Train Renewable Model
```http
POST /train/renewable
Content-Type: application/json

{
  "station_id": "BHARATI"
}
```

---

### 4. 24-Hour Energy Forecast
```http
GET /forecast/energy/MAITRI
```
**Response (200 OK):**
```json
{
  "status": "success",
  "station": "MAITRI",
  "target": "energy_load",
  "unit": "kW",
  "horizon_hours": 24,
  "generated_at": "2026-09-24T00:15:00Z",
  "predictions": [
    { "timestamp": "2026-09-24T01:00:00Z", "predicted_value": 62.4 },
    { "timestamp": "2026-09-24T02:00:00Z", "predicted_value": 61.8 }
  ]
}
```

---

### 5. 24-Hour Renewable Generation Forecast
```http
GET /forecast/renewable/MAITRI
```

---

### 6. Model Status
```http
GET /model/status
```
**Response (200 OK):**
```json
{
  "energy": {
    "MAITRI": {
      "trained": true,
      "trained_at": "2026-09-24T00:10:00Z",
      "training_observations": 250,
      "test_observations": 62,
      "total_observations": 312,
      "mae": 1.84,
      "rmse": 2.45,
      "r2": 0.91,
      "mape": 3.12,
      "feature_count": 18,
      "target": "total_load",
      "unit": "kW"
    },
    "BHARATI": {
      "trained": false
    }
  },
  "renewable": {
    "MAITRI": {
      "trained": false
    },
    "BHARATI": {
      "trained": false
    }
  }
}
```

---

## 11. Testing

Run the automated test suite:
```bash
pytest tests -v
```

The test suite validates:
- Temporal feature generation and cyclical sine/cosine encoders.
- Autoregressive lag and rolling window calculation without target leakage.
- Weather feature alignment with missing value tolerance.
- Chronological train/test split.
- `HistGradientBoostingRegressor` model persistence and non-negative output bounds.
- Multi-step 24-hour recursive feature creation.
- Strict minimum data protection gates.
- FastAPI endpoints with mocked and controlled test DataFrames.
