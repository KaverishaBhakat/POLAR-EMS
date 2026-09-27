/**
 * Deterministic Mock LLM Provider for Unit & Integration Testing
 * 
 * Simulates intelligent reasoning, single/multi tool calls, and error conditions
 * without requiring real third-party API credentials or network requests.
 */

const BaseAiProvider = require('./base.provider');

class MockAiProvider extends BaseAiProvider {
  constructor(options = {}) {
    super();
    this.customHandler = options.customHandler || null;
    this.queuedResponses = options.queuedResponses ? [...options.queuedResponses] : [];
    this.callHistory = [];
  }

  /**
   * Sets a custom mock response handler or queue.
   */
  setQueuedResponses(responses) {
    this.queuedResponses = [...responses];
  }

  setCustomHandler(handler) {
    this.customHandler = handler;
  }

  reset() {
    this.queuedResponses = [];
    this.customHandler = null;
    this.callHistory = [];
  }

  async generateResponse({ systemPrompt, messages, tools = [], temperature = 0.2 }) {
    this.callHistory.push({ systemPrompt, messages, tools, temperature });

    // 1. Check custom handler
    if (typeof this.customHandler === 'function') {
      return await this.customHandler({ systemPrompt, messages, tools, temperature });
    }

    // 2. Check queued responses
    if (this.queuedResponses.length > 0) {
      const nextResp = this.queuedResponses.shift();
      if (nextResp instanceof Error) {
        throw nextResp;
      }
      return nextResp;
    }

    // 3. Default deterministic reasoning behavior based on message history
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const hasToolResults = messages.some((m) => m.role === 'tool' || m.role === 'tool_result');
    const stationMatch = lastUserMessage.match(/\b(maitri|bharati)\b/i);
    const stationId = stationMatch ? stationMatch[1].toUpperCase() : 'MAITRI';

    // If we just received tool results, synthesize a grounded final response
    if (hasToolResults) {
      const toolMsg = messages.filter((m) => m.role === 'tool' || m.role === 'tool_result');
      const synthesizedSummary = toolMsg
        .map((t) => {
          try {
            const parsed = typeof t.content === 'string' ? JSON.parse(t.content) : t.content;
            return parsed?.tool ? `[Tool: ${parsed.tool}, Provenance: ${parsed.provenance || 'N/A'}]` : '';
          } catch (e) {
            return '';
          }
        })
        .filter(Boolean)
        .join('; ');

      return {
        text: `Based on the verified operational telemetry and model evidence for ${stationId} ${synthesizedSummary ? `(${synthesizedSummary})` : ''}, the system is operating within safe operational parameters.`,
        toolCalls: [],
        finishReason: 'stop',
      };
    }

    const lower = lastUserMessage.toLowerCase();

    // Weather questions
    if (lower.includes('weather') && !lower.includes('forecast') && !lower.includes('tomorrow')) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_current_weather',
            arguments: { stationId },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Battery telemetry
    if (lower.includes('soc') || (lower.includes('battery') && (lower.includes('current') || lower.includes('what is') || lower.includes('state')))) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_current_battery',
            arguments: { stationId },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Current energy load
    if (lower.includes('load') || lower.includes('energy situation') || (lower.includes('energy') && lower.includes('current'))) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_current_energy',
            arguments: { stationId },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Current renewable
    if (lower.includes('renewable') && (lower.includes('current') || lower.includes('generation') || lower.includes('how much'))) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_current_renewable',
            arguments: { stationId },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Active alarms / alerts
    if (lower.includes('alarm') || lower.includes('alert') || lower.includes('warning')) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_current_alerts',
            arguments: { stationId },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Optimization / dispatch
    if (lower.includes('dispatch') || lower.includes('optimize') || lower.includes('optimal') || (lower.includes('schedule') && lower.includes('generator'))) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_optimization_dispatch',
            arguments: { stationId, horizonHours: 24 },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Weather forecast
    if (lower.includes('forecast') || ((lower.includes('next 24') || lower.includes('tomorrow') || lower.includes('colder')) && (lower.includes('weather') || lower.includes('temp') || lower.includes('cold') || !lower.includes('dispatch')))) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_weather_forecast',
            arguments: { stationId, horizonHours: 24 },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Resilience / Polar Night
    if (lower.includes('polar night') || lower.includes('contingency') || lower.includes('blizzard') || lower.includes('generator failure')) {
      let scenarioId = 'polar-night';
      if (lower.includes('generator failure')) scenarioId = 'generator-failure';
      if (lower.includes('blizzard')) scenarioId = 'severe-blizzard';
      if (lower.includes('low battery')) scenarioId = 'low-battery';

      return {
        text: '',
        toolCalls: [
          {
            name: 'run_resilience_scenario',
            arguments: { stationId, scenarioId, horizonHours: 24 },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Historical energy
    if (lower.includes('last 24 hours') && lower.includes('load')) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_energy_history',
            arguments: { stationId, limit: 24 },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Historical renewable
    if (lower.includes('last 24 hours') && (lower.includes('wind') || lower.includes('solar'))) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_renewable_history',
            arguments: { stationId, limit: 24 },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // Default direct answer (e.g. for pure RAG knowledge synthesis or general inquiry)
    return {
      text: `POLAR-EMS monitors and controls the polar microgrid at ${stationId}, integrating renewable generation, BESS storage, diesel backup, and critical life-support loads in accordance with Antarctic scientific mission requirements.`,
      toolCalls: [],
      finishReason: 'stop',
    };
  }
}

module.exports = MockAiProvider;
