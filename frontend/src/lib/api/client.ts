import {
  AIInsight,
  CriticalLoadItem,
  EnergyData,
  ForecastMetrics,
  Generator,
  HistoricalAnalyticsPoint,
  HourlyDispatchPoint,
  HourlyForecastPoint,
  OptimizationMetrics,
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
  async getStations(): Promise<Record<StationId, Station>> {
    return { ...STATIONS };
  },

  async getStation(stationId: StationId): Promise<Station> {
    return STATIONS[stationId] || STATIONS.maitri;
  },

  // Meteorology
  async getWeatherData(stationId: StationId): Promise<WeatherData> {
    return WEATHER_DATA[stationId] || WEATHER_DATA.maitri;
  },

  // Real-time Energy Telemetry
  async getEnergyData(stationId: StationId): Promise<EnergyData> {
    return ENERGY_DATA[stationId] || ENERGY_DATA.maitri;
  },

  // Genset Telemetry
  async getGenerators(stationId: StationId): Promise<Generator[]> {
    return GENERATORS[stationId] || GENERATORS.maitri;
  },

  // Critical Life-Support Loads
  async getCriticalLoads(stationId: StationId): Promise<CriticalLoadItem[]> {
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
    if (stationId) {
      return alertsState.filter((a) => a.stationId === stationId && !a.dismissed);
    }
    return alertsState.filter((a) => !a.dismissed);
  },

  async acknowledgeAlert(alertId: string): Promise<SystemAlert | null> {
    alertsState = alertsState.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a));
    return alertsState.find((a) => a.id === alertId) || null;
  },

  async dismissAlert(alertId: string): Promise<boolean> {
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
