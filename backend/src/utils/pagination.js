/**
 * Parses pagination query parameters
 * @param {Object} query - Express req.query
 * @param {number} defaultLimit - default page size (default 50)
 * @param {number} maxLimit - maximum allowed page size (default 500)
 */
const parsePagination = (query, defaultLimit = 50, maxLimit = 500) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Builds standard pagination response metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
