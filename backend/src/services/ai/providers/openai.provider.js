/**
 * OpenAI-Compatible Provider for POLAR-EMS AI Reasoning
 * 
 * Works with OpenAI, OpenRouter, Groq, vLLM, Ollama, and Azure OpenAI
 * using standard Chat Completions with tool_calls.
 */

const BaseAiProvider = require('./base.provider');

class OpenAiCompatibleProvider extends BaseAiProvider {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    this.model = options.model || process.env.AI_MODEL || 'gpt-4o-mini';
    this.baseUrl = options.baseUrl || process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  }

  async generateResponse({ systemPrompt, messages, tools = [], temperature = 0.2 }) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured (set AI_API_KEY or OPENAI_API_KEY).');
    }

    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    // Map tools to OpenAI standard format
    const openAiTools = tools.length > 0 ? tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: 'object', properties: {} },
      },
    })) : undefined;

    // Build message list
    const formattedMessages = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') {
        formattedMessages.push({ role: msg.role, content: msg.content || '' });
      } else if (msg.role === 'tool' || msg.role === 'tool_result') {
        formattedMessages.push({
          role: 'tool',
          tool_call_id: msg.toolCallId || msg.name || 'call_1',
          name: msg.name,
          content: typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content),
        });
      }
    }

    const payload = {
      model: this.model,
      messages: formattedMessages,
      tools: openAiTools,
      temperature,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI-compatible provider error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message || {};

    const toolCalls = [];
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      for (const tc of message.tool_calls) {
        let args = {};
        try {
          args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        } catch (e) {
          args = {};
        }
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: args,
        });
      }
    }

    return {
      text: (message.content || '').trim(),
      toolCalls,
      finishReason: toolCalls.length > 0 ? 'tool_call' : 'stop',
    };
  }
}

module.exports = OpenAiCompatibleProvider;
