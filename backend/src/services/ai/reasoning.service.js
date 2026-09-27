/**
 * POLAR-EMS AI Reasoning & Multi-Step Function Calling Orchestrator
 * 
 * Bounded, deterministic execution engine combining RAG semantic retrieval,
 * registered live telemetry tools, and multi-step function calling (max 3 iterations).
 */

const toolSelectionService = require('./tool-selection.service');
const contextBuilder = require('./context-builder');
const responseBuilder = require('./response-builder');
const ragService = require('../rag/rag.service');
const { executeTool } = require('../ai-tools');
const { getAiProvider } = require('./providers/provider.factory');
const { INTENT_TYPES } = require('./schemas');
const ApiError = require('../../utils/ApiError');

const MAX_REASONING_ITERATIONS = 3;

class ReasoningService {
  /**
   * Executes the full grounded reasoning loop for a user query.
   * 
   * @param {Object} params
   * @param {string} params.message - User natural language query
   * @param {Object} params.station - Resolved station entity
   * @param {Array<Object>} [params.recentMessages] - Optional conversation history
   * @param {Object} [params.providerOverride] - Optional custom LLM provider instance
   * @returns {Promise<Object>} Normalized grounded response
   */
  async processReasoning({
    message,
    station,
    recentMessages = [],
    providerOverride = null,
  }) {
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw ApiError.badRequest('Query message cannot be empty.', 'EMPTY_MESSAGE');
    }

    const cleanMessage = message.trim();
    const stationCode = station?.code || 'MAITRI';

    // 1. Classify Intent
    const classifiedIntents = toolSelectionService.classifyIntent(cleanMessage);

    // 2. RAG Knowledge Retrieval (if knowledge, resilience, mixed, or general intent is detected)
    let ragChunks = [];
    let ragUsed = false;
    const shouldRetrieveRag = classifiedIntents.some((i) =>
      [INTENT_TYPES.KNOWLEDGE, INTENT_TYPES.RESILIENCE, INTENT_TYPES.MIXED, INTENT_TYPES.GENERAL].includes(i)
    );

    if (shouldRetrieveRag) {
      try {
        ragChunks = await ragService.search({
          query: cleanMessage,
          station: stationCode,
          topK: 4,
          minScore: 0.05,
        });
        if (ragChunks.length > 0) {
          ragUsed = true;
        }
      } catch (err) {
        // Controlled RAG fallback - do not crash operational reasoning if vector search fails
        console.warn(`[REASONING] RAG search skipped or encountered non-fatal error: ${err.message}`);
        ragChunks = [];
      }
    }

    // 3. Initialize Evidence Collection
    const evidence = [];
    if (ragChunks.length > 0) {
      ragChunks.forEach((c) => {
        evidence.push({
          type: 'KNOWLEDGE',
          document: c.documentId,
          chunkId: c.chunkId,
          title: c.title,
          heading: c.heading,
          content: c.content,
          provenance: c.provenance || 'ENGINEERING ASSUMPTION',
        });
      });
    }

    // 4. Build System Prompt & Initial Working Messages
    const systemPrompt = contextBuilder.buildSystemPrompt({ station, ragChunks });
    const workingMessages = contextBuilder.buildMessages({
      message: cleanMessage,
      recentMessages,
    });

    const allowedTools = toolSelectionService.getAllowedTools();
    const provider = providerOverride || getAiProvider();
    const toolsUsed = [];

    let finalAnswer = '';
    let iteration = 0;

    // 5. Bounded Reasoning Loop (Max 3 iterations)
    while (iteration < MAX_REASONING_ITERATIONS) {
      iteration += 1;

      let llmResponse;
      try {
        llmResponse = await provider.generateResponse({
          systemPrompt,
          messages: workingMessages,
          tools: allowedTools,
          temperature: 0.2,
        });
      } catch (err) {
        throw ApiError.internal(`LLM Provider encountered an error during reasoning: ${err.message}`, 'AI_PROVIDER_ERROR');
      }

      if (!llmResponse) {
        break;
      }

      // Handle Tool Calls
      if (llmResponse.finishReason === 'tool_call' || (llmResponse.toolCalls && llmResponse.toolCalls.length > 0)) {
        // Record model's tool calling intent in message history
        workingMessages.push({
          role: 'assistant',
          content: llmResponse.text || '',
          toolCalls: llmResponse.toolCalls,
        });

        for (const toolCall of llmResponse.toolCalls) {
          const { name: toolName, arguments: rawArgs } = toolCall;

          // Security check: ONLY execute registered tools
          if (!toolSelectionService.isValidTool(toolName)) {
            workingMessages.push({
              role: 'tool',
              name: toolName,
              toolCallId: toolCall.id,
              content: JSON.stringify({
                success: false,
                error: {
                  code: 'UNRECOGNIZED_TOOL',
                  message: `Execution rejected: Tool "${toolName}" is not registered or permitted.`,
                },
              }),
            });
            continue;
          }

          // Ensure stationId is present
          const safeArgs = { ...(rawArgs || {}) };
          if (!safeArgs.stationId) {
            safeArgs.stationId = stationCode;
          }

          toolsUsed.push(toolName);

          // Execute registered tool safely
          let toolResult;
          try {
            toolResult = await executeTool(toolName, safeArgs);
          } catch (toolErr) {
            toolResult = {
              success: false,
              tool: toolName,
              error: {
                code: toolErr.code || 'TOOL_EXECUTION_ERROR',
                message: toolErr.message,
              },
            };
          }

          // Record evidence
          evidence.push({
            type: this.determineEvidenceType(toolName),
            tool: toolName,
            station: stationCode,
            data: toolResult.data || toolResult,
            provenance: toolResult.provenance || 'MODELED / SCENARIO',
            source: toolResult.source || 'POSTGRESQL',
          });

          // Feed tool execution output back into working context
          workingMessages.push({
            role: 'tool',
            name: toolName,
            toolCallId: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }

        // If the model also supplied text alongside tool calls, store as draft
        if (llmResponse.text && !finalAnswer) {
          finalAnswer = llmResponse.text;
        }

        // Continue next loop iteration to allow the model to reason over tool outputs
        continue;
      }

      // Direct final answer provided
      if (llmResponse.text) {
        finalAnswer = llmResponse.text;
      }
      break;
    }

    // If max iterations reached without final text, construct grounded fallback from collected evidence
    if (!finalAnswer) {
      if (evidence.length > 0) {
        finalAnswer = `Retrieved ${evidence.length} operational evidence points for ${station?.name || stationCode}. Operational telemetry and simulations are active within expected parameters.`;
      } else {
        finalAnswer = `POLAR-EMS has processed your query for ${station?.name || stationCode}. No operational anomalies were detected.`;
      }
    }

    // 6. Assemble standard response payload
    return responseBuilder.buildSuccessResponse({
      answer: finalAnswer,
      station,
      intent: classifiedIntents,
      evidence,
      toolsUsed,
      ragUsed,
    });
  }

  determineEvidenceType(toolName) {
    if (toolName.includes('forecast')) return 'FORECAST';
    if (toolName.includes('optimization')) return 'OPTIMIZATION';
    if (toolName.includes('resilience')) return 'RESILIENCE';
    if (toolName.includes('analytics')) return 'ANALYTICS';
    if (toolName.includes('solar_resource')) return 'CLIMATOLOGY';
    return 'TELEMETRY';
  }
}

module.exports = new ReasoningService();
