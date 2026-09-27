/**
 * RAG Controller for POLAR-EMS
 */

const ragService = require('../services/rag.service');
const ApiError = require('../utils/ApiError');

class RagController {
  /**
   * Search knowledge base
   * POST or GET /api/rag/search
   */
  async search(req, res, next) {
    try {
      const query = req.method === 'POST' ? req.body?.query : req.query?.query;
      const station = req.method === 'POST' ? req.body?.station : req.query?.station;
      const category = req.method === 'POST' ? req.body?.category : req.query?.category;
      const provenance = req.method === 'POST' ? req.body?.provenance : req.query?.provenance;
      const topK = req.method === 'POST' ? req.body?.topK : req.query?.topK;
      const minScore = req.method === 'POST' ? req.body?.minScore : req.query?.minScore;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw ApiError.badRequest('Query parameter "query" is required and cannot be empty.', 'EMPTY_QUERY');
      }

      if (query.length > 500) {
        throw ApiError.badRequest('Query parameter "query" cannot exceed 500 characters.', 'QUERY_TOO_LONG');
      }

      const results = await ragService.search({
        query,
        station,
        category,
        provenance,
        topK,
        minScore,
      });

      res.status(200).json({
        success: true,
        query: query.trim(),
        totalMatches: results.length,
        provider: ragService.provider.getProviderName(),
        filters: {
          station: station || 'ALL',
          category: category || 'ALL',
          provenance: provenance || 'ALL',
        },
        results,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RagController();
