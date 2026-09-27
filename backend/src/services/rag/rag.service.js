/**
 * RAG Semantic Retrieval Service for POLAR-EMS
 * 
 * Performs pgvector cosine distance search against indexed microgrid knowledge chunks
 * with metadata filtering across station, category, and data provenance.
 */

const { prisma } = require('../../config/database');
const { getEmbeddingProvider } = require('./embeddingProvider');
const ApiError = require('../../utils/ApiError');

class RagService {
  constructor(options = {}) {
    this.provider = options.provider || getEmbeddingProvider();
  }

  /**
   * Search knowledge chunks using semantic vector similarity.
   * 
   * @param {Object} params
   * @param {string} params.query - Search query string
   * @param {string} [params.station] - Optional station filter (e.g. 'MAITRI', 'BHARATI')
   * @param {string} [params.category] - Optional category filter (e.g. 'OPTIMIZATION', 'BATTERY')
   * @param {string} [params.provenance] - Optional provenance filter (e.g. 'MODELED / SCENARIO')
   * @param {number} [params.topK=5] - Number of top results to return (max 20)
   * @param {number} [params.minScore=0.0] - Minimum similarity score threshold (0.0 to 1.0)
   * @returns {Promise<Array<Object>>} Top matching knowledge chunks
   */
  async search({ query, station, category, provenance, topK = 5, minScore = 0.0 }) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw ApiError.badRequest('Search query must be a non-empty string.', 'EMPTY_RAG_QUERY');
    }

    const cleanQuery = query.trim().slice(0, 500);
    const limit = Math.min(Math.max(parseInt(topK, 10) || 5, 1), 20);
    const scoreFloor = Math.max(parseFloat(minScore) || 0.0, 0.0);

    // Normalize filters
    const normStation = station && typeof station === 'string' && station.trim() !== '' && station.toUpperCase() !== 'ALL'
      ? station.trim().toUpperCase()
      : null;
    const normCategory = category && typeof category === 'string' && category.trim() !== '' && category.toUpperCase() !== 'ALL'
      ? category.trim().toUpperCase()
      : null;
    const normProvenance = provenance && typeof provenance === 'string' && provenance.trim() !== '' && provenance.toUpperCase() !== 'ALL'
      ? provenance.trim()
      : null;

    // Generate query embedding vector
    const queryVector = await this.provider.embedText(cleanQuery);
    const vectorSqlString = `[${queryVector.join(',')}]`;

    // Query pgvector using cosine distance (<=>)
    // Cosine similarity = 1 - cosine_distance
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT 
        "chunk_id" AS "chunkId",
        "document_id" AS "documentId",
        "title",
        "heading",
        "category",
        "station",
        "provenance",
        "source",
        "content",
        "metadata",
        (1.0 - ("embedding" <=> $1::vector)) AS "score"
      FROM "rag_knowledge_chunks"
      WHERE "embedding" IS NOT NULL
        AND ($2::text IS NULL OR "station" = $2 OR "station" = 'ALL' OR "station" IS NULL)
        AND ($3::text IS NULL OR "category" = $3)
        AND ($4::text IS NULL OR "provenance" = $4)
      ORDER BY "embedding" <=> $1::vector ASC
      LIMIT $5;
      `,
      vectorSqlString,
      normStation,
      normCategory,
      normProvenance,
      limit
    );

    // Filter by minScore and format results safely (never expose raw embedding vectors)
    const results = (rows || [])
      .map((r) => {
        const rawScore = typeof r.score === 'number' ? r.score : parseFloat(r.score) || 0.0;
        return {
          chunkId: r.chunkId,
          documentId: r.documentId,
          title: r.title,
          heading: r.heading,
          category: r.category,
          station: r.station,
          provenance: r.provenance,
          source: r.source,
          content: r.content,
          score: parseFloat(rawScore.toFixed(4)),
        };
      })
      .filter((r) => r.score >= scoreFloor);

    return results;
  }
}

module.exports = new RagService();
