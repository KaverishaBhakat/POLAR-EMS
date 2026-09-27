const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('1. Enabling vector extension if not present...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('Extension "vector" created/verified successfully.');

    console.log('2. Creating table "rag_knowledge_chunks" if not present...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rag_knowledge_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id VARCHAR(100) NOT NULL,
        chunk_id VARCHAR(150) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        heading VARCHAR(255),
        category VARCHAR(100) NOT NULL,
        station VARCHAR(50),
        provenance VARCHAR(100) NOT NULL,
        source VARCHAR(255),
        content TEXT NOT NULL,
        embedding vector(768),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Table "rag_knowledge_chunks" created/verified.');

    console.log('3. Creating indexes for high-performance metadata filtering and similarity search...');
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id ON rag_knowledge_chunks(document_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_category ON rag_knowledge_chunks(category);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_station ON rag_knowledge_chunks(station);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_provenance ON rag_knowledge_chunks(provenance);`);
    console.log('Indexes created/verified.');

    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM rag_knowledge_chunks;`);
    console.log('Current chunks in DB:', count);
  } catch (e) {
    console.error('Error setting up pgvector table:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
