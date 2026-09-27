const { provenanceService, PROVENANCE_TYPES } = require('../src/services/ai');

describe('AI Assistant - Scientific Provenance Enforcement', () => {
  test('Normalizes various raw provenance representations into scientific tags', () => {
    expect(provenanceService.normalizeProvenance('REAL / MEASURED')).toContain(PROVENANCE_TYPES.REAL_MEASURED);
    expect(provenanceService.normalizeProvenance('REAL CLIMATOLOGY')).toContain(PROVENANCE_TYPES.REAL_CLIMATOLOGY);
    expect(provenanceService.normalizeProvenance('MODELED / SCENARIO')).toContain(PROVENANCE_TYPES.MODELED_SCENARIO);
    expect(provenanceService.normalizeProvenance('OPTIMIZATION')).toContain(PROVENANCE_TYPES.OPTIMIZATION);
    expect(provenanceService.normalizeProvenance('ENGINEERING ASSUMPTION')).toContain(PROVENANCE_TYPES.ENGINEERING_ASSUMPTION);
    expect(provenanceService.normalizeProvenance('UNAVAILABLE')).toContain(PROVENANCE_TYPES.UNAVAILABLE);
  });

  test('Extracts distinct provenance tags from a mixed evidence array', () => {
    const evidence = [
      { type: 'TELEMETRY', tool: 'get_current_weather', provenance: 'REAL / MEASURED' },
      { type: 'TELEMETRY', tool: 'get_current_renewable', provenance: 'MODELED / SCENARIO' },
      { type: 'OPTIMIZATION', tool: 'get_optimization_dispatch', provenance: 'OPTIMIZATION' },
    ];

    const tags = provenanceService.extractProvenanceFromEvidence(evidence);
    expect(tags).toContain(PROVENANCE_TYPES.REAL_MEASURED);
    expect(tags).toContain(PROVENANCE_TYPES.MODELED_SCENARIO);
    expect(tags).toContain(PROVENANCE_TYPES.OPTIMIZATION);
    expect(tags.length).toBe(3);
  });

  test('Generates transparent scientific notes for judge evaluation', () => {
    const tags = [
      PROVENANCE_TYPES.REAL_MEASURED,
      PROVENANCE_TYPES.REAL_CLIMATOLOGY,
      PROVENANCE_TYPES.MODELED_SCENARIO,
    ];

    const summaryNotes = provenanceService.generateProvenanceSummary(tags);
    expect(summaryNotes.length).toBe(3);
    expect(summaryNotes.some((n) => n.includes('Maitri Station (2019)'))).toBe(true);
    expect(summaryNotes.some((n) => n.includes('IMD'))).toBe(true);
    expect(summaryNotes.some((n) => n.includes('IEC 61724-1'))).toBe(true);
  });
});
