/**
 * AI Forecasting Service Interface (Conceptual Architecture Placeholder)
 * 
 * Future Integration:
 * This service will interface via HTTP/gRPC with a Python microservice
 * running XGBoost / LightGBM models trained on NCPOR historical polar meteorology.
 * 
 * At this stage, AI/ML is explicitly NOT implemented.
 */
class ForecastService {
  async getLoadForecast(stationId, horizonHours = 24) {
    return {
      status: 'NOT_IMPLEMENTED',
      engine: 'AI_FORECAST_PLACEHOLDER',
      message: 'AI forecasting service will be integrated via Python/XGBoost microservice in Phase 2.',
      targetService: 'http://localhost:8001/api/v1/forecast',
      stationId,
      horizonHours,
    };
  }

  async getRenewableForecast(stationId, horizonHours = 24) {
    return {
      status: 'NOT_IMPLEMENTED',
      engine: 'AI_FORECAST_PLACEHOLDER',
      message: 'AI solar and wind forecasting service will be integrated in Phase 2.',
      targetService: 'http://localhost:8001/api/v1/forecast/renewable',
      stationId,
      horizonHours,
    };
  }
}

module.exports = new ForecastService();
