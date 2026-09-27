/**
 * POLAR-EMS AI Reasoning Layer Master Index
 */

const assistantService = require('./assistant.service');
const reasoningService = require('./reasoning.service');
const toolSelectionService = require('./tool-selection.service');
const contextBuilder = require('./context-builder');
const responseBuilder = require('./response-builder');
const provenanceService = require('./provenance');
const { INTENT_TYPES, PROVENANCE_TYPES, AssistantQuerySchema } = require('./schemas');
const { getAiProvider, MockAiProvider, GeminiAiProvider, OpenAiCompatibleProvider } = require('./providers/provider.factory');

module.exports = {
  assistantService,
  reasoningService,
  toolSelectionService,
  contextBuilder,
  responseBuilder,
  provenanceService,
  INTENT_TYPES,
  PROVENANCE_TYPES,
  AssistantQuerySchema,
  getAiProvider,
  MockAiProvider,
  GeminiAiProvider,
  OpenAiCompatibleProvider,
};
