/**
 * POLAR-EMS AI Assistant Controller
 * 
 * Handles incoming natural language assistant queries with schema validation
 * and controlled error masking.
 */

const { assistantService } = require('../services/ai');
const ApiError = require('../utils/ApiError');

class AssistantController {
  /**
   * POST /api/ai/assistant
   * Query the grounded POLAR-EMS AI assistant.
   */
  async ask(req, res, next) {
    try {
      const { message, stationId, conversationId, recentMessages } = req.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        throw ApiError.badRequest('Field "message" is required and must be a non-empty string.', 'MISSING_MESSAGE');
      }

      if (message.length > 4000) {
        throw ApiError.badRequest('Message length exceeds maximum limit of 4000 characters.', 'MESSAGE_TOO_LONG');
      }

      const response = await assistantService.askAssistant({
        message,
        stationId,
        conversationId,
        recentMessages,
      });

      res.status(200).json(response);
    } catch (err) {
      if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
          success: false,
          error: {
            code: err.code || err.errorCode || 'ASSISTANT_ERROR',
            message: err.message,
            details: err.details || null,
          },
        });
      }

      // Safe fallback without leaking stack traces or credentials
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ASSISTANT_ERROR',
          message: 'An error occurred while generating the assistant response.',
        },
      });
    }
  }
}

module.exports = new AssistantController();
