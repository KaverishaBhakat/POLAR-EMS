/**
 * Provider Factory for POLAR-EMS AI Reasoning Layer
 */

const GeminiAiProvider = require('./gemini.provider');
const OpenAiCompatibleProvider = require('./openai.provider');
const MockAiProvider = require('./mock.provider');

let sharedMockProvider = null;

function getAiProvider(options = {}) {
  // If explicitly overridden
  if (options.providerInstance) {
    return options.providerInstance;
  }

  const requestedProvider = (
    options.provider ||
    process.env.AI_PROVIDER ||
    (process.env.NODE_ENV === 'test' ? 'mock' : 'mock')
  ).toLowerCase();

  if (requestedProvider === 'gemini') {
    return new GeminiAiProvider(options);
  }

  if (requestedProvider === 'openai' || requestedProvider === 'groq' || requestedProvider === 'ollama') {
    return new OpenAiCompatibleProvider(options);
  }

  // Default to Mock provider
  if (!sharedMockProvider) {
    sharedMockProvider = new MockAiProvider(options);
  }
  return sharedMockProvider;
}

module.exports = {
  getAiProvider,
  GeminiAiProvider,
  OpenAiCompatibleProvider,
  MockAiProvider,
};
