const { prisma } = require('../config/database');
const stationService = require('./station.service');
const ApiError = require('../utils/ApiError');

class WeatherService {
  /**
   * Get latest weather telemetry reading for a station
   */
  async getLatestWeather(stationId) {
    const station = await stationService.getStationById(stationId);
    const latest = await prisma.weatherData.findFirst({
      where: { stationId: station.id },
      orderBy: { timestamp: 'desc' },
    });

    if (!latest) {
      throw ApiError.notFound('No weather data found for this station', 'WEATHER_NOT_FOUND');
    }

    return latest;
  }

  /**
   * Get historical weather records with pagination
   */
  async getWeatherHistory(stationId, { limit = 50, page = 1 }) {
    const station = await stationService.getStationById(stationId);
    const skip = (page - 1) * limit;

    const [total, records] = await Promise.all([
      prisma.weatherData.count({ where: { stationId: station.id } }),
      prisma.weatherData.findMany({
        where: { stationId: station.id },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    return {
      records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get weather records for a specific date range
   */
  async getWeatherRange(stationId, { start, end, limit = 100 }) {
    const station = await stationService.getStationById(stationId);

    const where = { stationId: station.id };
    if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp.gte = new Date(start);
      if (end) where.timestamp.lte = new Date(end);
    }

    return await prisma.weatherData.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }

  /**
   * Insert a new weather data telemetry record
   */
  async recordWeather(data) {
    const station = await stationService.getStationById(data.stationId);

    return await prisma.weatherData.create({
      data: {
        ...data,
        stationId: station.id,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });
  }
}

module.exports = new WeatherService();
