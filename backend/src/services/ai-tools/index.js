/**
 * POLAR-EMS AI Tools Master Registry
 * 
 * Provides safe, deterministic, read-only operational tools for AI assistant grounding.
 * Every tool defines JSON Schema parameters, description, and strict provenance handling.
 */

const { getCurrentWeather, getWeatherHistory, getWeatherForecastTool } = require('./weather.tools');
const { getCurrentEnergy, getEnergyHistory, getCriticalLoads } = require('./energy.tools');
const { getCurrentRenewable, getRenewableHistory, getSolarResource, getHistoricalSolarGeneration } = require('./renewable.tools');
const { getCurrentBattery, getBatteryHistory } = require('./battery.tools');
const { getCurrentGenerators, getGeneratorHistory } = require('./generator.tools');
const { getCurrentAlerts } = require('./telemetry.tools');
const { getEnergyAnalytics } = require('./analytics.tools');
const { getOptimizationDispatch } = require('./optimization.tools');
const { runResilienceScenarioTool } = require('./resilience.tools');
const ApiError = require('../../utils/ApiError');

const TOOL_REGISTRY = {
  get_current_weather: {
    name: 'get_current_weather',
    description: 'Retrieves latest meteorological observations (temperature, pressure, humidity, wind speed, wind direction) for a polar station.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
      },
      required: ['stationId'],
    },
    execute: getCurrentWeather,
  },

  get_current_energy: {
    name: 'get_current_energy',
    description: 'Retrieves current electrical demand loads (total load, heating, water, comms, laboratory, flexible load) for a polar station.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
      },
      required: ['stationId'],
    },
    execute: getCurrentEnergy,
  },

  get_current_renewable: {
    name: 'get_current_renewable',
    description: 'Retrieves current renewable solar and wind power generation telemetry in kW for a polar station.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
      },
      required: ['stationId'],
    },
    execute: getCurrentRenewable,
  },

  get_current_battery: {
    name: 'get_current_battery',
    description: 'Retrieves current Battery Energy Storage System (BESS) state of charge (SOC), status, and charge/discharge power.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
      },
      required: ['stationId'],
    },
    execute: getCurrentBattery,
  },

  get_current_generators: {
    name: 'get_current_generators',
    description: 'Retrieves generator fleet status, power output, fuel levels, efficiency, and runtime hours for a polar station.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
      },
      required: ['stationId'],
    },
    execute: getCurrentGenerators,
  },

  get_current_alerts: {
    name: 'get_current_alerts',
    description: 'Retrieves active operational alerts, alarms, and severity levels for a polar research station.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI", "ALL") or UUID.',
        },
        severity: {
          type: 'string',
          description: 'Optional severity filter (e.g. "CRITICAL", "HIGH", "MEDIUM", "LOW", "ALL").',
        },
      },
    },
    execute: getCurrentAlerts,
  },

  get_weather_history: {
    name: 'get_weather_history',
    description: 'Retrieves bounded historical weather observations (temperature, pressure, wind speed, solar) within a date range.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        start: {
          type: 'string',
          description: 'ISO 8601 start timestamp (e.g. "2019-01-01T00:00:00Z").',
        },
        end: {
          type: 'string',
          description: 'ISO 8601 end timestamp (e.g. "2019-01-02T00:00:00Z").',
        },
        limit: {
          type: 'integer',
          description: 'Maximum records to return (1 to 500, default 24).',
        },
      },
      required: ['stationId'],
    },
    execute: getWeatherHistory,
  },

  get_energy_history: {
    name: 'get_energy_history',
    description: 'Retrieves bounded historical electrical demand load series (total and subsystem loads) within a date range.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        start: {
          type: 'string',
          description: 'ISO 8601 start timestamp.',
        },
        end: {
          type: 'string',
          description: 'ISO 8601 end timestamp.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum records to return (1 to 500, default 24).',
        },
      },
      required: ['stationId'],
    },
    execute: getEnergyHistory,
  },

  get_renewable_history: {
    name: 'get_renewable_history',
    description: 'Retrieves bounded historical solar and wind power generation time series in kW within a date range.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        start: {
          type: 'string',
          description: 'ISO 8601 start timestamp.',
        },
        end: {
          type: 'string',
          description: 'ISO 8601 end timestamp.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum records to return (1 to 500, default 24).',
        },
      },
      required: ['stationId'],
    },
    execute: getRenewableHistory,
  },

  get_battery_history: {
    name: 'get_battery_history',
    description: 'Retrieves bounded historical battery SOC, charge power, and discharge power readings.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        batteryId: {
          type: 'string',
          description: 'Optional battery UUID.',
        },
        start: {
          type: 'string',
          description: 'ISO 8601 start timestamp.',
        },
        end: {
          type: 'string',
          description: 'ISO 8601 end timestamp.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum records to return (1 to 500, default 24).',
        },
      },
      required: ['stationId'],
    },
    execute: getBatteryHistory,
  },

  get_generator_history: {
    name: 'get_generator_history',
    description: 'Retrieves bounded historical diesel generator power output, fuel consumption, and efficiency readings.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        generatorId: {
          type: 'string',
          description: 'Optional generator UUID.',
        },
        start: {
          type: 'string',
          description: 'ISO 8601 start timestamp.',
        },
        end: {
          type: 'string',
          description: 'ISO 8601 end timestamp.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum records to return (1 to 500, default 24).',
        },
      },
      required: ['stationId'],
    },
    execute: getGeneratorHistory,
  },

  get_solar_resource: {
    name: 'get_solar_resource',
    description: 'Retrieves long-term solar radiation climatology baseline (1985–2000 IMD global solar archives) by month, hour, or dataset summary.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: 'integer',
          description: 'Calendar month (1 to 12).',
        },
        hour: {
          type: 'integer',
          description: 'Diurnal hour (1 to 24).',
        },
        year: {
          type: 'integer',
          description: 'Optional climatology year (1985 to 2000).',
        },
      },
    },
    execute: getSolarResource,
  },

  get_historical_solar_generation: {
    name: 'get_historical_solar_generation',
    description: 'Retrieves modeled 8,760 hourly solar PV generation time series (modeled from meteorological timestamps and climatological solar priors).',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        start: {
          type: 'string',
          description: 'ISO 8601 start timestamp.',
        },
        end: {
          type: 'string',
          description: 'ISO 8601 end timestamp.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum records to return (1 to 500, default 24).',
        },
      },
      required: ['stationId'],
    },
    execute: getHistoricalSolarGeneration,
  },

  get_energy_analytics: {
    name: 'get_energy_analytics',
    description: 'Retrieves summarized energy consumption, fuel savings, renewable penetration, peak loads, and generator efficiency metrics.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        range: {
          type: 'string',
          description: 'Time window preset (e.g. "7d", "30d", "90d").',
        },
        start: {
          type: 'string',
          description: 'Optional ISO 8601 start timestamp.',
        },
        end: {
          type: 'string',
          description: 'Optional ISO 8601 end timestamp.',
        },
      },
      required: ['stationId'],
    },
    execute: getEnergyAnalytics,
  },

  get_weather_forecast: {
    name: 'get_weather_forecast',
    description: 'Retrieves 24-hour or 48-hour ambient temperature predictions from the trained HistGradientBoostingRegressor ML model.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        horizonHours: {
          type: 'integer',
          description: 'Forecast horizon in hours (24 or 48).',
        },
      },
      required: ['stationId'],
    },
    execute: getWeatherForecastTool,
  },

  get_optimization_dispatch: {
    name: 'get_optimization_dispatch',
    description: 'Retrieves 24-hour lookahead optimal generator unit commitment and battery economic dispatch schedule from Google OR-Tools MILP solver.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        horizonHours: {
          type: 'integer',
          description: 'Lookahead horizon in hours (24).',
        },
      },
      required: ['stationId'],
    },
    execute: getOptimizationDispatch,
  },

  run_resilience_scenario: {
    name: 'run_resilience_scenario',
    description: 'Executes a registered what-if resilience contingency simulation (e.g. "polar-night", "generator-failure", "low-battery", "severe-blizzard", "renewable-drop", "high-demand").',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
        scenarioId: {
          type: 'string',
          description: 'Registered contingency scenario identifier (e.g. "polar-night", "generator-failure", "low-battery", "renewable-drop", "severe-blizzard", "high-demand").',
        },
        horizonHours: {
          type: 'integer',
          description: 'Simulation horizon hours (default 24).',
        },
        initialSoc: {
          type: 'number',
          description: 'Initial battery state of charge percentage (default 75.0%).',
        },
      },
      required: ['stationId', 'scenarioId'],
    },
    execute: runResilienceScenarioTool,
  },

  get_critical_loads: {
    name: 'get_critical_loads',
    description: 'Retrieves configured critical life-support circuits, priorities (Priority 1 = Life Support, Priority 2 = Comms/Heating, Priority 3 = Labs), and power ratings.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        stationId: {
          type: 'string',
          description: 'Station identifier code (e.g. "MAITRI", "BHARATI") or UUID.',
        },
      },
      required: ['stationId'],
    },
    execute: getCriticalLoads,
  },
};

/**
 * Returns discovery metadata for all registered tools.
 */
function getToolsDiscoveryList() {
  return Object.values(TOOL_REGISTRY).map((t) => ({
    name: t.name,
    description: t.description,
    readOnly: t.readOnly,
    parameters: t.parameters,
  }));
}

/**
 * Safely executes a registered tool by name with arguments.
 */
async function executeTool(toolName, rawArgs = {}) {
  if (!toolName || typeof toolName !== 'string') {
    throw ApiError.badRequest('Tool name must be a non-empty string.', 'MISSING_TOOL_NAME');
  }

  const cleanToolName = toolName.trim();
  const toolEntry = TOOL_REGISTRY[cleanToolName];

  if (!toolEntry) {
    throw ApiError.badRequest(
      `Tool "${cleanToolName}" is not recognized or not registered. Available tools: ${Object.keys(TOOL_REGISTRY).join(', ')}`,
      'UNRECOGNIZED_TOOL'
    );
  }

  // Execute registered tool
  return await toolEntry.execute(rawArgs);
}

module.exports = {
  TOOL_REGISTRY,
  getToolsDiscoveryList,
  executeTool,
  getCurrentWeather,
  getCurrentEnergy,
  getCurrentRenewable,
  getCurrentBattery,
  getCurrentGenerators,
  getCurrentAlerts,
  getWeatherHistory,
  getEnergyHistory,
  getRenewableHistory,
  getBatteryHistory,
  getGeneratorHistory,
  getSolarResource,
  getHistoricalSolarGeneration,
  getEnergyAnalytics,
  getWeatherForecastTool,
  getOptimizationDispatch,
  runResilienceScenarioTool,
  getCriticalLoads,
};
