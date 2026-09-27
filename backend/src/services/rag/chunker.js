/**
 * Markdown-Aware Document Parser and Semantic Chunker for POLAR-EMS RAG
 * 
 * Preserves frontmatter metadata, section headings, mathematical formulas,
 * and contextual hierarchy across chunk boundaries.
 */

const crypto = require('crypto');

/**
 * Parses frontmatter from a Markdown file string.
 * Supports YAML-style key: value frontmatter enclosed in ---
 */
function parseFrontmatter(markdownText) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = markdownText.match(frontmatterRegex);

  if (!match) {
    return {
      metadata: {},
      body: markdownText.trim(),
    };
  }

  const rawMeta = match[1];
  const body = match[2].trim();
  const metadata = {};

  rawMeta.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx !== -1) {
      const key = trimmed.slice(0, colonIdx).trim();
      let val = trimmed.slice(colonIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      metadata[key] = val;
    }
  });

  return { metadata, body };
}

/**
 * Splits markdown content by section headers (# or ## or ###) while keeping context.
 */
function splitBySections(body) {
  const lines = body.split('\n');
  const sections = [];
  let currentHeading = 'Overview';
  let currentLevel = 1;
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);

    if (headerMatch) {
      // Save previous section if not empty
      if (currentLines.length > 0) {
        const text = currentLines.join('\n').trim();
        if (text) {
          sections.push({
            heading: currentHeading,
            level: currentLevel,
            content: text,
          });
        }
        currentLines = [];
      }
      currentLevel = headerMatch[1].length;
      currentHeading = headerMatch[2].trim();
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    const text = currentLines.join('\n').trim();
    if (text) {
      sections.push({
        heading: currentHeading,
        level: currentLevel,
        content: text,
      });
    }
  }

  return sections;
}

/**
 * Chunks a single markdown file into semantic, searchable units.
 * 
 * @param {string} fileContent - Raw markdown file content
 * @param {Object} options - Configuration options
 * @param {number} [options.maxChunkSize=1200] - Target maximum characters per chunk
 * @param {number} [options.minChunkSize=200] - Minimum characters before combining
 * @returns {Array<Object>} List of structured chunk objects
 */
function chunkMarkdownDocument(fileContent, options = {}) {
  const maxChunkSize = options.maxChunkSize || 1200;
  const minChunkSize = options.minChunkSize || 150;

  const { metadata, body } = parseFrontmatter(fileContent);

  const documentId = metadata.documentId || `doc_${crypto.createHash('md5').update(body.slice(0, 100)).digest('hex').slice(0, 8)}`;
  const title = metadata.title || 'POLAR-EMS Knowledge Document';
  const category = (metadata.category || 'GENERAL').toUpperCase();
  const station = metadata.station ? metadata.station.toUpperCase() : 'ALL';
  const provenance = metadata.provenance || 'ENGINEERING ASSUMPTION';
  const source = metadata.source || 'PROJECT_DOCUMENTATION';
  const version = metadata.version || '1.0';

  const rawSections = splitBySections(body);
  const chunks = [];
  let chunkIndex = 0;

  for (const section of rawSections) {
    const sectionText = section.content;

    // If section fits within maxChunkSize, keep as single chunk
    if (sectionText.length <= maxChunkSize) {
      chunkIndex++;
      const chunkId = `${documentId}_chunk_${String(chunkIndex).padStart(2, '0')}`;
      const chunkContent = `### ${section.heading}\n${sectionText}`;

      chunks.push({
        documentId,
        chunkId,
        title,
        heading: section.heading,
        category,
        station,
        provenance,
        source,
        version,
        content: chunkContent,
        metadata: {
          ...metadata,
          sectionHeading: section.heading,
          charCount: chunkContent.length,
          chunkIndex,
        },
      });
    } else {
      // Split section paragraphs without breaking formulas or lists
      const paragraphs = sectionText.split(/\n\s*\n/);
      let buffer = [];
      let currentLen = 0;

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        if (currentLen + trimmed.length > maxChunkSize && buffer.length > 0) {
          chunkIndex++;
          const chunkId = `${documentId}_chunk_${String(chunkIndex).padStart(2, '0')}`;
          const chunkContent = `### ${section.heading}\n${buffer.join('\n\n')}`;

          chunks.push({
            documentId,
            chunkId,
            title,
            heading: section.heading,
            category,
            station,
            provenance,
            source,
            version,
            content: chunkContent,
            metadata: {
              ...metadata,
              sectionHeading: section.heading,
              charCount: chunkContent.length,
              chunkIndex,
            },
          });

          buffer = [trimmed];
          currentLen = trimmed.length;
        } else {
          buffer.push(trimmed);
          currentLen += trimmed.length;
        }
      }

      if (buffer.length > 0) {
        chunkIndex++;
        const chunkId = `${documentId}_chunk_${String(chunkIndex).padStart(2, '0')}`;
        const chunkContent = `### ${section.heading}\n${buffer.join('\n\n')}`;

        chunks.push({
          documentId,
          chunkId,
          title,
          heading: section.heading,
          category,
          station,
          provenance,
          source,
          version,
          content: chunkContent,
          metadata: {
            ...metadata,
            sectionHeading: section.heading,
            charCount: chunkContent.length,
            chunkIndex,
          },
        });
      }
    }
  }

  // Merge any trailing orphan chunks that are too tiny
  if (chunks.length > 1 && chunks[chunks.length - 1].content.length < minChunkSize) {
    const last = chunks.pop();
    const prev = chunks[chunks.length - 1];
    prev.content = `${prev.content}\n\n${last.content}`;
    prev.metadata.charCount = prev.content.length;
  }

  return chunks;
}

module.exports = {
  parseFrontmatter,
  splitBySections,
  chunkMarkdownDocument,
};
