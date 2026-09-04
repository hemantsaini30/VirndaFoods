// src/middleware/authorize.js
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * RBAC middleware. Must run after `authenticate`.
 * Usage: router.get('/admin-only', authenticate, authorize('ADMIN'), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication is required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }
    next();
  };
}

module.exports = authorize;