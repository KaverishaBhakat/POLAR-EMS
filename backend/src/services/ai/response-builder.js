/**
 * POLAR-EMS Standardized Assistant Response Builder
 */

const provenanceService = require('./provenance');

class ResponseBuilder {
  /**
   * Constructs the final normalized JSON response structure.
   * 
   * @param {Object} params
   * @param {string} params.answer - Generated textual answer
   * @param {Object} params.station - Station object ({ code, name, id })
   * @param {Array<string>} params.intent - Classified intent types
   * @param {Array<Object>} params.evidence - Normalized evidence collection
   * @param {Array<string>} params.toolsUsed - List of tool names executed
   * @param {boolean} params.ragUsed - Whether RAG chunks were retrieved and used
   * @returns {Object} Structured API response payload
   */
  buildSuccessResponse({
    answer,
    station,
    intent = [],
    evidence = [],
    toolsUsed = [],
    ragUsed = false,
  }) {
    const provenanceList = provenanceService.extractProvenanceFromEvidence(evidence);

    // Sanitize station representation
    const stationMeta = station ? {
      code: station.code || 'MAITRI',
      name: station.name || 'Maitri Station',
    } : {
      code: 'MAITRI',
      name: 'Maitri Station',
    };

    return {
      success: true,
      answer: answer || 'No response generated.',
      station: stationMeta,
      intent: intent.length > 0 ? intent : ['GENERAL'],
      evidence,
      provenance: provenanceList,
      toolsUsed: Array.from(new Set(toolsUsed)),
      ragUsed: Boolean(ragUsed),
    };
  }
}

module.exports = new ResponseBuilder();
