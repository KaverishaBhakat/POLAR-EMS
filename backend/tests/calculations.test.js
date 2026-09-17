const {
  calculateRenewablePenetration,
  calculateEnergyBalance,
  evaluateSystemRisk,
  runRuleBasedSimulation,
} = require('../src/utils/calculations');

describe('Calculations & Deterministic Rule Engine', () => {
  describe('calculateRenewablePenetration', () => {
    it('should compute correct percentage', () => {
      expect(calculateRenewablePenetration(40, 80)).toBe(50);
      expect(calculateRenewablePenetration(0, 80)).toBe(0);
      expect(calculateRenewablePenetration(100, 80)).toBe(125);
    });

    it('should handle zero or negative load safely', () => {
      expect(calculateRenewablePenetration(50, 0)).toBe(0);
      expect(calculateRenewablePenetration(50, -10)).toBe(0);
    });
  });

  describe('calculateEnergyBalance', () => {
    it('should compute net balance, deficit, and surplus correctly', () => {
      // 30 renewable + 40 generator + 10 battery discharge - 0 charge = 80 supply vs 70 load
      const balance = calculateEnergyBalance(30, 40, 10, 0, 70);
      expect(balance.totalSupplyKW).toBe(80);
      expect(balance.totalLoadKW).toBe(70);
      expect(balance.netBalanceKW).toBe(10);
      expect(balance.netSurplusKW).toBe(10);
      expect(balance.netDeficitKW).toBe(0);
    });

    it('should identify deficits correctly', () => {
      // 20 supply vs 50 load
      const balance = calculateEnergyBalance(20, 0, 0, 0, 50);
      expect(balance.netBalanceKW).toBe(-30);
      expect(balance.netDeficitKW).toBe(30);
      expect(balance.netSurplusKW).toBe(0);
    });
  });

  describe('evaluateSystemRisk', () => {
    it('should flag energyStress when supply < load', () => {
      const risk = evaluateSystemRisk(60, 75, 40);
      expect(risk.energyStress).toBe(true);
      expect(risk.criticalLoadRisk).toBe(false);
      expect(risk.stressMarginKW).toBe(-15);
    });

    it('should flag criticalLoadRisk when supply is below critical circuits', () => {
      const risk = evaluateSystemRisk(30, 75, 40);
      expect(risk.energyStress).toBe(true);
      expect(risk.criticalLoadRisk).toBe(true);
      expect(risk.criticalMarginKW).toBe(-10);
    });

    it('should evaluate as safe when supply exceeds all demands', () => {
      const risk = evaluateSystemRisk(100, 70, 35);
      expect(risk.energyStress).toBe(false);
      expect(risk.criticalLoadRisk).toBe(false);
    });
  });

  describe('runRuleBasedSimulation', () => {
    it('should increase heating load as temperature drops', () => {
      const warmSim = runRuleBasedSimulation({ temperature: -5, windSpeed: 10, solarAvailability: 0.5, occupancy: 20 });
      const coldSim = runRuleBasedSimulation({ temperature: -35, windSpeed: 10, solarAvailability: 0.5, occupancy: 20 });
      expect(coldSim.predictedLoad).toBeGreaterThan(warmSim.predictedLoad);
    });

    it('should generate more wind power at 15 m/s than at 5 m/s', () => {
      const lowWind = runRuleBasedSimulation({ windSpeed: 5, temperature: -15, solarAvailability: 0 });
      const highWind = runRuleBasedSimulation({ windSpeed: 15, temperature: -15, solarAvailability: 0 });
      expect(highWind.renewableGeneration).toBeGreaterThan(lowWind.renewableGeneration);
    });

    it('should flag stress during generator failure with high demand', () => {
      const result = runRuleBasedSimulation({
        temperature: -45,
        windSpeed: 2, // low wind
        solarAvailability: 0, // night
        batterySOC: 20, // depleted battery reserve
        generatorFailure: true,
      });
      expect(result.energyStress).toBe(true);
      expect(result.recommendation).toContain('STRESS');
    });

    it('should label engine as Rule-Based Simulation', () => {
      const result = runRuleBasedSimulation({});
      expect(result.engine).toBe('Rule-Based Simulation');
    });
  });
});
