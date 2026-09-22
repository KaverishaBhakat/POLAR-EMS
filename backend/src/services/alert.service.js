const { prisma } = require('../config/database');
const stationService = require('./station.service');
const ApiError = require('../utils/ApiError');

class AlertService {
  /**
   * Get all alerts for a station (or all stations if stationId is ALL / omitted)
   */
  async getStationAlerts(stationId, { limit = 100, page = 1, status, severity } = {}) {
    const skip = (page - 1) * limit;
    const where = {};

    if (stationId && stationId !== 'ALL' && stationId !== 'all') {
      const station = await stationService.getStationById(stationId);
      where.stationId = station.id;
    }

    if (status && status !== 'ALL' && status !== 'all') {
      where.status = status;
    }

    if (severity && severity !== 'ALL' && severity !== 'all') {
      where.severity = severity;
    }

    const [total, records] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.findMany({
        where,
        include: {
          station: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: 'desc' },
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
   * Get only ACTIVE alerts for a station
   */
  async getActiveStationAlerts(stationId) {
    const where = { status: 'ACTIVE' };
    if (stationId && stationId !== 'ALL' && stationId !== 'all') {
      const station = await stationService.getStationById(stationId);
      where.stationId = station.id;
    }

    return await prisma.alert.findMany({
      where,
      include: {
        station: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create an alert
   */
  async createAlert(data) {
    const station = await stationService.getStationById(data.stationId);
    return await prisma.alert.create({
      data: {
        ...data,
        stationId: station.id,
      },
    });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(id) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      throw ApiError.notFound(`Alert not found with id: ${id}`, 'ALERT_NOT_FOUND');
    }

    return await prisma.alert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(id) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      throw ApiError.notFound(`Alert not found with id: ${id}`, 'ALERT_NOT_FOUND');
    }

    return await prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
      },
    });
  }
}

module.exports = new AlertService();
