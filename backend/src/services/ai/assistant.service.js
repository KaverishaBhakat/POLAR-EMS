/**
 * POLAR-EMS AI Assistant Service Entry Point
 * 
 * Coordinates station identifier resolution, schema validation, and reasoning orchestration.
 */

const reasoningService = require('./reasoning.service');
const stationService = require('../station.service');
const { AssistantQuerySchema } = require('./schemas');
const ApiError = require('../../utils/ApiError');

class AssistantService {
  /**
   * Processes a user question and returns a grounded, provenance-tagged operational answer.
   * 
   * @param {Object} params
   * @param {string} params.message - Natural language question
   * @param {string} [params.stationId] - Station code or UUID
   * @param {string} [params.conversationId] - Optional conversation tracking ID
   * @param {Array<Object>} [params.recentMessages] - Optional message history
   * @param {Object} [params.providerOverride] - Optional custom LLM provider for tests
   * @returns {Promise<Object>} Structured grounded response
   */
  async askAssistant(params = {}) {
    // 1. Validate Schema
    const validationResult = AssistantQuerySchema.safeParse(params);
    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];
      throw ApiError.badRequest(issue.message || 'Invalid assistant query payload.', 'VALIDATION_ERROR', validationResult.error.issues);
    }

    const { message, stationId, recentMessages, conversationId } = validationResult.data;

    // 2. Resolve Station Identifier
    let resolvedStation = null;
    let targetStationCode = stationId;

    if (!targetStationCode) {
      // Check for station mention in message
      if (/\bbharati\b/i.test(message)) {
        targetStationCode = 'BHARATI';
      } else {
        targetStationCode = 'MAITRI';
      }
    }

    try {
      resolvedStation = await stationService.getStationById(targetStationCode);
    } catch (err) {
      // If station lookup by code fails, fallback to Maitri default if available
      try {
        resolvedStation = await stationService.getStationById('MAITRI');
      } catch (fallbackErr) {
        throw ApiError.notFound(`Station '${targetStationCode}' was not found.`, 'STATION_NOT_FOUND');
      }
    }

    // 3. Delegate to Reasoning Engine
    const result = await reasoningService.processReasoning({
      message,
      station: resolvedStation,
      recentMessages,
      providerOverride: params.providerOverride || null,
    });

    if (conversationId) {
      result.conversationId = conversationId;
    }

    return result;
  }
}

module.exports = new AssistantService();
