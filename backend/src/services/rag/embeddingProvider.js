/**
 * Embedding Provider Abstraction for POLAR-EMS RAG
 * 
 * Supports:
 * 1. Google Gemini (text-embedding-004, 768 dimensions)
 * 2. OpenAI (text-embedding-3-small, 768 dimensions)
 * 3. Local Deterministic Vectorizer (768 dimensions, offline/test fallback)
 */

const crypto = require('crypto');

const EMBEDDING_DIMENSION = 768;

/**
 * Base Embedding Provider Interface
 */
class BaseEmbeddingProvider {
  getDimension() {
    return EMBEDDING_DIMENSION;
  }

  getProviderName() {
    return 'base';
  }

  async embedText(text) {
    throw new Error('Method embedText() must be implemented by subclass.');
  }

  async embedBatch(texts) {
    const results = [];
    for (const text of texts) {
      results.push(await this.embedText(text));
    }
    return results;
  }
}

/**
 * Google Gemini Embedding Provider (text-embedding-004)
 */
class GeminiEmbeddingProvider extends BaseEmbeddingProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  }

  getProviderName() {
    return `gemini (${this.model})`;
  }

  async embedText(text) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is required for Gemini embeddings.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${this.model}`,
        content: {
          parts: [{ text }],
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Gemini Embedding API Error (${response.status}): ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const values = data.embedding?.values;
    if (!values || !Array.isArray(values)) {
      throw new Error('Invalid response structure from Gemini Embedding API.');
    }

    return values;
  }
}

/**
 * OpenAI Embedding Provider (text-embedding-3-small, 768 dim)
 */
class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  getProviderName() {
    return `openai (${this.model})`;
  }

  async embedText(text) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for OpenAI embeddings.');
    }

    const endpoint = 'https://api.openai.com/v1/embeddings';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        dimensions: EMBEDDING_DIMENSION,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI Embedding API Error (${response.status}): ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const values = data.data?.[0]?.embedding;
    if (!values || !Array.isArray(values)) {
      throw new Error('Invalid response structure from OpenAI Embedding API.');
    }

    return values;
  }
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  's', 'same', 'she', 'should', 'so', 'some', 'such',
  't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

// Domain-specific keyword boost weights
const DOMAIN_BOOSTS = {
  polar: 2.5,
  ems: 3.0,
  maitri: 4.0,
  bharati: 4.0,
  solar: 3.5,
  photovoltaic: 4.0,
  pv: 3.5,
  irradiance: 3.5,
  radiation: 3.5,
  climatology: 3.5,
  wind: 3.5,
  turbine: 3.5,
  aerodynamic: 3.0,
  katabatic: 3.5,
  battery: 3.5,
  bess: 4.0,
  soc: 3.5,
  discharge: 3.0,
  charge: 3.0,
  generator: 3.5,
  genset: 3.5,
  diesel: 3.0,
  fuel: 3.0,
  consumption: 3.0,
  optimization: 3.5,
  milp: 4.0,
  dispatch: 3.5,
  ortools: 4.0,
  resilience: 3.5,
  contingency: 3.0,
  blizzard: 3.5,
  provenance: 4.0,
  measured: 3.5,
  modeled: 3.5,
  scenario: 3.5,
  assumption: 3.5,
  forecasting: 3.5,
  temperature: 3.0,
  regressor: 3.5,
  gradient: 3.0,
  heating: 3.5,
  thermal: 3.5,
  critical: 3.5,
  load: 3.0,
};

/**
 * Local Deterministic Semantic Embedding Provider
 * 
 * Generates reproducible 768-dimensional normalized embeddings using stopword filtering,
 * domain term TF-IDF boosting, sub-word character n-grams, and Murmur-style hash projections.
 */
class LocalDeterministicEmbeddingProvider extends BaseEmbeddingProvider {
  getProviderName() {
    return 'local-deterministic-768';
  }

  async embedText(text) {
    return this.generateDeterministicVector(text, EMBEDDING_DIMENSION);
  }

  generateDeterministicVector(text, dim = EMBEDDING_DIMENSION) {
    const vector = new Array(dim).fill(0.0);
    const cleanText = (text || '').toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ');
    const allTokens = cleanText.split(/\s+/).filter(Boolean);

    if (allTokens.length === 0) {
      vector[0] = 1.0;
      return vector;
    }

    const filteredTokens = allTokens.filter((t) => !STOP_WORDS.has(t));
    const tokenList = filteredTokens.length > 0 ? filteredTokens : allTokens;

    // Helper hash function producing 2 independent integer indices
    const hashWord = (str) => {
      let h1 = 0x811c9dc5;
      let h2 = 0x55555555;
      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ c, 0x5bd1e995);
      }
      return [Math.abs(h1) % dim, Math.abs(h2) % dim];
    };

    // 1. Unigram feature projection with domain boosts
    for (let i = 0; i < tokenList.length; i++) {
      const token = tokenList[i];
      const boost = DOMAIN_BOOSTS[token] || 1.0;
      const [idxA, idxB] = hashWord(token);
      vector[idxA] += 2.0 * boost;
      vector[idxB] += 1.0 * boost;

      // Sub-word char 3-grams for morphological matching
      if (token.length >= 4) {
        for (let j = 0; j <= token.length - 3; j++) {
          const charGram = token.slice(j, j + 3);
          const [cgIdx] = hashWord(`cg_${charGram}`);
          vector[cgIdx] += 0.5 * boost;
        }
      }

      // Bigrams
      if (i < tokenList.length - 1) {
        const bigram = `${token}_${tokenList[i + 1]}`;
        const [bgIdxA, bgIdxB] = hashWord(`bg_${bigram}`);
        const bgBoost = Math.max(boost, DOMAIN_BOOSTS[tokenList[i + 1]] || 1.0);
        vector[bgIdxA] += 3.0 * bgBoost;
        vector[bgIdxB] += 1.5 * bgBoost;
      }
    }

    // L2 Normalization (unit vector)
    let norm = 0.0;
    for (let i = 0; i < dim; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] = parseFloat((vector[i] / norm).toFixed(6));
      }
    } else {
      vector[0] = 1.0;
    }

    return vector;
  }
}

/**
 * Provider Factory
 */
function getEmbeddingProvider(preferredProvider) {
  const providerKey = (preferredProvider || process.env.EMBEDDING_PROVIDER || '').toLowerCase();

  if (providerKey === 'gemini' || (process.env.GEMINI_API_KEY && providerKey !== 'local')) {
    return new GeminiEmbeddingProvider();
  }

  if (providerKey === 'openai' || (process.env.OPENAI_API_KEY && providerKey !== 'local')) {
    return new OpenAIEmbeddingProvider();
  }

  // Default robust offline provider
  return new LocalDeterministicEmbeddingProvider();
}

module.exports = {
  EMBEDDING_DIMENSION,
  BaseEmbeddingProvider,
  GeminiEmbeddingProvider,
  OpenAIEmbeddingProvider,
  LocalDeterministicEmbeddingProvider,
  getEmbeddingProvider,
};
