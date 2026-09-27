/**
 * Knowledge Ingestion Service for POLAR-EMS RAG
 * 
 * Discovers Markdown files in backend/knowledge/, parses frontmatter,
 * chunks text, generates embeddings, and idempotently upserts to PostgreSQL pgvector.
 */

const fs = require('fs');
const path = require('path');
const { prisma } = require('../../config/database');
const { chunkMarkdownDocument } = require('./chunker');
const { getEmbeddingProvider } = require('./embeddingProvider');

class KnowledgeIngestionService {
  constructor(options = {}) {
    this.knowledgeDir = options.knowledgeDir || path.resolve(__dirname, '../../../knowledge');
    this.provider = options.provider || getEmbeddingProvider();
  }

  /**
   * Recursively finds all .md files in the knowledge directory (excluding evaluation/ and README.md).
   */
  discoverKnowledgeFiles(dir = this.knowledgeDir) {
    let files = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Exclude evaluation folder
        if (entry.name !== 'evaluation') {
          files = files.concat(this.discoverKnowledgeFiles(fullPath));
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Exclude root README.md
        if (entry.name !== 'README.md') {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Ingests all discovered knowledge files into PostgreSQL pgvector table.
   */
  async ingestAll() {
    const files = this.discoverKnowledgeFiles();
    const stats = {
      documentsDiscovered: files.length,
      chunksCreated: 0,
      chunksUpdated: 0,
      embeddingsGenerated: 0,
      errors: [],
      totalIndexedChunks: 0,
      provider: this.provider.getProviderName(),
    };

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const chunks = chunkMarkdownDocument(content);

        for (const chunk of chunks) {
          try {
            // Generate embedding for chunk content + title + heading context
            const textToEmbed = `${chunk.title}\n${chunk.heading}\n${chunk.content}`;
            const embedding = await this.provider.embedText(textToEmbed);
            stats.embeddingsGenerated++;

            const vectorSqlString = `[${embedding.join(',')}]`;

            // Check if chunk exists to track created vs updated
            const existing = await prisma.$queryRawUnsafe(
              `SELECT id FROM "rag_knowledge_chunks" WHERE "chunk_id" = $1 LIMIT 1;`,
              chunk.chunkId
            );

            const isUpdate = existing && existing.length > 0;

            // Execute SQL Upsert
            await prisma.$executeRawUnsafe(
              `
              INSERT INTO "rag_knowledge_chunks" (
                "document_id",
                "chunk_id",
                "title",
                "heading",
                "category",
                "station",
                "provenance",
                "source",
                "content",
                "embedding",
                "metadata",
                "updated_at"
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11::jsonb, NOW()
              )
              ON CONFLICT ("chunk_id") DO UPDATE SET
                "document_id" = EXCLUDED."document_id",
                "title" = EXCLUDED."title",
                "heading" = EXCLUDED."heading",
                "category" = EXCLUDED."category",
                "station" = EXCLUDED."station",
                "provenance" = EXCLUDED."provenance",
                "source" = EXCLUDED."source",
                "content" = EXCLUDED."content",
                "embedding" = EXCLUDED."embedding",
                "metadata" = EXCLUDED."metadata",
                "updated_at" = NOW();
              `,
              chunk.documentId,
              chunk.chunkId,
              chunk.title,
              chunk.heading,
              chunk.category,
              chunk.station,
              chunk.provenance,
              chunk.source,
              chunk.content,
              vectorSqlString,
              JSON.stringify(chunk.metadata)
            );

            if (isUpdate) {
              stats.chunksUpdated++;
            } else {
              stats.chunksCreated++;
            }
          } catch (chunkErr) {
            stats.errors.push({
              file: path.relative(this.knowledgeDir, filePath),
              chunkId: chunk.chunkId,
              error: chunkErr.message,
            });
          }
        }
      } catch (fileErr) {
        stats.errors.push({
          file: path.relative(this.knowledgeDir, filePath),
          error: fileErr.message,
        });
      }
    }

    const totalCountRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "rag_knowledge_chunks";`);
    stats.totalIndexedChunks = totalCountRes?.[0]?.count || 0;

    return stats;
  }
}

module.exports = KnowledgeIngestionService;
