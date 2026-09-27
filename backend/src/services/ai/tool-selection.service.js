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

    // 1. Live Telemetry
    if (
      (lower.includes('current') && (lower.includes('weather') || lower.includes('load') || lower.includes('energy') || lower.includes('battery') || lower.includes('soc') || lower.includes('solar') || lower.includes('wind') || lower.includes('renewable') || lower.includes('generator') || lower.includes('alarm') || lower.includes('alert'))) ||
      lower.includes('right now') ||
      lower.includes('status right now') ||
      lower.includes('active alarms') ||
      lower.includes('active alerts')
    ) {
      intents.add(INTENT_TYPES.LIVE_TELEMETRY);
    }

    // 2. Historical Data
    if (
      lower.includes('last 24') ||
      lower.includes('history') ||
      lower.includes('historical') ||
      lower.includes('past week') ||
      lower.includes('yesterday') ||
      lower.includes('trend over time') ||
      lower.includes('time series') ||
      lower.includes('climatology')
    ) {
      intents.add(INTENT_TYPES.HISTORICAL_DATA);
    }

    // 3. Weather Forecast
    if (
      lower.includes('forecast') ||
      lower.includes('next 24') ||
      lower.includes('next 48') ||
      lower.includes('tomorrow') ||
      lower.includes('will it get colder') ||
      lower.includes('temperature prediction')
    ) {
      intents.add(INTENT_TYPES.FORECAST);
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
      lower.includes('what is') ||
      lower.includes('how does') ||
      lower.includes('why is') ||
      lower.includes('architecture') ||
      lower.includes('specification') ||
      lower.includes('bess') ||
      lower.includes('microgrid') ||
      lower.includes('life support') ||
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
