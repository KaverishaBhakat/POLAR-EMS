-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create rag_knowledge_chunks table for RAG vector search
CREATE TABLE IF NOT EXISTS "public"."rag_knowledge_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" VARCHAR(100) NOT NULL,
    "chunk_id" VARCHAR(150) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "heading" VARCHAR(255),
    "category" VARCHAR(100) NOT NULL,
    "station" VARCHAR(50),
    "provenance" VARCHAR(100) NOT NULL,
    "source" VARCHAR(255),
    "content" TEXT NOT NULL,
    "embedding" vector(768),
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- Create unique index on chunk_id
CREATE UNIQUE INDEX IF NOT EXISTS "rag_knowledge_chunks_chunk_id_key" ON "public"."rag_knowledge_chunks"("chunk_id");

-- Create filtering indexes
CREATE INDEX IF NOT EXISTS "idx_rag_chunks_document_id" ON "public"."rag_knowledge_chunks"("document_id");
CREATE INDEX IF NOT EXISTS "idx_rag_chunks_category" ON "public"."rag_knowledge_chunks"("category");
CREATE INDEX IF NOT EXISTS "idx_rag_chunks_station" ON "public"."rag_knowledge_chunks"("station");
CREATE INDEX IF NOT EXISTS "idx_rag_chunks_provenance" ON "public"."rag_knowledge_chunks"("provenance");
