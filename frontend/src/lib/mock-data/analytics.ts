import { HistoricalAnalyticsPoint, StationId } from '../types';

export const ANALYTICS_SUMMARY = {
  fuelSavingsPercent: 18.7,
  renewablePenetrationPercent: 42.3,
  avgGenEfficiencyPercent: 87.4,
  criticalLoadReliabilityPercent: 99.98,
  co2AvoidedTonnes: 12.4,
  financialSavingsINR: 4860000, // ₹48.6 Lakhs in Arctic diesel logistics saved
  dieselSavedLitres: 18450,
  batteryCyclesLogged: 142,
  batteryHealthPercent: 98.2,
};

export function generateHistoricalAnalytics(days: number, stationId: StationId): HistoricalAnalyticsPoint[] {
  const points: HistoricalAnalyticsPoint[] = [];
  const isMaitri = stationId === 'maitri';
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Physical variations across days
    const weatherCycle = Math.sin(i * 0.4);
    const minTempC = Math.round((isMaitri ? -26 : -19) + weatherCycle * 8);
    const windFactor = 0.8 + Math.cos(i * 0.6) * 0.4;
    
    const baselineFuel = Math.round((isMaitri ? 980 : 1100) + Math.abs(minTempC) * 6 + Math.sin(i) * 30);
    const savingsRate = 0.16 + Math.max(0, windFactor * 0.08) + (weatherCycle > 0 ? 0.04 : 0);
    const actualFuel = Math.round(baselineFuel * (1 - savingsRate));
    const fuelSaved = baselineFuel - actualFuel;
    
    const renewablePen = Math.round(32 + windFactor * 16 + (minTempC > -22 ? 6 : 0));
    const avgGenEff = +(85.5 + Math.sin(i * 1.1) * 2.8).toFixed(1);
    const co2Avoided = Math.round(fuelSaved * 2.68);
    
    const baseLoad = isMaitri ? 390 : 440;
    const avgLoad = Math.round(baseLoad + Math.abs(minTempC) * 2.2);
    const peakLoad = Math.round(avgLoad * 1.22);

    points.push({
      date: dateStr,
      actualFuelL: actualFuel,
      baselineFuelL: baselineFuel,
      fuelSavedL: fuelSaved,
      renewablePenetrationPercent: Math.min(65, Math.max(15, renewablePen)),
      avgGenEfficiencyPercent: Math.min(94, Math.max(78, avgGenEff)),
      co2AvoidedKg: co2Avoided,
      avgLoadKW: avgLoad,
      peakLoadKW: peakLoad,
      minTempC: minTempC,
    });
  }

  return points;
}
