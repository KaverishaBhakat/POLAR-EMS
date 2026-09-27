/**
 * POLAR-EMS AI Reasoning Layer Schemas & Intent Definitions
 */

const { z } = require('zod');

const INTENT_TYPES = {
  KNOWLEDGE: 'KNOWLEDGE',
  LIVE_TELEMETRY: 'LIVE_TELEMETRY',
  HISTORICAL_DATA: 'HISTORICAL_DATA',
  FORECAST: 'FORECAST',
  OPTIMIZATION: 'OPTIMIZATION',
  RESILIENCE: 'RESILIENCE',
  ANALYTICS: 'ANALYTICS',
  MIXED: 'MIXED',
  GENERAL: 'GENERAL',
};

const PROVENANCE_TYPES = {
  REAL_MEASURED: 'REAL / MEASURED',
  REAL_CLIMATOLOGY: 'REAL CLIMATOLOGY',
  MODELED_SCENARIO: 'MODELED / SCENARIO',
  ENGINEERING_ASSUMPTION: 'ENGINEERING ASSUMPTION',
  OPTIMIZATION: 'OPTIMIZATION',
  UNAVAILABLE: 'UNAVAILABLE',
};

const AssistantQuerySchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(4000, 'Message cannot exceed 4000 characters'),
  stationId: z.string().trim().optional(),
  conversationId: z.string().trim().optional(),
  recentMessages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system', 'tool']),
      content: z.string().max(4000),
    })
  ).max(10, 'Maximum 10 recent messages allowed').optional(),
});

module.exports = {
  INTENT_TYPES,
  PROVENANCE_TYPES,
  AssistantQuerySchema,
};
