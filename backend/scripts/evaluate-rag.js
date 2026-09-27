/**
 * RAG Semantic Retrieval Evaluation Script for POLAR-EMS
 * 
 * Evaluates retrieval accuracy (Recall@K, Precision@K, Category Match)
 * across the 12 evaluation questions in backend/knowledge/evaluation/rag_questions.json.
 * 
 * Usage:
 *   npm run knowledge:eval
 *   or node scripts/evaluate-rag.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ragService = require('../src/services/rag.service');
const { prisma } = require('../src/config/database');

async function main() {
  console.log('====================================================');
  console.log(' POLAR-EMS RAG RETRIEVAL EVALUATION');
  console.log('====================================================');
  console.log(`Using Embedding Provider: ${ragService.provider.getProviderName()}\n`);

  const questionsPath = path.resolve(__dirname, '../knowledge/evaluation/rag_questions.json');
  if (!fs.existsSync(questionsPath)) {
    console.error(`Evaluation file not found at ${questionsPath}`);
    process.exit(1);
  }

  const testCases = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  console.log(`Loaded ${testCases.length} evaluation test cases.\n`);

  let top1Matches = 0;
  let top3Matches = 0;
  let top5Matches = 0;
  let categoryMatches = 0;
  const evaluationDetails = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const topK = 5;

    const results = await ragService.search({
      query: testCase.question,
      station: testCase.expectedStation,
      topK,
    });

    const docIds = results.map((r) => r.documentId);
    const categories = results.map((r) => r.category);

    const hitTop1 = docIds.length > 0 && docIds[0] === testCase.expectedDocumentId;
    const hitTop3 = docIds.slice(0, 3).includes(testCase.expectedDocumentId);
    const hitTop5 = docIds.includes(testCase.expectedDocumentId);
    const categoryHit = categories.includes(testCase.expectedCategory);

    if (hitTop1) top1Matches++;
    if (hitTop3) top3Matches++;
    if (hitTop5) top5Matches++;
    if (categoryHit) categoryMatches++;

    evaluationDetails.push({
      id: testCase.id,
      question: testCase.question,
      expectedDocument: testCase.expectedDocumentId,
      expectedCategory: testCase.expectedCategory,
      hitTop1,
      hitTop3,
      hitTop5,
      categoryHit,
      retrievedTop1: results[0] ? `${results[0].documentId} (${results[0].heading}, score=${results[0].score})` : 'NONE',
      score: results[0]?.score || 0,
      provenance: results[0]?.provenance || 'N/A',
    });
  }

  console.log('----------------------------------------------------');
  console.log(' INDIVIDUAL QUESTION RESULTS');
  console.log('----------------------------------------------------');
  evaluationDetails.forEach((res) => {
    const status = res.hitTop3 ? 'PASS [Top-3]' : res.hitTop5 ? 'PASS [Top-5]' : 'MISS';
    console.log(`[${res.id}] ${status} | Score: ${res.score} | Prov: ${res.provenance}`);
    console.log(`  Q: "${res.question}"`);
    console.log(`  Expected Doc: ${res.expectedDocument}`);
    console.log(`  Retrieved #1: ${res.retrievedTop1}\n`);
  });

  const total = testCases.length;
  const top1Rate = ((top1Matches / total) * 100).toFixed(1);
  const top3Rate = ((top3Matches / total) * 100).toFixed(1);
  const top5Rate = ((top5Matches / total) * 100).toFixed(1);
  const catRate = ((categoryMatches / total) * 100).toFixed(1);

  console.log('====================================================');
  console.log(' EVALUATION SUMMARY METRICS');
  console.log('====================================================');
  console.log(`Total Questions Evaluated : ${total}`);
  console.log(`Top-1 Accuracy (Recall@1) : ${top1Matches}/${total} (${top1Rate}%)`);
  console.log(`Top-3 Accuracy (Recall@3) : ${top3Matches}/${total} (${top3Rate}%)`);
  console.log(`Top-5 Accuracy (Recall@5) : ${top5Matches}/${total} (${top5Rate}%)`);
  console.log(`Category Match Rate       : ${categoryMatches}/${total} (${catRate}%)`);
  console.log('====================================================\n');

  await prisma.$disconnect();

  if (top5Matches < total * 0.8) {
    console.error('Warning: Retrieval Recall@5 fell below 80% threshold.');
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('Evaluation failed with error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
