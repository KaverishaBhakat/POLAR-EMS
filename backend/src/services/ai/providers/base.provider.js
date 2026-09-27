/**
 * Base LLM Provider Abstraction for POLAR-EMS AI Reasoning
 */

class BaseAiProvider {
  /**
   * Generates a normalized LLM response.
   * 
   * @param {Object} params
   * @param {string} params.systemPrompt - Hardened anti-hallucination system prompt
   * @param {Array<Object>} params.messages - Conversation message history
   * @param {Array<Object>} [params.tools] - Allowed registered tool definitions with JSON schemas
   * @param {number} [params.temperature=0.2] - Generation temperature (low for deterministic reasoning)
   * @returns {Promise<{ text: string, toolCalls: Array<{ name: string, arguments: Object }>, finishReason: 'stop'|'tool_call' }>}
   */
  async generateResponse(params) {
    throw new Error('generateResponse must be implemented by concrete LLM provider');
  }
}

module.exports = BaseAiProvider;
