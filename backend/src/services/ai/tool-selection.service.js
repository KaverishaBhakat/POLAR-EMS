/**
 * POLAR-EMS Tool Selection & Deterministic Intent Routing Service
 * 
 * Classifies user questions into operational intents and selects allowed,
 * registered tools from the AI Tools Layer.
 */

const { INTENT_TYPES } = require('./schemas');
const { TOOL_REGISTRY, getToolsDiscoveryList } = require('../ai-tools');

class ToolSelectionService {
  /**
   * Classifies question intent deterministically based on domain semantics.
   * 
   * @param {string} query
   * @returns {Array<string>} List of detected intent categories
   */
  classifyIntent(query = '') {
    if (!query || typeof query !== 'string') return [INTENT_TYPES.GENERAL];

    const lower = query.toLowerCase();
    const intents = new Set();

    // 1. Historical Data
    if (
      lower.includes('last 24') ||
      lower.includes('history') ||
      lower.includes('historical') ||
      lower.includes('historically') ||
      lower.includes('past week') ||
      lower.includes('past month') ||
      lower.includes('past year') ||
      lower.includes('past') ||
      lower.includes('yesterday') ||
      lower.includes('trend over time') ||
      lower.includes('time series') ||
      lower.includes('climatology') ||
      lower.includes('weather history') ||
      lower.includes('recent weather history') ||
      lower.includes('what was the temperature') ||
      lower.includes('how cold was') ||
      lower.includes('how has') ||
      /\b(from|in)\s+(january|february|march|april|may|june|july|august|september|october|november|december|201[2-9]|202[0-9])\b/i.test(lower)
    ) {
      intents.add(INTENT_TYPES.HISTORICAL_DATA);
    }

    // 2. Weather Forecast
    if (
      lower.includes('forecast') ||
      lower.includes('next 24') ||
      lower.includes('next 48') ||
      lower.includes('tomorrow') ||
      lower.includes('will it get colder') ||
      lower.includes('temperature prediction') ||
      lower.includes('predict')
    ) {
      intents.add(INTENT_TYPES.FORECAST);
    }

    // 3. Live Telemetry
    if (
      (lower.includes('current') && (lower.includes('weather') || lower.includes('load') || lower.includes('energy') || lower.includes('battery') || lower.includes('soc') || lower.includes('solar') || lower.includes('wind') || lower.includes('renewable') || lower.includes('generator') || lower.includes('alarm') || lower.includes('alert') || lower.includes('temperature') || lower.includes('temp'))) ||
      lower.includes('right now') ||
      lower.includes('status right now') ||
      lower.includes('active alarms') ||
      lower.includes('active alerts') ||
      lower.includes('latest') ||
      lower.includes('how cold is') ||
      (lower.includes('what is the') && (lower.includes('weather') || lower.includes('temperature') || lower.includes('temp') || lower.includes('soc') || lower.includes('battery') || lower.includes('load') || lower.includes('renewable'))) ||
      (lower.includes('how much') && (lower.includes('renewable') || lower.includes('energy') || lower.includes('power') || lower.includes('solar') || lower.includes('wind')))
    ) {
      if (!intents.has(INTENT_TYPES.HISTORICAL_DATA) || lower.includes('current') || lower.includes('right now') || lower.includes('latest')) {
        intents.add(INTENT_TYPES.LIVE_TELEMETRY);
      }
    }

    // 4. Optimization
    if (
      lower.includes('dispatch') ||
      lower.includes('optimize') ||
      lower.includes('optimization') ||
      lower.includes('optimal schedule') ||
      lower.includes('unit commitment') ||
      lower.includes('minimize fuel') ||
      lower.includes('economic dispatch')
    ) {
      intents.add(INTENT_TYPES.OPTIMIZATION);
    }

    // 5. Resilience Simulation
    if (
      lower.includes('polar night') ||
      lower.includes('contingency') ||
      lower.includes('resilience') ||
      lower.includes('generator failure') ||
      lower.includes('low battery') ||
      lower.includes('severe blizzard') ||
      lower.includes('renewable drop') ||
      lower.includes('high demand') ||
      lower.includes('what happens if')
    ) {
      intents.add(INTENT_TYPES.RESILIENCE);
    }

    // 6. Analytics
    if (
      lower.includes('analytics') ||
      lower.includes('how much diesel fuel was saved') ||
      lower.includes('fuel savings') ||
      lower.includes('renewable penetration') ||
      lower.includes('consumption summary')
    ) {
      intents.add(INTENT_TYPES.ANALYTICS);
    }

    // 7. Knowledge / Conceptual Questions
    if (
      lower.includes('explain') ||
      lower.includes('how does') ||
      lower.includes('why is') ||
      lower.includes('architecture') ||
      lower.includes('specification') ||
      lower.includes('bess specification') ||
      lower.includes('microgrid design') ||
      lower.includes('life support hierarchy') ||
      lower.includes('role of') ||
      lower.includes('provenance') ||
      lower.includes('climatology vs')
    ) {
      intents.add(INTENT_TYPES.KNOWLEDGE);
    }

    // Handle Mixed Intent
    if (intents.size > 1) {
      return Array.from(intents);
    }

    if (intents.size === 1) {
      return Array.from(intents);
    }

    return [INTENT_TYPES.GENERAL];
  }

  /**
   * Returns registered tool definitions matching the query context.
   * By default, provides all 17 registered read-only tools to the reasoning loop.
   */
  getAllowedTools() {
    return getToolsDiscoveryList();
  }

  /**
   * Validates whether a tool requested by an LLM is permitted and registered.
   */
  isValidTool(toolName) {
    if (!toolName || typeof toolName !== 'string') return false;
    return Boolean(TOOL_REGISTRY[toolName.trim()]);
  }
}

module.exports = new ToolSelectionService();
