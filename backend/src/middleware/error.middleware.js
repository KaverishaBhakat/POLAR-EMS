const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.code;
    details = err.details;
  } else if (err.name === 'ZodError') {
    statusCode = 422;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = 409;
    message = `Duplicate field value: ${err.meta?.target ? err.meta.target.join(', ') : 'unique field'}`;
    errorCode = 'DUPLICATE_RESOURCE';
  } else if (err.code === 'P2025') {
    // Prisma record not found
    statusCode = 404;
    message = 'Requested record not found in database';
    errorCode = 'RECORD_NOT_FOUND';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errorCode = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    errorCode = 'TOKEN_EXPIRED';
  } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
    errorCode = 'INVALID_JSON';
  } else if (err.message) {
    message = err.message;
  }

  // Log 500 errors
  if (statusCode >= 500) {
    console.error(`[ERROR 500] ${req.method} ${req.originalUrl}:`, err);
  }

  const responseBody = {
    success: false,
    message,
    error: {
      code: errorCode,
      ...(details ? { details } : {}),
      ...(!env.IS_PROD && err.stack ? { stack: err.stack } : {}),
    },
  };

  res.status(statusCode).json(responseBody);
};

module.exports = errorHandler;
