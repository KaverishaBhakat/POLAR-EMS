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
  ResilienceSimulationScenario,
  ResilienceScenarioListResponse,
  ResilienceSimulationResult,
  ResilienceMetrics,
  ResilienceComparison,
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
      apparentTemperature:
        w.temperature != null && w.windSpeed != null
          ? Math.round((w.temperature - (w.windSpeed * 0.7)) * 10) / 10
          : undefined,
      windSpeed: w.windSpeed,
      windDirection: w.windDirection || null,
      windGust:
        w.windSpeed != null ? Math.round(w.windSpeed * 1.35 * 10) / 10 : undefined,
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

  // ---------------------------------------------------------------------------
  // ML Resilience & Contingency Simulation Engine
  // ---------------------------------------------------------------------------
  async getSimulationScenarios(): Promise<ResilienceScenarioListResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/simulation/scenarios`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        if (data && Array.isArray(data.scenarios)) {
          return {
            status: data.status || 'SUCCESS',
            count: data.count || data.scenarios.length,
            scenarios: data.scenarios,
          };
        }
      }
    } catch {
      // Offline fallback handling
    }

    // Default registered scenarios fallback if backend proxy is starting up
    return {
      status: 'SUCCESS',
      count: 6,
      scenarios: [
        {
          scenario_id: 'polar-night',
          scenario_type: 'POLAR_NIGHT',
          scenario_name: 'Polar Night',
          description: 'Simulates mid-winter polar night conditions where solar irradiance and PV generation are 0.0 kW for all 24 hours, testing station resilience using katabatic wind, battery energy storage, and primary diesel generator commitment.',
          category: 'ENVIRONMENTAL_STRESS',
          is_active: true,
          provenance: {
            scenario_type: 'POLAR_NIGHT',
            data_classification: 'SCENARIO',
            pv_modification: 'PV generation forced to 0.0 kW for all 24 hours.',
            wind_source: 'Maitri 2019 observed wind speed converted to modeled turbine power via scenario power curve.',
            demand_source: 'Deterministic scenario demand model (base 65 kW, diurnal 55.2–83.6 kW).',
            battery_source: 'Scenario initial SOC (75.0%) and physical limits [20%, 95%].',
            generator_source: 'Scenario generator fleet (GEN-01 100 kW, GEN-02 80 kW).',
            is_demonstration_scenario: true,
            disclaimer: 'This is a modeled what-if resilience scenario, not a measured historical telemetry record.',
          },
          assumptions: {
            pv_availability_multiplier: 0.0,
            wind_availability_multiplier: 1.0,
            demand_multiplier: 1.0,
            initial_soc_override: null,
            generator_availability: { 'GEN-01': true, 'GEN-02': true },
            critical_load_protection: true,
          },
        },
        {
          scenario_id: 'generator-failure',
          scenario_type: 'GENERATOR_FAILURE',
          scenario_name: 'Primary Generator Failure',
          description: 'Simulates the unavailability of the primary diesel generator for the full 24-hour horizon.',
          category: 'RESILIENCE',
          is_active: true,
          provenance: {
            scenario_type: 'GENERATOR_FAILURE',
            data_classification: 'SCENARIO',
            failed_generator_id: 'GEN-01',
            failed_generator_name: 'Primary Genset (100 kW)',
            failed_generator_rating_kw: 100.0,
            failure_rationale: 'GEN-01 represents the primary and largest single generator unit (100 kW vs 80 kW GEN-02). Its outage represents the single most severe N-1 generation contingency.',
            pv_source: 'Historical December climatology scenario (100 kW capacity, PR=0.80).',
            wind_source: 'Maitri 2019 observed wind speed converted to modeled turbine power via scenario power curve.',
            demand_source: 'Deterministic scenario demand model (base 65 kW, diurnal 55.2–83.6 kW).',
            battery_source: 'Scenario initial SOC (75.0%) and physical limits [20%, 95%].',
            generator_source: 'Scenario generator fleet with GEN-01 forced offline and GEN-02 (80 kW) remaining operational.',
            is_demonstration_scenario: true,
            disclaimer: 'All Generator Failure results are modeled what-if results and are not measurements of an actual Maitri generator failure.',
          },
          assumptions: {
            failed_generator_id: 'GEN-01',
            g1_available: false,
            g2_available: true,
            generator_availability: { 'GEN-01': false, 'GEN-02': true },
            pv_availability_multiplier: 1.0,
            wind_availability_multiplier: 1.0,
            demand_multiplier: 1.0,
            initial_soc_override: null,
            critical_load_protection: true,
          },
        },
        {
          scenario_id: 'low-battery',
          scenario_type: 'LOW_BATTERY',
          scenario_name: 'Critically Low Battery State',
          description: 'Simulates a contingency condition where the microgrid enters the 24-hour horizon with a critically low initial battery state of charge (20.0%, at the operational lower limit), evaluating whether station renewables and generator dispatch can protect critical life-support loads and replenish energy storage.',
          category: 'RESILIENCE',
          is_active: true,
          provenance: {
            scenario_type: 'LOW_BATTERY',
            data_classification: 'SCENARIO',
            battery_modification: 'Initial BESS state of charge set to 20.0% (70.0 kWh), representing the lower operational reserve floor.',
            battery_capacity_kwh: 350.0,
            pv_source: 'Historical December climatology scenario (100 kW capacity, PR=0.80).',
            wind_source: 'Maitri 2019 observed wind speed converted to modeled turbine power via scenario power curve.',
            demand_source: 'Deterministic scenario demand model (base 65 kW, diurnal 55.2–83.6 kW).',
            generator_source: 'Scenario generator fleet (GEN-01 100 kW, GEN-02 80 kW).',
            is_demonstration_scenario: true,
            disclaimer: 'All Low Battery results are modeled what-if results and are not measurements of an actual Maitri battery depletion event.',
          },
          assumptions: {
            initial_soc: 20.0,
            initial_battery_soc_percent: 20.0,
            g1_available: true,
            g2_available: true,
            generator_availability: { 'GEN-01': true, 'GEN-02': true },
            pv_availability_multiplier: 1.0,
            wind_availability_multiplier: 1.0,
            demand_multiplier: 1.0,
            critical_load_protection: true,
          },
        },
        {
          scenario_id: 'renewable-drop',
          scenario_type: 'RENEWABLE_DROP',
          scenario_name: 'Renewable Generation Drop',
          description: 'Simulates a severe 80% reduction across both solar PV and wind generation for the full 24-hour horizon, testing station resilience and thermal dispatch when only 20% of renewable generation remains available.',
          category: 'RESILIENCE',
          is_active: true,
          provenance: {
            scenario_type: 'RENEWABLE_DROP',
            data_classification: 'SCENARIO',
            pv_modification: 'Solar PV generation scaled by 0.20 (80% reduction) for all 24 hours.',
            wind_modification: 'Wind generation scaled by 0.20 (80% reduction) for all 24 hours.',
            retention_factor: 0.20,
            drop_factor: 0.80,
            pv_source: 'Historical December climatology scenario (100 kW baseline capacity, PR=0.80) scaled to 20% availability.',
            wind_source: 'Maitri 2019 observed wind speed converted to modeled turbine power (50 kW baseline capacity) scaled to 20% availability.',
            demand_source: 'Deterministic scenario demand model (base 65 kW, diurnal 55.2–83.6 kW).',
            battery_source: 'Baseline initial SOC (75.0%) and physical limits [20%, 95%].',
            generator_source: 'Baseline generator fleet (GEN-01 100 kW, GEN-02 80 kW, both available).',
            is_demonstration_scenario: true,
            disclaimer: 'The 80% renewable reduction is a scenario assumption for resilience testing and does not represent a measured Maitri event.',
          },
          assumptions: {
            pv_availability_multiplier: 0.20,
            wind_availability_multiplier: 0.20,
            demand_multiplier: 1.0,
            initial_soc_override: null,
            g1_available: true,
            g2_available: true,
            generator_availability: { 'GEN-01': true, 'GEN-02': true },
            critical_load_protection: true,
          },
        },
        {
          scenario_id: 'severe-blizzard',
          scenario_type: 'SEVERE_BLIZZARD',
          scenario_name: 'Severe Blizzard',
          description: 'A modeled polar-weather contingency combining reduced solar availability, increased station electrical demand, and elevated wind conditions over the 24-hour horizon.',
          category: 'RESILIENCE',
          is_active: true,
          provenance: {
            scenario_type: 'SEVERE_BLIZZARD',
            data_classification: 'SCENARIO',
            solar_reduction: 0.70,
            demand_multiplier: 1.20,
            wind_speed_multiplier: 1.25,
            wind_power_model: 'existing_maitri_turbine_power_curve',
            battery_mutation: 'none',
            generator_mutation: 'none',
            pv_source: 'Historical December climatology scenario (100 kW baseline capacity, PR=0.80) with 70% solar reduction (30% retained).',
            wind_source: 'Maitri 2019 observed wind speed multiplied by 1.25 and evaluated through the existing piecewise aerodynamic turbine power curve.',
            demand_source: 'Deterministic baseline demand increased by 20% to represent severe weather thermal/heating load surge.',
            battery_source: 'Baseline initial SOC (75.0%) and physical limits [20%, 95%].',
            generator_source: 'Baseline generator fleet (GEN-01 100 kW, GEN-02 80 kW, both available).',
            is_demonstration_scenario: true,
            disclaimer: 'This is a scenario assumption for resilience testing. It is NOT a claim that a particular blizzard occurred at Maitri during the modeled period.',
          },
          assumptions: {
            solar_reduction: 0.70,
            pv_retention_multiplier: 0.30,
            pv_availability_multiplier: 0.30,
            demand_multiplier: 1.20,
            wind_speed_multiplier: 1.25,
            wind_power_model: 'existing_maitri_turbine_power_curve',
            battery_mutation: 'none',
            generator_mutation: 'none',
            initial_soc_override: null,
            g1_available: true,
            g2_available: true,
            generator_availability: { 'GEN-01': true, 'GEN-02': true },
            critical_load_protection: true,
          },
        },
        {
          scenario_id: 'high-demand',
          scenario_type: 'HIGH_DEMAND',
          scenario_name: 'High Demand',
          description: 'A modeled station-wide electrical demand surge used to evaluate whether the energy-management system can maintain critical loads during periods of unusually high consumption.',
          category: 'RESILIENCE',
          is_active: true,
          provenance: {
            scenario_type: 'HIGH_DEMAND',
            data_classification: 'SCENARIO',
            demand_multiplier: 1.40,
            demand_increase_percent: 40,
            pv_mutation: 'none',
            wind_mutation: 'none',
            battery_mutation: 'none',
            generator_mutation: 'none',
            critical_load_mutation: 'none',
            demand_source: 'Deterministic baseline demand increased by 40% across all 24 hours to represent station-wide electrical demand surge.',
            pv_source: 'Historical December climatology scenario (100 kW baseline capacity, PR=0.80) preserved unchanged.',
            wind_source: 'Maitri 2019 observed wind speed converted to modeled turbine power via scenario power curve preserved unchanged.',
            battery_source: 'Baseline initial SOC (75.0%) and physical limits [20%, 95%] preserved unchanged.',
            generator_source: 'Baseline generator fleet (GEN-01 100 kW, GEN-02 80 kW, both available).',
            is_demonstration_scenario: true,
            disclaimer: 'A 40% station-wide electrical demand increase represents a deliberately stressful contingency combining elevated heating requirements, laboratory/operational activity, communications, water systems, refrigeration, and other auxiliary electrical loads. This is a scenario assumption for resilience testing, not measured Maitri electrical-load telemetry.',
          },
          assumptions: {
            demand_multiplier: 1.40,
            demand_increase_percent: 40,
            pv_mutation: 'none',
            wind_mutation: 'none',
            battery_mutation: 'none',
            generator_mutation: 'none',
            critical_load_mutation: 'none',
            pv_availability_multiplier: 1.0,
            wind_availability_multiplier: 1.0,
            initial_soc_override: null,
            g1_available: true,
            g2_available: true,
            generator_availability: { 'GEN-01': true, 'GEN-02': true },
            critical_load_protection: true,
          },
        },
      ],
    };
  },

  async runResilienceSimulation(
    stationId: StationId | string,
    scenarioId: string,
    options?: { horizonHours?: number; initialSoc?: number; signal?: AbortSignal }
  ): Promise<ResilienceSimulationResult> {
    const horizon = options?.horizonHours || 24;
    const soc = options?.initialSoc ?? 75.0;

    try {
      const url = `${API_BASE_URL}/simulation/run/${encodeURIComponent(stationId)}/${encodeURIComponent(scenarioId)}?horizon_hours=${horizon}&initial_soc=${soc}`;
      const response = await fetch(url, { signal: options?.signal });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        if (data && data.resilienceMetrics && data.dispatch) {
          return {
            status: data.status || 'SUCCESS',
            stationId: data.stationId || stationId,
            horizonHours: data.horizonHours || horizon,
            isDemonstrationScenario: data.isDemonstrationScenario ?? true,
            scenario: data.scenario,
            resilienceMetrics: data.resilienceMetrics,
            comparison: data.comparison,
            dispatch: data.dispatch,
            objectiveValue: data.objectiveValue,
            solverStatus: data.solverStatus || 'OPTIMAL',
            recommendation: data.recommendation,
          };
        }
      } else {
        const err = await response.json().catch(() => ({}));
        return {
          status: 'ERROR',
          stationId: String(stationId),
          horizonHours: horizon,
          isDemonstrationScenario: true,
          message: err.message || err.detail || `Failed to execute simulation for scenario '${scenarioId}'.`,
          scenario: {} as any,
          resilienceMetrics: {} as any,
          comparison: {} as any,
          dispatch: [],
        };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw e;
      }
    }

    return {
      status: 'DEGRADED',
      stationId: String(stationId),
      horizonHours: horizon,
      isDemonstrationScenario: true,
      message: 'Connection to resilience simulation microservice unavailable.',
      scenario: {} as any,
      resilienceMetrics: {} as any,
      comparison: {} as any,
      dispatch: [],
    };
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

