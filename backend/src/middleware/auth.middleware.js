const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/database');

/**
 * Verifies JWT token and sets req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication required. Missing Bearer token.', 'AUTH_TOKEN_MISSING'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(ApiError.unauthorized('Bearer token is empty.', 'AUTH_TOKEN_INVALID'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return next(ApiError.unauthorized('Invalid token payload.', 'AUTH_TOKEN_INVALID'));
    }

    // Lookup user in DB to guarantee user exists and account wasn't deleted/changed
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return next(ApiError.unauthorized('User associated with token no longer exists.', 'AUTH_USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restricts access to specified roles
 * @param  {...string} roles - Allowed roles, e.g. 'ADMIN', 'OPERATOR'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated.', 'UNAUTHENTICATED'));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Forbidden: Insufficient privileges. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
