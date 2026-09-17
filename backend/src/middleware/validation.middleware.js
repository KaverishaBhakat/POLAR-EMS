const ApiError = require('../utils/ApiError');

/**
 * Middleware generator for Zod schema validation
 * @param {Object} schemas - Object containing optional body, query, and params Zod schemas
 * @param {import('zod').ZodSchema} [schemas.body]
 * @param {import('zod').ZodSchema} [schemas.query]
 * @param {import('zod').ZodSchema} [schemas.params]
 */
const validate = (schemas) => async (req, res, next) => {
  try {
    if (schemas.body) {
      req.body = await schemas.body.parseAsync(req.body);
    }
    if (schemas.query) {
      req.query = await schemas.query.parseAsync(req.query);
    }
    if (schemas.params) {
      req.params = await schemas.params.parseAsync(req.params);
    }
    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      const details = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(ApiError.unprocessable('Validation failed on request inputs', 'VALIDATION_ERROR', details));
    }
    next(error);
  }
};

module.exports = validate;
