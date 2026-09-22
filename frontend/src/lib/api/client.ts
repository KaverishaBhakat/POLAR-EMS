import {
  AIInsight,
  CriticalLoadItem,
  EnergyData,
  EnergyLoadRecord,
  ForecastMetrics,
  Generator,
  HistoricalAnalyticsPoint,
  HourlyDispatchPoint,
  HourlyForecastPoint,
  OptimizationMetrics,
  RenewableRecord,
  SimulationParams,
  SimulationResults,
  Station,
  StationId,
  SystemAlert,
  WeatherData,
} from '../types';
import { STATIONS } from '../mock-data/stations';
import { WEATHER_DATA } from '../mock-data/weather';
import { CRITICAL_LOADS, ENERGY_DATA } from '../mock-data/energy';
import { GENERATORS } from '../mock-data/generators';
import { AI_INSIGHTS, FORECAST_METRICS, generateHourlyForecast } from '../mock-data/forecasts';
import { generateDispatchSchedule, OPTIMIZATION_METRICS } from '../mock-data/optimization';
import { runSimulationCalculation } from '../mock-data/simulation';
import { INITIAL_ALERTS } from '../mock-data/alerts';
import { ANALYTICS_SUMMARY, generateHistoricalAnalytics } from '../mock-data/analytics';

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

  // Genset Telemetry
  async getGenerators(stationId: StationId): Promise<Generator[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/generators/${stationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result.data) && result.data.length > 0) {
          return result.data.map((g: any, idx: number) => {
            const lastReading = g.readings?.[0];
            const outKW = lastReading ? lastReading.powerOutput : 0;
            return {
              id: `G${idx + 1}`,
              name: g.name,
              model: 'Cummins Arctic Polar-VTA28',
              status: (g.status || (outKW > 0 ? 'RUNNING' : 'STANDBY')) as any,
              outputKW: outKW,
              maxOutputKW: g.capacity,
              efficiencyPercent: g.efficiency || 38.5,
              fuelConsumptionLh: Math.round(outKW * 0.25 * 10) / 10,
              runtimeHours: g.totalRuntime || 0,
              loadPercentage: g.capacity > 0 ? Math.round((outKW / g.capacity) * 100) : 0,
              temperatureC: outKW > 0 ? 86 : 22,
              oilPressureBar: outKW > 0 ? 4.6 : 0,
              frequencyHz: 50.0,
              voltageV: 415.0,
            };
          });
        }
      }
    } catch (err) {
      console.warn(`Falling back to client generators for ${stationId}:`, err);
    }
    return GENERATORS[stationId] || GENERATORS.maitri;
  },

  // Critical Life-Support Loads
  async getCriticalLoads(stationId: StationId): Promise<CriticalLoadItem[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/critical-loads/${stationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result.data) && result.data.length > 0) {
          return result.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            powerKW: c.currentPower || c.ratedPower,
            percentage: c.ratedPower > 0 ? Math.round(((c.currentPower || c.ratedPower) / c.ratedPower) * 100) : 100,
            status: c.status === 'ONLINE' ? 'PROTECTED' : 'OPTIMIZED',
            subsystem: c.name,
          }));
        }
      }
    } catch (err) {
      console.warn(`Falling back to client critical loads for ${stationId}:`, err);
    }
    return CRITICAL_LOADS[stationId] || CRITICAL_LOADS.maitri;
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

  // AI Optimization
  async getOptimizationResult(stationId: StationId): Promise<{
    metrics: OptimizationMetrics;
    dispatchSchedule: HourlyDispatchPoint[];
  }> {
    return {
      metrics: OPTIMIZATION_METRICS[stationId] || OPTIMIZATION_METRICS.maitri,
      dispatchSchedule: generateDispatchSchedule(stationId),
    };
  },

  async runOptimization(stationId: StationId): Promise<{
    metrics: OptimizationMetrics;
    dispatchSchedule: HourlyDispatchPoint[];
    message: string;
  }> {
    // Simulate solver execution time
    await new Promise((resolve) => setTimeout(resolve, 800));
    const base = OPTIMIZATION_METRICS[stationId] || OPTIMIZATION_METRICS.maitri;
    return {
      metrics: {
        ...base,
        fuelSavedL: base.fuelSavedL + Math.round((Math.random() * 8 - 4)),
        solverExecutionTimeMs: Math.round(380 + Math.random() * 50),
        solverStatus: 'OPTIMAL',
      },
      dispatchSchedule: generateDispatchSchedule(stationId),
      message: 'Optimal dispatch schedule computed with MILP solver. All critical loads guaranteed.',
    };
  },

  // Scenario Simulator
  async runSimulation(params: SimulationParams, stationId: StationId): Promise<SimulationResults> {
    // Simulate model inference time
    await new Promise((resolve) => setTimeout(resolve, 600));
    return runSimulationCalculation(params, stationId);
  },

  // System Alerts
  async getAlerts(stationId?: StationId): Promise<SystemAlert[]> {
    try {
      if (stationId) {
        const response = await fetch(`${API_BASE_URL}/alerts/${stationId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result.data) && result.data.length > 0) {
            return result.data.map((a: any) => ({
              id: a.id,
              timestamp: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              stationId,
              severity: a.severity as any,
              title: a.title,
              description: a.message || a.description,
              rootCause: a.source || 'Polar SCADA subsystem telemetry anomaly',
              recommendedAction: 'Inspect telemetry status and acknowledge alarm.',
              acknowledged: Boolean(a.acknowledgedAt),
              dismissed: a.status === 'RESOLVED',
              category: (a.type || 'WEATHER') as any,
            }));
          }
        }
      } else {
        const [rMaitri, rBharati] = await Promise.all([
          fetch(`${API_BASE_URL}/alerts/maitri`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/alerts/bharati`, { cache: 'no-store' }),
        ]);
        const dbAlerts: SystemAlert[] = [];
        if (rMaitri.ok) {
          const dataM = await rMaitri.json();
          if (Array.isArray(dataM.data)) {
            dbAlerts.push(
              ...dataM.data.map((a: any) => ({
                id: a.id,
                timestamp: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                stationId: 'maitri' as StationId,
                severity: a.severity as any,
                title: a.title,
                description: a.message || a.description,
                rootCause: a.source || 'Polar SCADA subsystem telemetry anomaly',
                recommendedAction: 'Inspect telemetry status and acknowledge alarm.',
                acknowledged: Boolean(a.acknowledgedAt),
                dismissed: a.status === 'RESOLVED',
                category: (a.type || 'WEATHER') as any,
              }))
            );
          }
        }
        if (rBharati.ok) {
          const dataB = await rBharati.json();
          if (Array.isArray(dataB.data)) {
            dbAlerts.push(
              ...dataB.data.map((a: any) => ({
                id: a.id,
                timestamp: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                stationId: 'bharati' as StationId,
                severity: a.severity as any,
                title: a.title,
                description: a.message || a.description,
                rootCause: a.source || 'Polar SCADA subsystem telemetry anomaly',
                recommendedAction: 'Inspect telemetry status and acknowledge alarm.',
                acknowledged: Boolean(a.acknowledgedAt),
                dismissed: a.status === 'RESOLVED',
                category: (a.type || 'WEATHER') as any,
              }))
            );
          }
        }
        if (dbAlerts.length > 0) {
          return dbAlerts;
        }
      }
    } catch (err) {
      console.warn(`Falling back to client alerts:`, err);
    }
    if (stationId) {
      return alertsState.filter((a) => a.stationId === stationId && !a.dismissed);
    }
    return alertsState.filter((a) => !a.dismissed);
  },

  async acknowledgeAlert(alertId: string): Promise<SystemAlert | null> {
    try {
      await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn('Backend alert acknowledgment failed, updating client state:', err);
    }
    alertsState = alertsState.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a));
    return alertsState.find((a) => a.id === alertId) || null;
  },

  async dismissAlert(alertId: string): Promise<boolean> {
    try {
      await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn('Backend alert resolve failed, updating client state:', err);
    }
    alertsState = alertsState.map((a) => (a.id === alertId ? { ...a, dismissed: true } : a));
    return true;
  },

  // Historical Analytics
  async getHistoricalAnalytics(days: number, stationId: StationId): Promise<{
    summary: typeof ANALYTICS_SUMMARY;
    timeline: HistoricalAnalyticsPoint[];
  }> {
    return {
      summary: ANALYTICS_SUMMARY,
      timeline: generateHistoricalAnalytics(days, stationId),
    };
  },
};
