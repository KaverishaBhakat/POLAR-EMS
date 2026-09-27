/**
 * Gemini LLM Provider for POLAR-EMS AI Reasoning
 * 
 * Interacts with Google Gemini models (e.g. gemini-1.5-flash / gemini-1.5-pro)
 * using standard REST endpoints with Function Calling and strict schema validation.
 */

const BaseAiProvider = require('./base.provider');

class GeminiAiProvider extends BaseAiProvider {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
    this.model = options.model || process.env.AI_MODEL || 'gemini-1.5-flash';
    this.baseUrl = options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async generateResponse({ systemPrompt, messages, tools = [], temperature = 0.2 }) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured (set AI_API_KEY or GEMINI_API_KEY).');
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Map tools to Gemini function declarations
    const geminiTools = tools.length > 0 ? [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters || { type: 'OBJECT', properties: {} },
        })),
      },
    ] : undefined;

    // Convert messages to Gemini format
    const contents = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        const parts = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          msg.toolCalls.forEach((tc) => {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.arguments,
              },
            });
          });
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool' || msg.role === 'tool_result') {
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: msg.name || 'tool_response',
                response: typeof msg.content === 'object' ? msg.content : { content: msg.content },
              },
            },
          ],
        });
      }
    }

    const payload = {
      contents,
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      tools: geminiTools,
      generationConfig: {
        temperature,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let textContent = '';
    const toolCalls = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    return {
      text: textContent.trim(),
      toolCalls,
      finishReason: toolCalls.length > 0 ? 'tool_call' : 'stop',
    };
  }
}

module.exports = GeminiAiProvider;
