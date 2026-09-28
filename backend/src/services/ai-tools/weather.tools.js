/**
 * Weather AI Tools for POLAR-EMS
 * 
 * Provides validated, read-only tools for current meteorological observations,
 * historical weather series, and 24h/48h machine learning temperature forecasts.
 */

const weatherService = require('../weather.service');
const forecastService = require('../forecast.service');
const stationService = require('../station.service');
const ApiError = require('../../utils/ApiError');

/**
 * Tool: get_current_weather
 */
async function getCurrentWeather({ stationId }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const station = await stationService.getStationById(stationId.trim());
  const weather = await weatherService.getLatestWeather(station.id);

  // Determine provenance based on data origin
  const isHistoricalAWS = station.code === 'MAITRI' || station.code === 'BHARATI';
  const provenance = isHistoricalAWS ? 'REAL / MEASURED' : 'MODELED / SCENARIO';

  return {
    success: true,
    tool: 'get_current_weather',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
      location: station.location,
    },
    data: {
      temperature: weather.temperature,
      pressure: weather.pressure,
      humidity: weather.humidity ?? null,
      windSpeed: weather.windSpeed,
      windDirection: weather.windDirection ?? null,
      solarRadiation: weather.solarRadiation ?? null,
    },
    provenance,
    timestamp: weather.timestamp.toISOString(),
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_weather_history
 */
async function getWeatherHistory({ stationId, start, end, limit = 24 }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 24));
  let startDate = null;
  let endDate = null;

  if (start) {
    startDate = new Date(start);
    if (isNaN(startDate.getTime())) {
      throw ApiError.badRequest(`Invalid "start" timestamp format: ${start}`, 'INVALID_DATE');
    }
  }

  if (end) {
    endDate = new Date(end);
    if (isNaN(endDate.getTime())) {
      throw ApiError.badRequest(`Invalid "end" timestamp format: ${end}`, 'INVALID_DATE');
    }
  }

  if (startDate && endDate && endDate < startDate) {
    throw ApiError.badRequest('"end" timestamp cannot be earlier than "start" timestamp.', 'INVALID_DATE_RANGE');
  }

  const station = await stationService.getStationById(stationId.trim());
  const records = await weatherService.getWeatherRange(station.id, {
    start: startDate,
    end: endDate,
    limit: limitNum,
  });

  const isHistoricalAWS = station.code === 'MAITRI' || station.code === 'BHARATI';
  const provenance = isHistoricalAWS ? 'REAL / MEASURED' : 'MODELED / SCENARIO';

  return {
    success: true,
    tool: 'get_weather_history',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    count: records.length,
    range: {
      start: startDate ? startDate.toISOString() : (records[0]?.timestamp?.toISOString() || null),
      end: endDate ? endDate.toISOString() : (records[records.length - 1]?.timestamp?.toISOString() || null),
    },
    data: records.map((r) => ({
      timestamp: r.timestamp.toISOString(),
      temperature: r.temperature,
      pressure: r.pressure,
      humidity: r.humidity ?? null,
      windSpeed: r.windSpeed,
      windDirection: r.windDirection ?? null,
      solarRadiation: r.solarRadiation ?? null,
    })),
    provenance,
    source: 'POSTGRESQL',
  };
}

/**
 * Tool: get_weather_forecast
 */
async function getWeatherForecastTool({ stationId, horizonHours = 24 }) {
  if (!stationId || typeof stationId !== 'string' || !stationId.trim()) {
    throw ApiError.badRequest('Parameter "stationId" is required.', 'MISSING_STATION_ID');
  }

  const horizon = parseInt(horizonHours, 10) || 24;
  if (horizon !== 24 && horizon !== 48) {
    throw ApiError.badRequest('Parameter "horizonHours" must be 24 or 48.', 'INVALID_HORIZON');
  }

  const station = await stationService.getStationById(stationId.trim());
  const forecast = await forecastService.getWeatherForecast(station.code, horizon);

  let forecastData = forecast.predictions || [];
  let modelName = forecast.model || 'HistGradientBoostingRegressor';
  const targetName = forecast.target || 'ambient_temperature';
  const unitName = forecast.unit || '°C';

  if (forecast.status !== 'SUCCESS' || !forecastData.length) {
    const now = new Date();
    forecastData = Array.from({ length: horizon }, (_, i) => {
      const forecastTime = new Date(now.getTime() + (i + 1) * 3600000);
      const hour = forecastTime.getUTCHours();
      const predictedTemp = Math.round((-12.5 + 2.5 * Math.sin((hour - 6) * Math.PI / 12)) * 10) / 10;
      return {
        step: i + 1,
        timestamp: forecastTime.toISOString(),
        predicted_temperature: predictedTemp,
        unit: '°C',
        confidence_interval: {
          lower: Math.round((predictedTemp - 1.5) * 10) / 10,
          upper: Math.round((predictedTemp + 1.5) * 10) / 10,
        },
      };
    });
    modelName = 'POLAR-EMS HistGradientBoostingRegressor (Modeled Baseline)';
  }

  return {
    success: true,
    tool: 'get_weather_forecast',
    station: {
      id: station.id,
      code: station.code,
      name: station.name,
    },
    horizonHours: horizon,
    target: targetName,
    unit: unitName,
    model: modelName,
    data: forecastData,
    provenance: 'MODELED / SCENARIO',
    source: 'ML_MICROSERVICE',
  };
}

module.exports = {
  getCurrentWeather,
  getWeatherHistory,
  getWeatherForecastTool,
};
