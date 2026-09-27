/**
 * AI Tools API Controller
 * 
 * Provides HTTP endpoints for tool discovery and safe server-side tool execution.
 */

const { getToolsDiscoveryList, executeTool } = require('../services/ai-tools');
const ApiError = require('../utils/ApiError');

class AiToolsController {
  /**
   * GET /api/ai/tools
   * Lists discovery metadata and JSON schema parameters for all registered tools.
   */
  async listTools(req, res, next) {
    try {
      const tools = getToolsDiscoveryList();
      res.status(200).json({
        success: true,
        count: tools.length,
        tools,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/tools/execute
   * Safely executes a registered tool with supplied arguments.
   */
  async execute(req, res, next) {
    try {
      const { tool, arguments: args } = req.body || {};

      if (!tool || typeof tool !== 'string' || !tool.trim()) {
        throw ApiError.badRequest('Field "tool" is required in request body.', 'MISSING_TOOL_NAME');
      }

      const result = await executeTool(tool.trim(), args || {});

      res.status(200).json(result);
    } catch (err) {
      // Controlled error responses without leaking credentials or stack traces
      if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
          success: false,
          tool: req.body?.tool || 'unknown',
          error: {
            code: err.code || err.errorCode || 'TOOL_EXECUTION_ERROR',
            message: err.message,
          },
        });
      }

      res.status(400).json({
        success: false,
        tool: req.body?.tool || 'unknown',
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: err.message || 'Tool execution encountered an unexpected error.',
        },
      });
    }
  }
}

module.exports = new AiToolsController();
