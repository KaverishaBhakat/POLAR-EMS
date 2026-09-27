/**
 * CLI Knowledge Ingestion Script for POLAR-EMS
 * 
 * Usage:
 *   npm run knowledge:ingest
 *   or node scripts/ingest-knowledge.js
 */

require('dotenv').config();
const KnowledgeIngestionService = require('../src/services/rag/ingest.service');
const { prisma } = require('../src/config/database');

async function main() {
  console.log('====================================================');
  console.log(' POLAR-EMS RAG KNOWLEDGE INGESTION PIPELINE');
  console.log('====================================================');

  const ingestionService = new KnowledgeIngestionService();
  console.log(`Using Embedding Provider: ${ingestionService.provider.getProviderName()}`);
  console.log(`Knowledge Directory: ${ingestionService.knowledgeDir}\n`);

  const startTime = Date.now();
  const stats = await ingestionService.ingestAll();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('----------------------------------------------------');
  console.log(' INGESTION RESULTS');
  console.log('----------------------------------------------------');
  console.log(`Documents discovered : ${stats.documentsDiscovered}`);
  console.log(`Chunks created       : ${stats.chunksCreated}`);
  console.log(`Chunks updated       : ${stats.chunksUpdated}`);
  console.log(`Embeddings generated : ${stats.embeddingsGenerated}`);
  console.log(`Errors encountered   : ${stats.errors.length}`);
  console.log(`Total indexed chunks : ${stats.totalIndexedChunks}`);
  console.log(`Execution time       : ${duration}s`);
  console.log('====================================================\n');

  if (stats.errors.length > 0) {
    console.error('Errors detail:');
    stats.errors.forEach((err, idx) => {
      console.error(` ${idx + 1}. [${err.file || 'unknown'}] Chunk: ${err.chunkId || 'N/A'} - ${err.error}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Ingestion failed with unhandled error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
