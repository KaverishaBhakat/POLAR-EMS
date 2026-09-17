/**
 * AI Optimization Service Interface (Conceptual Architecture Placeholder)
 * 
 * Future Integration:
 * This service will interface with a mathematical optimization solver (Google OR-Tools / Pyomo)
 * to compute optimal unit commitment and economic dispatch for polar microgrids.
 * 
 * At this stage, mathematical optimization is explicitly NOT implemented.
 */
class OptimizationService {
  async getOptimalDispatch(stationId) {
    return {
      status: 'NOT_IMPLEMENTED',
      engine: 'AI_OPTIMIZATION_PLACEHOLDER',
      message: 'MILP / Google OR-Tools optimization engine will be integrated in Phase 2.',
      targetService: 'http://localhost:8002/api/v1/optimization',
      stationId,
    };
  }
}

module.exports = new OptimizationService();
