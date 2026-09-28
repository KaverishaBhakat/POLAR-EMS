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
    const systemStationMatch = systemPrompt ? systemPrompt.match(/code:\s*([A-Z0-9_-]+)/i) : null;
    const msgStationMatch = lastUserMessage.match(/\b(maitri|bharati)\b/i);
    const stationId = msgStationMatch
      ? msgStationMatch[1].toUpperCase()
      : (systemStationMatch ? systemStationMatch[1].toUpperCase() : 'MAITRI');

    // If we just received tool results, synthesize a grounded final response
    if (hasToolResults) {
      const toolMsg = messages.filter((m) => m.role === 'tool' || m.role === 'tool_result');
      const toolOutputs = toolMsg.map((t) => {
        try {
          return typeof t.content === 'string' ? JSON.parse(t.content) : t.content;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      const firstTool = toolOutputs[0];
      if (firstTool) {
        if (firstTool.tool === 'get_current_weather' && firstTool.success && firstTool.data) {
          const d = firstTool.data;
          const temp = d.temperature != null ? `${d.temperature}°C` : 'N/A';
          const wind = d.windSpeed != null ? `${d.windSpeed} m/s` : 'N/A';
          const press = d.pressure != null ? `${d.pressure} hPa` : 'N/A';
          const hum = d.humidity != null ? `${d.humidity}%` : 'N/A';
          return {
            text: `At ${firstTool.station?.name || stationId}, the latest measured weather observation records an ambient temperature of ${temp}, wind speed of ${wind}, atmospheric pressure of ${press}, and relative humidity of ${hum} (Data Provenance: ${firstTool.provenance || 'REAL / MEASURED'}).`,
            toolCalls: [],
            finishReason: 'stop',
          };
        }

        if (firstTool.tool === 'get_weather_history' && firstTool.success && Array.isArray(firstTool.data)) {
          const count = firstTool.count || firstTool.data.length || 0;
          const start = firstTool.range?.start ? firstTool.range.start.split('T')[0] : '';
          const end = firstTool.range?.end ? firstTool.range.end.split('T')[0] : '';
          const rangeStr = start && end ? ` between ${start} and ${end}` : '';
          const temps = firstTool.data.map((r) => r.temperature).filter((t) => t != null);
          const tempSummary = temps.length > 0 ? ` with temperatures ranging from ${Math.min(...temps)}°C to ${Math.max(...temps)}°C` : '';
          return {
            text: `Retrieved ${count} historical weather observation records for ${firstTool.station?.name || stationId}${rangeStr}${tempSummary} (Data Provenance: ${firstTool.provenance || 'REAL / MEASURED'}).`,
            toolCalls: [],
            finishReason: 'stop',
          };
        }

        if (firstTool.tool === 'get_current_battery') {
          if (!firstTool.success || firstTool.error) {
            return {
              text: `Measured battery storage telemetry (BESS SOC) is currently UNAVAILABLE for ${firstTool.station?.name || stationId}. Physical electrical telemetry and battery sensors are not provisioned for this station.`,
              toolCalls: [],
              finishReason: 'stop',
            };
          }
          return {
            text: `At ${firstTool.station?.name || stationId}, the current Battery Energy Storage System (BESS) SOC is ${firstTool.data?.currentSOCPercent ?? 0}% with operating status ${firstTool.data?.status || 'IDLE'} (Data Provenance: ${firstTool.provenance || 'MODELED / SCENARIO'}).`,
            toolCalls: [],
            finishReason: 'stop',
          };
        }

        if (firstTool.tool === 'get_current_renewable') {
          if (!firstTool.success || firstTool.error) {
            return {
              text: `Measured renewable generation telemetry is currently UNAVAILABLE for ${firstTool.station?.name || stationId}. Solar and wind generation telemetry streams are not provisioned for this station.`,
              toolCalls: [],
              finishReason: 'stop',
            };
          }
          return {
            text: `At ${firstTool.station?.name || stationId}, current renewable generation is ${firstTool.data?.totalRenewableKW ?? 0} kW (${firstTool.data?.solarPowerKW ?? 0} kW solar PV, ${firstTool.data?.windPowerKW ?? 0} kW wind) (Data Provenance: ${firstTool.provenance || 'MODELED / SCENARIO'}).`,
            toolCalls: [],
            finishReason: 'stop',
          };
        }

        if (firstTool.tool === 'run_resilience_scenario') {
          return {
            text: `Under the ${firstTool.scenarioId || 'polar-night'} resilience scenario for ${firstTool.station?.name || stationId}, solar PV generation is 0 kW due to continuous Antarctic darkness. Critical life-support loads (Priority 1: life support and heating) are maintained through battery storage discharge and diesel generator backup dispatch. Note: This analysis is derived from the POLAR-EMS MODEL / SCENARIO simulation and does NOT represent measured ${firstTool.station?.name || stationId} electrical telemetry.`,
            toolCalls: [],
            finishReason: 'stop',
          };
        }

        if (firstTool.tool === 'get_weather_forecast') {
          return {
            text: `The ML model (HistGradientBoostingRegressor) predicts a 24-hour ambient temperature trend for ${firstTool.station?.name || stationId} (Data Provenance: ${firstTool.provenance || 'MODELED / SCENARIO'}).`,
            toolCalls: [],
            finishReason: 'stop',
          };
        }

        if (firstTool.tool === 'get_optimization_dispatch') {
          return {
            text: `Google OR-Tools MILP optimization completed for ${firstTool.station?.name || stationId} across a 24-hour horizon. Estimated fuel savings are ${firstTool.metrics?.fuelSavedPercent || 21.9}% with 100% critical load reliability (Data Provenance: ${firstTool.provenance || 'OPTIMIZATION'}).`,
            toolCalls: [],
            finishReason: 'stop',
          };
        }
      }

      // Default fallback when tool results exist
      return {
        text: `Based on the verified operational telemetry and model evidence for ${stationId}, the system is operating within safe operational parameters.`,
        toolCalls: [],
        finishReason: 'stop',
      };
    }

    const lower = lastUserMessage.toLowerCase();

    const isHistorical = (
      lower.includes('history') ||
      lower.includes('historical') ||
      lower.includes('historically') ||
      lower.includes('yesterday') ||
      lower.includes('past') ||
      lower.includes('trend over time') ||
      lower.includes('time series') ||
      lower.includes('what was the temperature') ||
      lower.includes('how has') ||
      /\b(from|in)\s+(january|february|march|april|may|june|july|august|september|october|november|december|201[2-9]|202[0-9])\b/i.test(lower)
    );

    const isForecast = (
      lower.includes('forecast') ||
      lower.includes('tomorrow') ||
      lower.includes('next 24') ||
      lower.includes('next 48') ||
      lower.includes('will it get colder') ||
      lower.includes('prediction') ||
      lower.includes('predict')
    );

    // 1. Historical weather questions -> get_weather_history
    if (isHistorical && (lower.includes('weather') || lower.includes('temp') || lower.includes('cold') || lower.includes('temperature') || lower.includes('observation') || lower.includes('climate'))) {
      return {
        text: '',
        toolCalls: [
          {
            name: 'get_weather_history',
            arguments: { stationId, limit: 24 },
          },
        ],
        finishReason: 'tool_call',
      };
    }

    // 2. Weather forecast -> get_weather_forecast
    if (isForecast && (lower.includes('weather') || lower.includes('temp') || lower.includes('cold') || lower.includes('temperature') || !lower.includes('dispatch'))) {
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

    // 3. Current weather questions -> get_current_weather
    if (
      (lower.includes('weather') || lower.includes('temp') || lower.includes('cold') || lower.includes('temperature')) &&
      !isHistorical &&
      !isForecast
    ) {
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

    // 4. Optimization / dispatch
    if (lower.includes('dispatch') || lower.includes('optimize') || lower.includes('optimization') || lower.includes('optimal') || (lower.includes('schedule') && lower.includes('generator'))) {
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

    // 5. Resilience / Polar Night
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

    // 6. Battery telemetry
    if (lower.includes('soc') || lower.includes('battery')) {
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

    // 7. Current energy load
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

    // 8. Current renewable
    if (lower.includes('renewable') || (lower.includes('solar') && lower.includes('generating')) || (lower.includes('wind') && lower.includes('generating'))) {
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

    // 9. Active alarms / alerts
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

    // 10. Historical energy
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

    // 11. Historical renewable
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
