export type StationId = 'maitri' | 'bharati';

export interface Station {
  id: string;
  code?: string;
  name: string;
  hindiName?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  coordinates?: {
    lat: string;
    lng: string;
    latVal: number;
    lngVal: number;
  };
  elevation?: string;
  established?: number;
  type?: string;
  winterPopulation?: number;
  summerPopulation?: number;
  currentPersonnel?: number;
  status: 'OPERATIONAL' | 'STANDBY' | 'MAINTENANCE' | 'ALERT' | 'ONLINE' | 'OFFLINE' | string;
  description?: string | null;
  installedSolarKW?: number;
  installedWindKW?: number;
  batteryCapacityKWh?: number;
  generatorCapacityKVA?: number;
  generatorCount?: number;
  chpEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeatherData {
  id?: string;
  stationId: StationId | string;
  timestamp?: string | Date;
  temperature: number; // °C
  apparentTemperature?: number; // °C (derived wind chill)
  windSpeed: number; // m/s
  windDirection?: string | null;
  windGust?: number; // m/s (derived peak gust)
  humidity?: number | null; // %
  pressure: number; // hPa
  solarRadiation?: number | null; // W/m²
  visibility?: string; // km
  blizzardRisk?: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | string;
  condition?: string;
  uvIndex?: number;
  createdAt?: string | Date;
}

export interface EnergyLoadRecord {
  id: string;
  stationId: StationId | string;
  timestamp: string | Date;
  totalLoad: number; // kW
  heatingLoad: number; // kW
  waterLoad: number; // kW
  communicationLoad: number; // kW
  laboratoryLoad: number; // kW
  refrigerationLoad: number; // kW
  flexibleLoad: number; // kW
  createdAt?: string | Date;
}

export interface RenewableRecord {
  id: string;
  stationId: StationId | string;
  timestamp: string | Date;
  solarPower: number; // kW
  windPower: number; // kW
  totalRenewable: number; // kW
  createdAt?: string | Date;
}

export interface EnergyData {
  stationId: StationId;
  timestamp: string;
  currentLoadKW: number;
  previousHourLoadKW: number;
  loadTrendPercent: number;
  
  solarGenerationKW: number;
  windGenerationKW: number;
  totalRenewableKW: number;
  renewablePenetrationPercent: number;
  
  batterySocPercent: number;
  batteryCurrentKWh: number;
  batteryCapacityKWh: number;
  batteryFlowKW: number; // Positive = Charging, Negative = Discharging
  batteryStatus: 'CHARGING' | 'DISCHARGING' | 'IDLE' | 'STANDBY';
  batteryHealthPercent: number;
  
  fuelConsumptionRateLh: number;
  dailyFuelConsumptionL: number;
  baselineDailyFuelL: number;
  fuelSavingsPercent: number;
  fuelRemainingL: number;
  fuelReserveDays: number;
  
  criticalLoadKW: number;
  criticalLoadProtectedPercent: number;
  
  co2AvoidedDailyKg: number;
  co2AvoidedTotalTonnes: number;
}

export interface GeneratorReadingRecord {
  id: string;
  generatorId: string;
  timestamp: string | Date;
  powerOutput: number; // kW
  fuelConsumed: number; // L
  efficiency: number; // %
  runtime: number; // minutes
  createdAt?: string | Date;
}

export interface GeneratorRecord {
  id: string;
  stationId: string;
  name: string;
  capacity: number; // kW
  minimumOutput: number; // kW
  efficiency: number; // %
  fuelType: string;
  status: 'RUNNING' | 'STOPPED' | 'STANDBY' | 'MAINTENANCE' | 'FAULT' | string;
  fuelLevel: number; // %
  totalRuntime: number; // hours
  createdAt?: string | Date;
  updatedAt?: string | Date;
  readings?: GeneratorReadingRecord[];
}

export interface BatteryReadingRecord {
  id: string;
  batteryId: string;
  timestamp: string | Date;
  soc: number; // %
  chargePower: number; // kW
  dischargePower: number; // kW
  createdAt?: string | Date;
}

export interface BatteryRecord {
  id: string;
  stationId: string;
  name: string;
  capacity: number; // kWh
  currentSOC: number; // % (0 - 100)
  minimumSOC: number; // % (default 20)
  maximumSOC: number; // % (default 95)
  maxChargePower: number; // kW
  maxDischargePower: number; // kW
  status: 'IDLE' | 'CHARGING' | 'DISCHARGING' | 'ONLINE' | 'STANDBY' | 'MAINTENANCE' | 'FAULT' | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  readings?: BatteryReadingRecord[];
  station?: Station;
}


export interface Generator {
  id: string; // 'G1' | 'G2' | 'G3' | 'G4'
  name: string;
  model: string;
  status: 'RUNNING' | 'STANDBY' | 'OFFLINE' | 'MAINTENANCE';
  outputKW: number;
  maxOutputKW: number;
  efficiencyPercent: number;
  fuelConsumptionLh: number;
  runtimeHours: number;
  loadPercentage: number;
  temperatureC: number;
  oilPressureBar: number;
  frequencyHz: number;
  voltageV: number;
}

export type CriticalityLevel = 'CRITICAL' | 'IMPORTANT' | 'FLEXIBLE';

export interface CriticalLoadRecord {
  id: string;
  stationId: string;
  name: string;
  category: 'CRITICAL' | 'IMPORTANT' | 'FLEXIBLE';
  priority: number;
  ratedPower: number; // kW
  currentPower: number; // kW
  status: 'ONLINE' | 'SHED' | 'STANDBY' | 'OFFLINE' | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  station?: Station;
}

export interface CriticalLoadItem {
  id: string;
  name: string;
  category: CriticalityLevel;
  powerKW: number;
  percentage: number;
  status: 'PROTECTED' | 'OPTIMIZED' | 'SHED' | string;
  subsystem: string;
  priority?: number;
  ratedPower?: number;
  minTempRequirementC?: number;
}

export interface AIInsight {
  id: string;
  timestamp: string;
  stationId: StationId;
  title: string;
  description: string;
  confidence: number;
  recommendedAction: string;
  category: 'GENERATION' | 'STORAGE' | 'WEATHER' | 'EFFICIENCY' | 'SAFETY';
  impact: string;
  actionUrl?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export type SolarProvenanceSource = 'MEASURED' | 'CLIMATOLOGICAL_ESTIMATE' | 'UNAVAILABLE';

export interface HourlyForecastPoint {
  hour: string;
  time: string;
  timestamp?: string | Date;
  actualLoadKW?: number;
  predictedLoadKW: number;
  lowerConfidenceKW: number;
  upperConfidenceKW: number;
  solarForecastKW: number | null;
  solarSource?: SolarProvenanceSource;
  windForecastKW: number | null;
  totalRenewableKW: number | null;
  temperatureC: number;
  windSpeedMs: number;
  solarRadiationWm2: number;
}

export interface DashboardSummary {
  currentLoad: number;
  renewableGeneration: number;
  batterySOC: number;
  fuelLevel: number;
  generatorCount: number;
  activeAlerts: number;
  criticalLoadCount: number;
  totalCriticalPowerKW: number;
  renewablePercentage: number;
  energyBalance: {
    totalSupplyKW: number;
    totalLoadKW: number;
    netBalanceKW: number;
    netDeficitKW: number;
    netSurplusKW: number;
  };
  riskAssessment: {
    energyStress: boolean;
    criticalLoadRisk: boolean;
    stressMarginKW: number;
    criticalMarginKW: number;
  };
  hasTelemetryData: boolean;
  solarPowerKW?: number | null;
  solarSource?: SolarProvenanceSource;
  isTelemetryLive?: boolean;
  solarAvailable?: boolean;
}

export interface DashboardData {
  station: Station;
  weather: WeatherData | null;
  energy: EnergyLoadRecord | null;
  renewable: RenewableRecord | null;
  battery: any;
  generators: Generator[];
  criticalLoads: CriticalLoadItem[];
  alerts: AlertRecord[];
  points: HourlyForecastPoint[];
  solarPowerKW: number | null;
  solarSource: SolarProvenanceSource;
  isTelemetryLive: boolean;
  solarAvailable: boolean;
  summary: DashboardSummary;
}

export interface ForecastMetrics {
  maeKW: number;
  rmseKW: number;
  accuracyPercent: number;
  confidencePercent: number;
  modelName: string;
  lastUpdated: string;
}

export interface WeatherPredictionPoint {
  timestamp: string;
  predictedTemperature: number;
}

export interface WeatherForecastData {
  status: string;
  stationId: string;
  target?: string;
  unit?: string;
  horizonHours?: number;
  generatedAt?: string;
  predictions?: WeatherPredictionPoint[];
  model?: {
    name: string;
    mae?: number;
    rmse?: number;
    r2?: number;
  };
  message?: string;
  statusCode?: number;
  source?: string;
}

export interface ScenarioMetadata {
  scenario_type: string;
  station: string;
  pv_mode: string;
  pv_capacity_kw: number;
  performance_ratio: number;
  scenario_month?: string;
  source_description?: string;
}

export interface HourlyDispatchPoint {
  hour?: number;
  time: string;
  timestamp?: string;
  load_kW?: number;
  pv_available_kW?: number;
  pv_used_kW?: number;
  pv_curtailed_kW?: number;
  wind_available_kW?: number;
  wind_used_kW?: number;
  wind_curtailed_kW?: number;
  battery_charge_kW?: number;
  battery_discharge_kW?: number;
  battery_soc_percent?: number;
  generator_output_kW?: number;
  critical_load_kW?: number;
  critical_load_shed_kW?: number;
  // ML Service response direct fields
  solar?: number;
  wind?: number;
  demand?: number;
  generator1Power?: number;
  generator2Power?: number;
  totalGeneratorPower?: number;
  batteryCharge?: number;
  batteryDischarge?: number;
  batterySOC?: number;
  flexibleLoadShedding?: number;
  renewableCurtailment?: number;
  criticalLoadProtected?: boolean;

  // Legacy / backwards-compatible fields
  solarKW?: number;
  pvAvailableKW?: number;
  windKW?: number;
  batteryDischargeKW?: number;
  batteryChargeKW?: number;
  generator1KW?: number;
  generator2KW?: number;
  generator3KW?: number;
  totalLoadKW?: number;
  netDeficitKW?: number;
  flexibleLoadSheddingKW?: number;
  renewableCurtailmentKW?: number;
}

export interface OptimizationMetrics {
  baselineFuelL: number;
  optimizedFuelL: number;
  fuelSavedL: number;
  fuelSavedPercent: number;
  
  baselineRenewableUtilPercent: number;
  optimizedRenewableUtilPercent: number;
  
  baselineGeneratorRuntimeHours: number;
  optimizedGeneratorRuntimeHours: number;
  
  baselineCo2Kg: number;
  optimizedCo2Kg: number;
  co2AvoidedKg: number;
  
  criticalLoadReliabilityPercent: number;
  solverExecutionTimeMs: number;
  solverStatus: 'OPTIMAL' | 'FEASIBLE' | 'COMPUTING' | 'SUCCESS' | 'ERROR' | 'DEGRADED';

  // Extended PV and Dispatch Summary Fields
  totalPVAvailableKWh?: number;
  totalPVUsedKWh?: number;
  totalPVCurtailedKWh?: number;
  pvUtilizationPercent?: number;
  totalBatteryCharge?: number;
  totalBatteryDischarge?: number;
  totalGeneratorEnergy?: number;
  criticalLoadShedTotalKWh?: number;
  objectiveValue?: number;
}

export interface OptimizationResultData {
  status: 'SUCCESS' | 'ERROR' | 'DEGRADED';
  source?: string;
  solverEngine?: string;
  isDemonstrationScenario?: boolean;
  scenarioMetadata?: ScenarioMetadata | null;
  stationId?: string;
  horizonHours?: number;
  objectiveValue?: number;
  totalEstimatedFuel?: number;
  baselineFuel?: number;
  fuelSavedLiters?: number;
  fuelSavedPercent?: number;
  totalPVAvailableKWh?: number;
  totalPVUsedKWh?: number;
  totalPVCurtailedKWh?: number;
  pvUtilizationPercent?: number;
  totalRenewableGenerated?: number;
  totalRenewableUsed?: number;
  totalRenewableCurtailed?: number;
  renewableUtilizationPercent?: number;
  totalGeneratorEnergy?: number;
  generatorCommittedHours?: number;
  totalBatteryCharge?: number;
  totalBatteryDischarge?: number;
  minimumBatterySOC?: number;
  maximumBatterySOC?: number;
  criticalLoadReliabilityPercent?: number;
  criticalLoadShedTotalKWh?: number;
  metrics: OptimizationMetrics;
  dispatchSchedule: HourlyDispatchPoint[];
  recommendation?: string;
  rawResult?: any;
  message?: string;
}

export interface SimulationParams {
  temperatureC: number;
  windSpeedMs: number;
  solarAvailabilityPercent: number;
  stationOccupancyPercent: number;
  batteryInitialSocPercent: number;
  forecastErrorPercent: number;
  generatorsAvailable: {
    g1: boolean;
    g2: boolean;
    g3: boolean;
    g4: boolean;
  };
}

export interface SimulationResults {
  baseline: {
    fuelConsumptionL: number;
    renewableUtilPercent: number;
    batteryMinSocPercent: number;
    generatorRuntimeHours: number;
    criticalLoadCoveragePercent: number;
    co2EmissionsKg: number;
  };
  simulated: {
    fuelConsumptionL: number;
    renewableUtilPercent: number;
    batteryMinSocPercent: number;
    generatorRuntimeHours: number;
    criticalLoadCoveragePercent: number;
    co2EmissionsKg: number;
  };
  delta: {
    fuelSavedL: number;
    fuelSavedPercent: number;
    co2SavedKg: number;
  };
  energyStressDetected: boolean;
  stressLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  contingencyActions: string[];
  aiDecisionExplanation: string;
  timeline: {
    hour: string;
    loadDemandKW: number;
    renewableGenKW: number;
    generatorDispatchKW: number;
    batterySocPercent: number;
  }[];
}

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'AI_INSIGHT';

export interface AlertRecord {
  id: string;
  stationId: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'AI_INSIGHT' | string;
  title: string;
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  source: string;
  createdAt: string | Date;
  acknowledgedAt?: string | Date | null;
  station?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface SystemAlert {
  id: string;
  timestamp: string;
  stationId: StationId;
  severity: AlertSeverity;
  title: string;
  description: string;
  rootCause: string;
  recommendedAction: string;
  acknowledged: boolean;
  dismissed: boolean;
  category: 'GENERATOR' | 'BATTERY' | 'WEATHER' | 'RENEWABLE' | 'LOAD' | 'COMMUNICATION' | string;
  createdAt?: string | Date;
}

export interface HistoricalAnalyticsPoint {
  date: string;
  dateKey?: string;
  actualFuelL: number;
  baselineFuelL: number;
  fuelSavedL: number;
  renewablePenetrationPercent: number;
  avgGenEfficiencyPercent: number;
  co2AvoidedKg: number;
  peakLoadKW: number;
  avgLoadKW: number;
  minTempC: number | null;
}

export interface AnalyticsSummary {
  totalDataPoints: number;
  fuelSavingsPercent: number;
  dieselSavedLitres: number;
  actualFuelLitres: number;
  baselineFuelLitres: number;
  renewablePenetrationPercent: number;
  totalRenewableKWh: number;
  totalSolarKWh: number;
  totalWindKWh: number;
  avgGenEfficiencyPercent: number;
  totalGenRuntimeHours: number;
  criticalLoadReliabilityPercent: number;
  co2AvoidedTonnes: number;
  financialSavingsINR: number;
  batteryAvgSOC: number;
  averageLoadKW: number;
  peakLoadKW: number;
  minLoadKW: number;
}

export interface HistoricalAnalyticsResponse {
  station: {
    id: string;
    name: string;
    code: string;
  };
  range: {
    start: string | Date;
    end: string | Date;
  };
  hasData: boolean;
  summary: AnalyticsSummary;
  timeline: HistoricalAnalyticsPoint[];
}

// ---------------------------------------------------------------------------
// Resilience Simulation Interfaces
// ---------------------------------------------------------------------------

export interface ResilienceSimulationScenario {
  scenario_id: string;
  scenario_type: string;
  scenario_name: string;
  description: string;
  category: string;
  is_active: boolean;
  provenance: Record<string, any>;
  assumptions: Record<string, any>;
}

export interface ResilienceScenarioListResponse {
  status: 'SUCCESS' | 'ERROR' | 'DEGRADED';
  count: number;
  scenarios: ResilienceSimulationScenario[];
  message?: string;
}

export interface ResilienceMetricDelta {
  baseline?: number | null;
  scenario?: number | null;
  absolute_delta?: number | null;
  percent_delta?: number | null;
}

export interface ResilienceMetrics {
  scenario_name: string;
  scenario_id: string;
  scenario_type: string;
  data_classification: string;
  is_demonstration_scenario: boolean;
  resilience_status: 'PROTECTED' | 'AT_RISK' | string;
  critical_load_status: 'PROTECTED' | 'AT_RISK' | string;
  failed_generator_identifier: string | null;
  failed_generator_energy_kwh: number;
  remaining_generator_energy_kwh: number;
  remaining_generator_runtime_hours: number;
  total_demand_kwh: number;
  total_renewable_available_kwh: number;
  total_renewable_used_kwh: number;
  total_pv_available_kwh: number;
  total_wind_available_kwh: number;
  total_generator_energy_kwh: number;
  total_battery_charge_kwh: number;
  total_battery_discharge_kwh: number;
  initial_battery_soc_percent: number;
  minimum_battery_soc_percent: number;
  maximum_battery_soc_percent: number;
  generator_runtime_hours: number;
  estimated_fuel_liters: number;
  total_critical_load_shed_kwh: number;
  critical_load_reliability_percent: number;
  renewable_utilization_percent: number;
  baseline_average_wind_speed_ms?: number;
  scenario_average_wind_speed_ms?: number;
  baseline_maximum_wind_speed_ms?: number;
  scenario_maximum_wind_speed_ms?: number;
  baseline_hours_above_cut_out?: number;
  scenario_hours_above_cut_out?: number;
  baseline_hours_zero_wind_generation?: number;
  scenario_hours_zero_wind_generation?: number;
}

export interface ResilienceComparison {
  total_demand_kwh: ResilienceMetricDelta;
  fuel_consumption_liters: ResilienceMetricDelta;
  generator_energy_kwh: ResilienceMetricDelta;
  failed_generator_energy_kwh?: ResilienceMetricDelta;
  remaining_generator_energy_kwh?: ResilienceMetricDelta;
  generator_runtime_hours: ResilienceMetricDelta;
  initial_battery_soc_percent: ResilienceMetricDelta;
  battery_discharge_kwh: ResilienceMetricDelta;
  battery_charge_kwh: ResilienceMetricDelta;
  minimum_battery_soc_percent: ResilienceMetricDelta;
  maximum_battery_soc_percent: ResilienceMetricDelta;
  pv_available_kwh: ResilienceMetricDelta;
  wind_available_kwh: ResilienceMetricDelta;
  total_renewable_energy_kwh: ResilienceMetricDelta;
  renewable_utilization_percent: ResilienceMetricDelta;
  average_wind_speed_ms?: ResilienceMetricDelta;
  maximum_wind_speed_ms?: ResilienceMetricDelta;
  hours_above_cut_out?: ResilienceMetricDelta;
  hours_zero_wind_generation?: ResilienceMetricDelta;
  critical_load_shed_kwh: ResilienceMetricDelta;
  critical_load_reliability_percent: ResilienceMetricDelta;
  objective_value: ResilienceMetricDelta;
}

export interface ResilienceSimulationResult {
  status: 'SUCCESS' | 'ERROR' | 'DEGRADED';
  stationId: string;
  horizonHours: number;
  isDemonstrationScenario: boolean;
  scenario: ResilienceSimulationScenario;
  resilienceMetrics: ResilienceMetrics;
  comparison: ResilienceComparison;
  dispatch: HourlyDispatchPoint[];
  objectiveValue?: number;
  solverStatus?: string;
  recommendation?: string;
  message?: string;
}

// ---------------------------------------------------------
// Historical Solar Generation (Modeled from Climatology)
// ---------------------------------------------------------

export type SolarSourceType = 'MEASURED' | 'CLIMATOLOGICAL_ESTIMATE' | 'UNAVAILABLE';

export interface SolarGenerationHistoryRecord {
  id: string;
  stationId: string;
  timestamp: string;
  irradianceWm2: number | null;
  solarPowerKW: number | null;
  solarSource: 'CLIMATOLOGICAL_ESTIMATE' | 'UNAVAILABLE' | string;
  modelVersion?: string;
  pvCapacityKw?: number;
  performanceRatio?: number;
  sourceRadiationYear?: number | null;
  sourceRadiationMonth?: number;
  sourceRadiationHour?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SolarGenerationHistoryPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SolarGenerationHistoryResponse {
  station: {
    id: string;
    code: string;
    name: string;
  };
  records: SolarGenerationHistoryRecord[];
  pagination: SolarGenerationHistoryPagination;
}

export interface SolarGenerationHistorySummary {
  station: {
    id: string;
    code: string;
    name: string;
  };
  hasData: boolean;
  totalPoints: number;
  availablePoints: number;
  unavailablePoints: number;
  start: string | null;
  end: string | null;
  minSolarPowerKW: number | null;
  maxSolarPowerKW: number | null;
  avgSolarPowerKW: number | null;
  minIrradianceWm2: number | null;
  maxIrradianceWm2: number | null;
  avgIrradianceWm2: number | null;
  source: string;
  provenance: string;
  pvCapacityKw: number;
  performanceRatio: number;
}

// AI Operations Assistant Types
export interface AssistantEvidence {
  type: 'TELEMETRY' | 'KNOWLEDGE' | 'FORECAST' | 'OPTIMIZATION' | 'RESILIENCE' | 'ANALYTICS' | 'CLIMATOLOGY' | string;
  tool?: string;
  station?: string;
  data?: any;
  document?: string;
  chunkId?: string;
  title?: string;
  heading?: string;
  content?: string;
  provenance?: string;
  source?: string;
}

export interface AssistantResponse {
  success: boolean;
  answer: string;
  station?: {
    code: string;
    name: string;
  };
  intent?: string[];
  evidence?: AssistantEvidence[];
  provenance?: string[];
  toolsUsed?: string[];
  ragUsed?: boolean;
  conversationId?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  response?: AssistantResponse;
  timestamp: string;
  isLoading?: boolean;
  error?: string;
}

export interface AssistantQueryRequest {
  message: string;
  stationId?: string;
  conversationId?: string;
  recentMessages?: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
  }>;
}




