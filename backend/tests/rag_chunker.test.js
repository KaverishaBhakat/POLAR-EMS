const { parseFrontmatter, splitBySections, chunkMarkdownDocument } = require('../src/services/rag/chunker');

describe('RAG Document Chunker', () => {
  const sampleMarkdown = `---
documentId: "test-doc-01"
title: "Test Microgrid Document"
category: "SYSTEM"
station: "MAITRI"
provenance: "ENGINEERING ASSUMPTION"
version: "1.0"
source: "test/source.md"
---

# Test Microgrid Document
This document covers polar microgrid engineering parameters.

## 1. Overview and Objectives
POLAR-EMS is designed for Antarctic research stations to minimize diesel fuel consumption.

## 2. Mathematical Formula
The electrical balance is governed by:
P_load(t) = P_pv(t) + P_wind(t) + P_gen(t) + P_batt(t)

Where critical load is preserved at 42.5 kW.
`;

  test('correctly parses YAML frontmatter metadata', () => {
    const { metadata, body } = parseFrontmatter(sampleMarkdown);
    expect(metadata.documentId).toBe('test-doc-01');
    expect(metadata.title).toBe('Test Microgrid Document');
    expect(metadata.category).toBe('SYSTEM');
    expect(metadata.station).toBe('MAITRI');
    expect(metadata.provenance).toBe('ENGINEERING ASSUMPTION');
    expect(body).toContain('POLAR-EMS is designed');
  });

  test('splits sections preserving headings and levels', () => {
    const { body } = parseFrontmatter(sampleMarkdown);
    const sections = splitBySections(body);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    expect(sections[0].heading).toContain('Test Microgrid Document');
    expect(sections[1].heading).toContain('1. Overview and Objectives');
  });

  test('generates deterministic chunk IDs and maintains metadata', () => {
    const chunks = chunkMarkdownDocument(sampleMarkdown);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].documentId).toBe('test-doc-01');
    expect(chunks[0].chunkId).toBe('test-doc-01_chunk_01');
    expect(chunks[0].title).toBe('Test Microgrid Document');
    expect(chunks[0].station).toBe('MAITRI');
    expect(chunks[0].provenance).toBe('ENGINEERING ASSUMPTION');
    expect(chunks[0].content).toBeDefined();
  });

  test('chunking identical content produces identical chunk IDs (determinism)', () => {
    const chunksA = chunkMarkdownDocument(sampleMarkdown);
    const chunksB = chunkMarkdownDocument(sampleMarkdown);
    expect(chunksA.map((c) => c.chunkId)).toEqual(chunksB.map((c) => c.chunkId));
    expect(chunksA.map((c) => c.content)).toEqual(chunksB.map((c) => c.content));
  });
});
