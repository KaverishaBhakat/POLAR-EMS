---
documentId: "forecasting-weather-forecast"
title: "Machine Learning Meteorological Forecasting Architecture"
category: "FORECASTING"
station: "MAITRI"
sourceType: "PROJECT_DOCUMENTATION"
provenance: "MODELED / SCENARIO"
version: "1.0"
source: "ml-service/app/forecasting/predictor.py"
---

# Machine Learning Weather Forecasting in POLAR-EMS

## 1. Machine Learning Model Architecture
The POLAR-EMS Python ML service (port 8001) implements an autoregressive **Histogram-Based Gradient Boosting Regression (`HistGradientBoostingRegressor`)** model trained on the complete 8,760-hour 2019 Maitri AWS dataset.

## 2. Feature Engineering Pipeline
The 24-hour lookahead predictor leverages temporal, thermodynamic, and lag features:
- **Cyclical Temporal Features**: Sine and cosine encodings of hour of day ($h \in [0, 23]$) and day of year ($d \in [1, 365]$).
- **Recent Telemetry Lags**: Lagged values of ambient temperature ($t-1, t-2, t-3, t-6, t-12, t-24\text{ hours}$).
- **Thermodynamic Couplings**: Atmospheric pressure, relative humidity, wind speed, and compass wind direction transformed into continuous degree coordinates ($0^\circ - 360^\circ$).
- **Rolling Statistics**: 3-hour, 6-hour, and 24-hour rolling mean, standard deviation, min, and max of ambient temperature.

## 3. Model Accuracy Metrics
- **Coefficient of Determination ($R^2$)**: $0.9863$
- **Mean Absolute Error (MAE)**: $0.3735^\circ\text{C}$
- **Root Mean Square Error (RMSE)**: $0.54^\circ\text{C}$

## 4. Integration with Microgrid Dispatch
The 24-hour predicted ambient temperature vector directly drives the dynamic thermal load forecast ($1.8\text{ kW/}^\circ\text{C}$ sub-zero heating curve). This allows the OR-Tools MILP optimizer to pre-heat thermal storage and schedule battery/generator dispatch hours before sudden blizzard-driven temperature drops occur.
