// src/utils/errors.js

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Invalid request data.') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'This request conflicts with existing data.') {
    super(message, 409, 'CONFLICT');
  }
}

// New in Phase 5. A plain ConflictError's `code` is always the generic
// 'CONFLICT' — fine for things like "you already have an active
// application", but the cart's "you have items from a different
// restaurant" case needs to be distinguishable from any other 409 so the
// frontend can react to THIS specific situation (offer a "clear cart?"
// confirmation) rather than showing a generic error toast for every kind
// of conflict. Kept as its own small subclass rather than mutating a
// ConflictError instance's `.code` after construction, which would be
// easy to miss/forget at any given throw site.
class CartRestaurantConflictError extends AppError {
  constructor(message = 'Your cart contains items from a different restaurant.') {
    super(message, 409, 'CART_RESTAURANT_CONFLICT');
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  CartRestaurantConflictError,
};