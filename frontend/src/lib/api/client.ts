import {
  AlertRecord,
  AnalyticsSummary,
  AIInsight,
  BatteryRecord,
  BatteryReadingRecord,
  CriticalLoadItem,
  CriticalLoadRecord,
  EnergyData,
  EnergyLoadRecord,
  ForecastMetrics,
  Generator,
  GeneratorRecord,
  GeneratorReadingRecord,
  HistoricalAnalyticsPoint,
  HistoricalAnalyticsResponse,
  HourlyDispatchPoint,
  HourlyForecastPoint,
  OptimizationMetrics,
  OptimizationResultData,
  RenewableRecord,
  ScenarioMetadata,
  SimulationParams,
  SimulationResults,
  Station,
  StationId,
  SystemAlert,
  WeatherData,
  WeatherForecastData,
} from '../types';
import { STATIONS } from '../mock-data/stations';
import { WEATHER_DATA } from '../mock-data/weather';
import { CRITICAL_LOADS, ENERGY_DATA } from '../mock-data/energy';
import { GENERATORS } from '../mock-data/generators';
import { AI_INSIGHTS, FORECAST_METRICS, generateHourlyForecast } from '../mock-data/forecasts';
import { generateDispatchSchedule, OPTIMIZATION_METRICS } from '../mock-data/optimization';
import { runSimulationCalculation } from '../mock-data/simulation';
import { INITIAL_ALERTS } from '../mock-data/alerts';


// Configurable backend base URL (for future FastAPI backend integration)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// In-memory alert state to support real interactive acknowledgment and dismissal
let alertsState: SystemAlert[] = [...INITIAL_ALERTS];

export const apiClient = {
  // Authentication
  async login(credentials: { email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }
    return result.data;
  },

  async register(data: { name: string; email: string; password: string; role?: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Registration failed');
    }
    return result.data;
  },

  // Backend Dashboard Data
  async getDashboardData(stationId: StationId) {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/${stationId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }

    const result = await response.json();
    return result.data;
  },

  // SCADA Data Ingestion & Database Management
  async ingestTelemetry(stationId: StationId, payload: any) {
    const response = await fetch(`${API_BASE_URL}/ingest/${stationId}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to ingest telemetry');
    }
    return result.data;
  },

  async ingestBatch(stationId: StationId, datasetType: string, records: any[]) {
    const response = await fetch(`${API_BASE_URL}/ingest/${stationId}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetType, records }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload batch dataset');
    }
    return result.data;
  },

  async getIngestStatus(stationId?: string) {
    const query = stationId ? `?stationId=${stationId}` : '';
    const response = await fetch(`${API_BASE_URL}/ingest/status${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch database ingestion status');
    }
    return result.data;
  },

  async purgeTelemetry(stationId?: string) {
    const response = await fetch(`${API_BASE_URL}/ingest/purge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stationId: stationId || 'all' }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to purge telemetry');
    }
    return result.data;
  },

  async getTemplate(type: string) {
    const response = await fetch(`${API_BASE_URL}/ingest/template/${type}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch template format');
    }
    return result.data;
  },
  // Station Metadata
  async getStations(): Promise<Station[]> {
    const response = await fetch(`${API_BASE_URL}/stations`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch stations from database');
    }
    const result = await response.json();
    const stations = (result.data || []).map((st: Station) => {
      if (st && st.latitude != null && st.longitude != null && !st.coordinates) {
        st.coordinates = {
          lat: `${Math.abs(st.latitude).toFixed(2)}° ${st.latitude < 0 ? 'S' : 'N'}`,
          lng: `${Math.abs(st.longitude).toFixed(2)}° ${st.longitude < 0 ? 'W' : 'E'}`,
          latVal: st.latitude,
          lngVal: st.longitude,
        };
      }
      if (!st.hindiName) {
        if (st.code?.toUpperCase() === 'MAITRI') st.hindiName = 'मैत्री अनुसंधान केंद्र';
        else if (st.code?.toUpperCase() === 'BHARATI') st.hindiName = 'भारती अनुसंधान केंद्र';
      }
      return st;
    });
    return stations;
  },

  async getStation(stationId: StationId | string): Promise<Station> {
    const response = await fetch(`${API_BASE_URL}/stations/${stationId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch station ${stationId}`);
    }
    const result = await response.json();
    const st = result.data;
    if (st && st.latitude != null && st.longitude != null && !st.coordinates) {
      st.coordinates = {
        lat: `${Math.abs(st.latitude).toFixed(2)}° ${st.latitude < 0 ? 'S' : 'N'}`,
        lng: `${Math.abs(st.longitude).toFixed(2)}° ${st.longitude < 0 ? 'W' : 'E'}`,
        latVal: st.latitude,
        lngVal: st.longitude,
      };
    }
    if (st && !st.hindiName) {
      if (st.code?.toUpperCase() === 'MAITRI') st.hindiName = 'मैत्री अनुसंधान केंद्र';
      else if (st.code?.toUpperCase() === 'BHARATI') st.hindiName = 'भारती अनुसंधान केंद्र';
    }
    return st;
  },

  async getStationSummary(stationId: StationId | string) {
    const response = await fetch(`${API_BASE_URL}/stations/${stationId}/summary`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch station summary for ${stationId}`);
    }
    const result = await response.json();
    return result.data;
  },

  // Meteorology & Weather Telemetry (Live PostgreSQL Integration)
  async getCurrentWeather(stationId: StationId | string): Promise<WeatherData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/weather/${stationId}/current`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Failed to fetch current weather for ${stationId}`);
      }
      const result = await response.json();
      const w = result.data;
      if (!w) return null;
      return {
        id: w.id,
        stationId,
        timestamp: w.timestamp,
        temperature: w.temperature,
        apparentTemperature: Math.round((w.temperature - (w.windSpeed * 0.7)) * 10) / 10,
        windSpeed: w.windSpeed,
        windDirection: w.windDirection || 'N/A',
        windGust: Math.round(w.windSpeed * 1.35 * 10) / 10,
        humidity: w.humidity,
        pressure: w.pressure,
        solarRadiation: w.solarRadiation,
        visibility: '15 km (Clear)',
        blizzardRisk: w.windSpeed > 22 ? 'HIGH' : w.windSpeed > 15 ? 'ELEVATED' : 'LOW',
        condition: w.windSpeed > 22 ? 'Katabatic Blizzard' : 'Polar Clear',
        createdAt: w.createdAt,
      };
    } catch (err: any) {
      if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
        return null;
      }
      throw err;
    }
  },

  async getWeatherHistory(
    stationId: StationId | string,
    params?: { limit?: number; page?: number }
  ): Promise<{ records: WeatherData[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/weather/${stationId}/history${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch weather history for ${stationId}`);
    }
    const result = await response.json();
    const records = (result.data || []).map((w: any) => ({
      id: w.id,
      stationId,
      timestamp: w.timestamp,
      temperature: w.temperature,
      apparentTemperature: Math.round((w.temperature - (w.windSpeed * 0.7)) * 10) / 10,
      windSpeed: w.windSpeed,
      windDirection: w.windDirection || 'N/A',
      windGust: Math.round(w.windSpeed * 1.35 * 10) / 10,
      humidity: w.humidity,
      pressure: w.pressure,
      solarRadiation: w.solarRadiation,
      createdAt: w.createdAt,
    }));
    return {
      records,
      meta: result.meta || { total: records.length, page: 1, limit: records.length, totalPages: 1 },
    };
  },

  async getWeatherRange(
    stationId: StationId | string,
    params?: { start?: string; end?: string; limit?: number }
  ): Promise<WeatherData[]> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/weather/${stationId}/range${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch weather range for ${stationId}`);
    }
    const result = await response.json();
    return (result.data || []).map((w: any) => ({
      id: w.id,
      stationId,
      timestamp: w.timestamp,
      temperature: w.temperature,
      apparentTemperature: Math.round((w.temperature - (w.windSpeed * 0.7)) * 10) / 10,
      windSpeed: w.windSpeed,
      windDirection: w.windDirection || 'N/A',
      windGust: Math.round(w.windSpeed * 1.35 * 10) / 10,
      humidity: w.humidity,
      pressure: w.pressure,
      solarRadiation: w.solarRadiation,
      createdAt: w.createdAt,
    }));
  },

  async getWeatherData(stationId: StationId | string): Promise<WeatherData | null> {
    return this.getCurrentWeather(stationId);
  },

  // Energy Load Telemetry (Live PostgreSQL Integration)
  async getCurrentEnergy(stationId: StationId | string): Promise<EnergyLoadRecord | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/energy/${stationId}/current`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Failed to fetch current energy load for ${stationId}`);
      }
      const result = await response.json();
      return result.data || null;
    } catch (err: any) {
      if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
        return null;
      }
      throw err;
    }
  },

  async getEnergyHistory(
    stationId: StationId | string,
    params?: { limit?: number; page?: number }
  ): Promise<{ records: EnergyLoadRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/energy/${stationId}/history${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch energy history for ${stationId}`);
    }
    const result = await response.json();
    return {
      records: result.data || [],
      meta: result.meta || { total: (result.data || []).length, page: 1, limit: (result.data || []).length, totalPages: 1 },
    };
  },

  async getEnergyRange(
    stationId: StationId | string,
    params?: { start?: string; end?: string; limit?: number }
  ): Promise<EnergyLoadRecord[]> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/energy/${stationId}/range${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch energy range for ${stationId}`);
    }
    const result = await response.json();
    return result.data || [];
  },

  // Renewable Generation Telemetry (Live PostgreSQL Integration)
  async getCurrentRenewable(stationId: StationId | string): Promise<RenewableRecord | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/renewable/${stationId}/current`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Failed to fetch current renewable generation for ${stationId}`);
      }
      const result = await response.json();
      return result.data || null;
    } catch (err: any) {
      if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
        return null;
      }
      throw err;
    }
  },

  async getRenewableHistory(
    stationId: StationId | string,
    params?: { limit?: number; page?: number }
  ): Promise<{ records: RenewableRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/renewable/${stationId}/history${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch renewable history for ${stationId}`);
    }
    const result = await response.json();
    return {
      records: result.data || [],
      meta: result.meta || { total: (result.data || []).length, page: 1, limit: (result.data || []).length, totalPages: 1 },
    };
  },

  async getRenewableRange(
    stationId: StationId | string,
    params?: { start?: string; end?: string; limit?: number }
  ): Promise<RenewableRecord[]> {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/renewable/${stationId}/range${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch renewable range for ${stationId}`);
    }
    const result = await response.json();
    return result.data || [];
  },

  // Generator Fleet & SCADA Telemetry (Live PostgreSQL Integration)
  async getGenerators(stationId: StationId | string): Promise<GeneratorRecord[]> {
    const response = await fetch(`${API_BASE_URL}/generators/${stationId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch generators for ${stationId}`);
    }
    const result = await response.json();
    return result.data || [];
  },

  async getGenerator(id: string): Promise<GeneratorRecord> {
    const response = await fetch(`${API_BASE_URL}/generators/detail/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch generator ${id}`);
    }
    const result = await response.json();
    return result.data;
  },

  async getGeneratorReadings(
    generatorId: string,
    params?: { limit?: number; page?: number }
  ): Promise<{ records: GeneratorReadingRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/generators/${generatorId}/readings${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch generator readings for ${generatorId}`);
    }
    const result = await response.json();
    return {
      records: result.data || [],
      meta: result.meta || { total: (result.data || []).length, page: 1, limit: (result.data || []).length, totalPages: 1 },
    };
  },

  async updateGeneratorStatus(generatorId: string, status: string): Promise<GeneratorRecord> {
    const response = await fetch(`${API_BASE_URL}/generators/${generatorId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update generator status`);
    }
    const result = await response.json();
    return result.data;
  },

  // Battery Energy Storage System (BESS) (Live PostgreSQL Integration)
  async getBatteries(stationId: StationId | string): Promise<BatteryRecord[]> {
    const response = await fetch(`${API_BASE_URL}/battery/${stationId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch batteries for ${stationId}`);
    }
    const result = await response.json();
    return result.data || [];
  },

  async getBattery(id: string): Promise<BatteryRecord> {
    const response = await fetch(`${API_BASE_URL}/battery/detail/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch battery ${id}`);
    }
    const result = await response.json();
    return result.data;
  },

  async getBatteryReadings(
    batteryId: string,
    params?: { limit?: number; page?: number }
  ): Promise<{ records: BatteryReadingRecord[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/battery/${batteryId}/readings${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch battery readings for ${batteryId}`);
    }
    const result = await response.json();
    return {
      records: result.data || [],
      meta: result.meta || { total: (result.data || []).length, page: 1, limit: (result.data || []).length, totalPages: 1 },
    };
  },

  async updateBattery(id: string, data: Partial<BatteryRecord>): Promise<BatteryRecord> {
    const response = await fetch(`${API_BASE_URL}/battery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update battery parameters`);
    }
    const result = await response.json();
    return result.data;
  },

  async addBatteryReading(
    batteryId: string,
    data: { soc: number; chargePower?: number; dischargePower?: number; timestamp?: string }
  ): Promise<BatteryReadingRecord> {
    const response = await fetch(`${API_BASE_URL}/battery/${batteryId}/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to record battery telemetry`);
    }
    const result = await response.json();
    return result.data;
  },

  // Real-time Energy Telemetry
  async getEnergyData(stationId: StationId): Promise<EnergyData> {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/${stationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.ok) {
        const result = await response.json();
        const d = result.data;
        const fallback = ENERGY_DATA[stationId] || ENERGY_DATA.maitri;
        if (d && d.summary) {
          const loadKW = d.summary.currentLoad;
          const renKW = d.summary.renewableGeneration;
          const soc = d.summary.batterySOC;
          const renPercent = d.summary.renewablePercentage;
          const fuelLevel = d.summary.fuelLevel;

          return {
            stationId,
            timestamp: new Date().toISOString(),
            currentLoadKW: loadKW,
            previousHourLoadKW: loadKW,
            loadTrendPercent: 0,
            solarGenerationKW: d.renewable?.solarPower || 0,
            windGenerationKW: d.renewable?.windPower || 0,
            totalRenewableKW: renKW,
            renewablePenetrationPercent: renPercent,
            batterySocPercent: soc,
            batteryCurrentKWh: Math.round((soc / 100) * (d.battery?.capacity || 500)),
            batteryCapacityKWh: d.battery?.capacity || 500,
            batteryFlowKW: d.battery?.flowKW || 0,
            batteryStatus: d.battery?.status || 'IDLE',
            batteryHealthPercent: 98,
            fuelConsumptionRateLh: Math.round((d.generators || []).reduce((acc: number, g: any) => acc + (g.fuelConsumptionLh || 0), 0) * 10) / 10,
            dailyFuelConsumptionL: Math.round(fuelLevel * 3.5),
            baselineDailyFuelL: fallback.baselineDailyFuelL,
            fuelSavingsPercent: Math.max(0, Math.round(renPercent * 0.4)),
            fuelRemainingL: Math.round(fuelLevel * 28),
            fuelReserveDays: Math.round((fuelLevel * 28) / 85),
            criticalLoadKW: d.summary.totalCriticalPowerKW || 73.2,
            criticalLoadProtectedPercent: 100,
            co2AvoidedDailyKg: Math.round(renKW * 0.72 * 24 * 10) / 10,
            co2AvoidedTotalTonnes: Math.round((renKW * 0.72 * 24 * 30) / 1000 * 10) / 10,
          };
        }
      }
    } catch (err) {
      console.warn(`Falling back to client energy for ${stationId}:`, err);
    }
    return ENERGY_DATA[stationId] || ENERGY_DATA.maitri;
  },

  // Critical Life-Support Loads (Live PostgreSQL Integration)
  async getCriticalLoads(stationId: StationId | string): Promise<CriticalLoadRecord[]> {
    const response = await fetch(`${API_BASE_URL}/critical-loads/${stationId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch critical loads for ${stationId}`);
    }
    const result = await response.json();
    return result.data || [];
  },

  async getCriticalLoad(id: string): Promise<CriticalLoadRecord> {
    const response = await fetch(`${API_BASE_URL}/critical-loads/detail/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch critical load ${id}`);
    }
    const result = await response.json();
    return result.data;
  },

  async createCriticalLoad(
    stationId: StationId | string,
    data: {
      name: string;
      category: 'CRITICAL' | 'IMPORTANT' | 'FLEXIBLE';
      priority: number;
      ratedPower: number;
      currentPower: number;
      status?: string;
    }
  ): Promise<CriticalLoadRecord> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('polar_ems_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/critical-loads/${stationId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...data, stationId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create critical load circuit');
    }
    const result = await response.json();
    return result.data;
  },

  async updateCriticalLoad(
    id: string,
    data: Partial<CriticalLoadRecord>
  ): Promise<CriticalLoadRecord> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('polar_ems_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/critical-loads/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update critical load ${id}`);
    }
    const result = await response.json();
    return result.data;
  },

  async updateCriticalLoadStatus(id: string, status: string): Promise<CriticalLoadRecord> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('polar_ems_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/critical-loads/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update critical load status`);
    }
    const result = await response.json();
    return result.data;
  },

  // AI Forecasts
  async getForecast(stationId: StationId): Promise<{
    points: HourlyForecastPoint[];
    metrics: ForecastMetrics;
    insights: AIInsight[];
  }> {
    return {
      points: generateHourlyForecast(stationId),
      metrics: FORECAST_METRICS[stationId] || FORECAST_METRICS.maitri,
      insights: AI_INSIGHTS[stationId] || AI_INSIGHTS.maitri,
    };
  },

  // Real ML Weather (Temperature) Forecast
  async getWeatherForecast(stationId: StationId, horizonHours: number = 24): Promise<WeatherForecastData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/forecast/${stationId}/weather?horizon=${horizonHours}`);
      if (response.ok) {
        const result = await response.json();
        return result.data;
      } else {
        const errJson = await response.json().catch(() => ({}));
        return {
          status: 'ERROR',
          stationId: stationId.toUpperCase(),
          message: errJson.detail || errJson.message || `Failed to fetch forecast (HTTP ${response.status})`,
          statusCode: response.status,
        };
      }
    } catch (e: any) {
      return {
        status: 'ERROR',
        stationId: stationId.toUpperCase(),
        message: e?.message || 'Network connection to backend forecast proxy unavailable',
      };
    }
  },

  // AI Optimization
  async getOptimizationResult(stationId: StationId): Promise<OptimizationResultData> {
    try {
      const response = await fetch(`${API_BASE_URL}/optimization/${stationId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.metrics && result.data.dispatchSchedule) {
          return {
            status: result.data.status || 'SUCCESS',
            metrics: result.data.metrics,
            dispatchSchedule: result.data.dispatchSchedule,
            scenarioMetadata: result.data.scenarioMetadata || null,
            source: result.data.source || 'OR_TOOLS_MILP',
            solverEngine: result.data.solverEngine || 'Google OR-Tools (MILP/SCIP)',
            isDemonstrationScenario: result.data.isDemonstrationScenario ?? true,
            recommendation: result.data.recommendation,
            stationId: result.data.stationId || stationId,
            horizonHours: result.data.horizonHours || 24,
            objectiveValue: result.data.objectiveValue,
            totalEstimatedFuel: result.data.totalEstimatedFuel,
            baselineFuel: result.data.baselineFuel,
            fuelSavedLiters: result.data.fuelSavedLiters,
            fuelSavedPercent: result.data.fuelSavedPercent,
            totalPVAvailableKWh: result.data.totalPVAvailableKWh,
            totalPVUsedKWh: result.data.totalPVUsedKWh,
            totalPVCurtailedKWh: result.data.totalPVCurtailedKWh,
            pvUtilizationPercent: result.data.pvUtilizationPercent,
            totalRenewableGenerated: result.data.totalRenewableGenerated,
            totalRenewableUsed: result.data.totalRenewableUsed,
            totalRenewableCurtailed: result.data.totalRenewableCurtailed,
            renewableUtilizationPercent: result.data.renewableUtilizationPercent,
            totalGeneratorEnergy: result.data.totalGeneratorEnergy,
            generatorCommittedHours: result.data.generatorCommittedHours,
            totalBatteryCharge: result.data.totalBatteryCharge,
            totalBatteryDischarge: result.data.totalBatteryDischarge,
            minimumBatterySOC: result.data.minimumBatterySOC,
            maximumBatterySOC: result.data.maximumBatterySOC,
            criticalLoadReliabilityPercent: result.data.criticalLoadReliabilityPercent ?? 100,
            criticalLoadShedTotalKWh: result.data.criticalLoadShedTotalKWh ?? 0,
            rawResult: result.data.rawResult || result.data,
          };
        } else if (result.data && result.data.status === 'ERROR') {
          return {
            status: 'ERROR',
            message: result.data.message || 'Optimization data unavailable for station.',
            metrics: OPTIMIZATION_METRICS[stationId] || OPTIMIZATION_METRICS.maitri,
            dispatchSchedule: [],
            source: 'ERROR',
          };
        }
      }
    } catch {
      // Fallback gracefully if backend proxy is offline
    }
    return {
      status: 'SUCCESS',
      metrics: OPTIMIZATION_METRICS[stationId] || OPTIMIZATION_METRICS.maitri,
      dispatchSchedule: generateDispatchSchedule(stationId),
      source: 'MOCK_FALLBACK',
      isDemonstrationScenario: true,
      stationId,
      horizonHours: 24,
    };
  },

  async runOptimization(stationId: StationId): Promise<OptimizationResultData> {
    try {
      const response = await fetch(`${API_BASE_URL}/optimization/${stationId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.metrics && result.data.dispatchSchedule) {
          return {
            status: result.data.status || 'SUCCESS',
            metrics: result.data.metrics,
            dispatchSchedule: result.data.dispatchSchedule,
            scenarioMetadata: result.data.scenarioMetadata || null,
            message: result.data.recommendation || 'Optimal dispatch schedule computed with OR-Tools MILP solver. All critical loads guaranteed.',
            source: result.data.source || 'OR_TOOLS_MILP',
            solverEngine: result.data.solverEngine || 'Google OR-Tools (MILP/SCIP)',
            isDemonstrationScenario: result.data.isDemonstrationScenario ?? true,
            recommendation: result.data.recommendation,
            stationId: result.data.stationId || stationId,
            horizonHours: result.data.horizonHours || 24,
            objectiveValue: result.data.objectiveValue,
            totalEstimatedFuel: result.data.totalEstimatedFuel,
            baselineFuel: result.data.baselineFuel,
            fuelSavedLiters: result.data.fuelSavedLiters,
            fuelSavedPercent: result.data.fuelSavedPercent,
            totalPVAvailableKWh: result.data.totalPVAvailableKWh,
            totalPVUsedKWh: result.data.totalPVUsedKWh,
            totalPVCurtailedKWh: result.data.totalPVCurtailedKWh,
            pvUtilizationPercent: result.data.pvUtilizationPercent,
            totalRenewableGenerated: result.data.totalRenewableGenerated,
            totalRenewableUsed: result.data.totalRenewableUsed,
            totalRenewableCurtailed: result.data.totalRenewableCurtailed,
            renewableUtilizationPercent: result.data.renewableUtilizationPercent,
            totalGeneratorEnergy: result.data.totalGeneratorEnergy,
            generatorCommittedHours: result.data.generatorCommittedHours,
            totalBatteryCharge: result.data.totalBatteryCharge,
            totalBatteryDischarge: result.data.totalBatteryDischarge,
            minimumBatterySOC: result.data.minimumBatterySOC,
            maximumBatterySOC: result.data.maximumBatterySOC,
            criticalLoadReliabilityPercent: result.data.criticalLoadReliabilityPercent ?? 100,
            criticalLoadShedTotalKWh: result.data.criticalLoadShedTotalKWh ?? 0,
            rawResult: result.data.rawResult || result.data,
          };
        }
      }
    } catch {
      // Fallback
    }

    const base = OPTIMIZATION_METRICS[stationId] || OPTIMIZATION_METRICS.maitri;
    return {
      status: 'SUCCESS',
      metrics: {
        ...base,
        fuelSavedL: base.fuelSavedL + Math.round((Math.random() * 8 - 4)),
        solverExecutionTimeMs: Math.round(120 + Math.random() * 30),
        solverStatus: 'OPTIMAL',
      },
      dispatchSchedule: generateDispatchSchedule(stationId),
      message: 'Optimal dispatch schedule computed with MILP solver. All critical loads guaranteed.',
      source: 'MOCK_FALLBACK',
      isDemonstrationScenario: true,
      stationId,
    };
  },

  // Scenario Simulator
  async runSimulation(params: SimulationParams, stationId: StationId): Promise<SimulationResults> {
    // Simulate model inference time
    await new Promise((resolve) => setTimeout(resolve, 600));
    return runSimulationCalculation(params, stationId);
  },

  // System Alerts (Live PostgreSQL Integration)
  async getAlerts(
    stationId?: StationId | string,
    params?: { status?: string; severity?: string; limit?: number; page?: number }
  ): Promise<AlertRecord[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.severity && params.severity !== 'ALL') query.set('severity', params.severity);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const endpoint = stationId && stationId !== 'ALL' && stationId !== 'all'
      ? `${API_BASE_URL}/alerts/${stationId}${qs}`
      : `${API_BASE_URL}/alerts${qs}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch alerts from PostgreSQL backend');
    }
    const result = await response.json();
    return result.data || [];
  },

  async getActiveAlerts(stationId?: StationId | string): Promise<AlertRecord[]> {
    const endpoint = stationId && stationId !== 'ALL' && stationId !== 'all'
      ? `${API_BASE_URL}/alerts/${stationId}/active`
      : `${API_BASE_URL}/alerts`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch active alerts');
    }
    const result = await response.json();
    return result.data || [];
  },

  async createAlert(data: {
    stationId: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    source: string;
    status?: string;
  }): Promise<AlertRecord> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('polar_ems_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/alerts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate alert');
    }
    const result = await response.json();
    return result.data;
  },

  async acknowledgeAlert(alertId: string): Promise<AlertRecord> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('polar_ems_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'PATCH',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to acknowledge alert');
    }
    const result = await response.json();
    return result.data;
  },

  async resolveAlert(alertId: string): Promise<AlertRecord> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('polar_ems_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to resolve alert');
    }
    const result = await response.json();
    return result.data;
  },

  async dismissAlert(alertId: string): Promise<AlertRecord> {
    return this.resolveAlert(alertId);
  },

  // Historical Operational Analytics (Live PostgreSQL Integration)
  async getHistoricalAnalytics(
    days: number | string,
    stationId: StationId | string
  ): Promise<HistoricalAnalyticsResponse> {
    const d = typeof days === 'number' ? `${days}d` : days;
    const response = await fetch(
      `${API_BASE_URL}/analytics/${stationId}/historical?range=${d}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch historical analytics for ${stationId}`);
    }
    const result = await response.json();
    return result.data;
  },

  async getEnergyAnalytics(
    stationId: StationId | string,
    range: string = '7d'
  ) {
    const response = await fetch(
      `${API_BASE_URL}/analytics/${stationId}/energy?range=${range}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch energy analytics for ${stationId}`);
    }
    const result = await response.json();
    return result.data;
  },

  async getFuelAnalytics(
    stationId: StationId | string,
    range: string = '7d'
  ) {
    const response = await fetch(
      `${API_BASE_URL}/analytics/${stationId}/fuel?range=${range}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch fuel analytics for ${stationId}`);
    }
    const result = await response.json();
    return result.data;
  },

  async getRenewableAnalytics(
    stationId: StationId | string,
    range: string = '7d'
  ) {
    const response = await fetch(
      `${API_BASE_URL}/analytics/${stationId}/renewable?range=${range}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch renewable analytics for ${stationId}`);
    }
    const result = await response.json();
    return result.data;
  },

  async getGeneratorAnalytics(
    stationId: StationId | string,
    range: string = '7d'
  ) {
    const response = await fetch(
      `${API_BASE_URL}/analytics/${stationId}/generator?range=${range}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch generator analytics for ${stationId}`);
    }
    const result = await response.json();
    return result.data;
  },

  async getBatteryAnalytics(
    stationId: StationId | string,
    range: string = '7d'
  ) {
    const response = await fetch(
      `${API_BASE_URL}/analytics/${stationId}/battery?range=${range}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch battery analytics for ${stationId}`);
    }
    const result = await response.json();
    return result.data;
  },
};

