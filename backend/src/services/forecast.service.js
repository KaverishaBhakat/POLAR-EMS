/**
 * AI Forecasting Service Interface
 * 
 * Integrates directly with the Python ML microservice (running on port 8001)
 * for real-data weather (temperature) forecasting, load, and renewable forecasting.
 */
class ForecastService {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
  }

  /**
   * Get 24-hour ahead ambient temperature forecast from the real trained ML model.
   */
  async getWeatherForecast(stationId, horizonHours = 24) {
    try {
      const url = `${this.mlServiceUrl}/forecast/weather/${encodeURIComponent(stationId)}?horizon_hours=${horizonHours}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: 'SUCCESS',
          source: 'ML_MICROSERVICE',
          stationId: data.stationId,
          target: data.target,
          unit: data.unit,
          horizonHours: data.horizonHours,
          generatedAt: data.generatedAt,
          predictions: data.predictions,
          model: data.model,
        };
      } else {
        const err = await response.json().catch(() => ({}));
        return {
          status: 'ERROR',
          source: 'ML_MICROSERVICE',
          statusCode: response.status,
          message: err.detail || 'Failed to fetch forecast from ML service',
          stationId,
        };
      }
    } catch (e) {
      return {
        status: 'DEGRADED',
        source: 'FALLBACK',
        message: `ML microservice connection unavailable: ${e.message}`,
        targetService: `${this.mlServiceUrl}/forecast/weather`,
        stationId,
        horizonHours,
      };
    }
  }

  async getLoadForecast(stationId, horizonHours = 24) {
    return {
      status: 'NOT_IMPLEMENTED',
      engine: 'AI_FORECAST_PLACEHOLDER',
      message: 'AI forecasting service will be integrated via Python microservice in Phase 2.',
      targetService: `${this.mlServiceUrl}/forecast/energy`,
      stationId,
      horizonHours,
    };
  }

  async getRenewableForecast(stationId, horizonHours = 24) {
    return {
      status: 'NOT_IMPLEMENTED',
      engine: 'AI_FORECAST_PLACEHOLDER',
      message: 'AI solar and wind forecasting service will be integrated in Phase 2.',
      targetService: `${this.mlServiceUrl}/forecast/renewable`,
      stationId,
      horizonHours,
    };
  }
}

module.exports = new ForecastService();
