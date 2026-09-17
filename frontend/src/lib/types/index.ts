export type StationId = 'maitri' | 'bharati';

export interface Station {
  id: StationId;
  name: string;
  hindiName: string;
  location: string;
  coordinates: {
    lat: string;
    lng: string;
    latVal: number;
    lngVal: number;
  };
  elevation: string;
  established: number;
  type: string;
  winterPopulation: number;
  summerPopulation: number;
  currentPersonnel: number;
  status: 'OPERATIONAL' | 'STANDBY' | 'MAINTENANCE' | 'ALERT';
  installedSolarKW: number;
  installedWindKW: number;
  batteryCapacityKWh: number;
  generatorCapacityKVA: number;
  generatorCount: number;
  chpEnabled: boolean;
}

export interface WeatherData {
  stationId: StationId;
  temperature: number; // °C
  apparentTemperature: number; // °C (wind chill)
  windSpeed: number; // m/s
  windDirection: string;
  windGust: number; // m/s
  humidity: number; // %
  pressure: number; // hPa
  solarRadiation: number; // W/m²
  visibility: string; // km
  blizzardRisk: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  condition: string;
  uvIndex: number;
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

export interface CriticalLoadItem {
  id: string;
  name: string;
  category: CriticalityLevel;
  powerKW: number;
  percentage: number;
  status: 'PROTECTED' | 'OPTIMIZED' | 'SHED';
  subsystem: string;
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

export interface HourlyForecastPoint {
  hour: string;
  time: string;
  actualLoadKW?: number;
  predictedLoadKW: number;
  lowerConfidenceKW: number;
  upperConfidenceKW: number;
  solarForecastKW: number;
  windForecastKW: number;
  totalRenewableKW: number;
  temperatureC: number;
  windSpeedMs: number;
  solarRadiationWm2: number;
}

export interface ForecastMetrics {
  maeKW: number;
  rmseKW: number;
  accuracyPercent: number;
  confidencePercent: number;
  modelName: string;
  lastUpdated: string;
}

export interface HourlyDispatchPoint {
  time: string;
  solarKW: number;
  windKW: number;
  batteryDischargeKW: number;
  batteryChargeKW: number;
  generator1KW: number;
  generator2KW: number;
  generator3KW: number;
  totalLoadKW: number;
  netDeficitKW: number;
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
  solverStatus: 'OPTIMAL' | 'FEASIBLE' | 'COMPUTING';
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
  category: 'GENERATOR' | 'BATTERY' | 'WEATHER' | 'RENEWABLE' | 'LOAD' | 'COMMUNICATION';
}

export interface HistoricalAnalyticsPoint {
  date: string;
  actualFuelL: number;
  baselineFuelL: number;
  fuelSavedL: number;
  renewablePenetrationPercent: number;
  avgGenEfficiencyPercent: number;
  co2AvoidedKg: number;
  peakLoadKW: number;
  avgLoadKW: number;
  minTempC: number;
}
