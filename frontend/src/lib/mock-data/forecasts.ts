import { AIInsight, ForecastMetrics, HourlyForecastPoint, StationId } from '../types';

export const FORECAST_METRICS: Record<StationId, ForecastMetrics> = {
  maitri: {
    maeKW: 4.2,
    rmseKW: 5.8,
    accuracyPercent: 94.2,
    confidencePercent: 96.4,
    modelName: 'Transformer-LSTM Polar Ensemble v4.2',
    lastUpdated: '10 mins ago (Live Cycle)',
  },
  bharati: {
    maeKW: 3.8,
    rmseKW: 5.1,
    accuracyPercent: 95.8,
    confidencePercent: 97.1,
    modelName: 'Transformer-LSTM Polar Ensemble v4.2',
    lastUpdated: '8 mins ago (Live Cycle)',
  },
};

export const AI_INSIGHTS: Record<StationId, AIInsight[]> = {
  maitri: [
    {
      id: 'ins-1',
      timestamp: '10 mins ago',
      stationId: 'maitri',
      title: 'Antarctic Night Thermal Surge Warning',
      description: 'High heating demand is expected during the next 4 hours due to falling temperature (-28°C). POLAR-EMS recommends increasing battery reserve and operating Generator G2 near its optimal efficiency range (75-80%).',
      confidence: 96.4,
      recommendedAction: 'Pre-charge BESS to 85% and lock G2 into 105 kW optimal dispatch band.',
      category: 'GENERATION',
      impact: 'Avoids 45L diesel peak over-consumption and ensures 100% life-support reserve.',
      actionUrl: '/optimization',
      priority: 'HIGH',
    },
    {
      id: 'ins-2',
      timestamp: '25 mins ago',
      stationId: 'maitri',
      title: 'Katabatic Wind Energy Surge Opportunity',
      description: 'Wind speeds projected to ramp up from 14 m/s to 21 m/s over next 6 hours. Wind turbine output will peak at 85 kW.',
      confidence: 92.8,
      recommendedAction: 'Throttle back Genset G1 to standby/minimum load during peak wind window.',
      category: 'GENERATION',
      impact: 'Estimated 82L fuel saving across the 6-hour window.',
      actionUrl: '/optimization',
      priority: 'MEDIUM',
    },
  ],
  bharati: [
    {
      id: 'ins-b1',
      timestamp: '5 mins ago',
      stationId: 'bharati',
      title: 'Solar & Wind Co-Generation Surplus Peak',
      description: 'Renewable generation expected to exceed station base load between 12:00 and 15:30 (reaching 240 kW).',
      confidence: 97.2,
      recommendedAction: 'Direct excess power to BESS full-capacity charge and activate water desalination cycle.',
      category: 'STORAGE',
      impact: 'Enables 100% zero-emission station operation for 3.5 consecutive hours.',
      actionUrl: '/optimization',
      priority: 'HIGH',
    },
  ],
};

// Generates 24-hour realistic continuous curve
export function generateHourlyForecast(stationId: StationId): HourlyForecastPoint[] {
  const isMaitri = stationId === 'maitri';
  const baseLoad = isMaitri ? 380 : 430;
  const currentHour = new Date().getHours();
  
  const hours = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  return hours.map((hourStr, idx) => {
    // Solar profile: bell curve centered at 13:00, 0 at night
    const solarFactor = Math.max(0, Math.sin(((idx - 5) / 14) * Math.PI));
    const solarMax = isMaitri ? 85 : 130;
    const solarForecastKW = Math.round(solarFactor * solarMax * (0.85 + Math.sin(idx * 1.2) * 0.15));

    // Wind profile: gusts and katabatic variations
    const windBase = isMaitri ? 65 : 85;
    const windSpeedMs = +(14 + Math.sin(idx * 0.7) * 5 + Math.cos(idx * 1.5) * 2).toFixed(1);
    const windForecastKW = Math.round(windBase + (windSpeedMs - 14) * 5.5 + Math.sin(idx * 2) * 8);

    const totalRenewableKW = solarForecastKW + windForecastKW;

    // Load profile: higher in morning (7-9) and evening (18-21), with cold dip
    const tempDip = Math.sin(((idx + 4) / 24) * 2 * Math.PI) * 4;
    const temperatureC = +((isMaitri ? -25 : -18) + tempDip).toFixed(1);
    const thermalHeatingDemand = Math.abs(temperatureC) * 2.8;

    const activityFactor = (idx >= 7 && idx <= 21) ? 45 : 10;
    const predictedLoadKW = Math.round(baseLoad + activityFactor + thermalHeatingDemand + Math.sin(idx) * 12);
    
    // Past hours have actual load recorded
    const actualLoadKW = idx <= currentHour
      ? Math.round(predictedLoadKW + (Math.sin(idx * 3.7) * 8 - 3))
      : undefined;

    return {
      hour: hourStr,
      time: hourStr,
      actualLoadKW,
      predictedLoadKW,
      lowerConfidenceKW: Math.round(predictedLoadKW * 0.94),
      upperConfidenceKW: Math.round(predictedLoadKW * 1.06),
      solarForecastKW,
      windForecastKW,
      totalRenewableKW,
      temperatureC,
      windSpeedMs,
      solarRadiationWm2: Math.round(solarFactor * (isMaitri ? 550 : 680)),
    };
  });
}
