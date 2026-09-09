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

// Added Phase 5. A plain ConflictError's `code` is always the generic
// 'CONFLICT' — fine for "you already have an active application", but the
// cart's "you have items from a different restaurant" case needs to be
// distinguishable from any other 409 so the frontend can react to THIS
// specific situation (offer a "clear cart?" confirmation) rather than a
// generic error toast. Kept as its own small subclass rather than mutating
// a ConflictError instance's `.code` after construction, which would be
// easy to miss/forget at any given throw site.
class CartRestaurantConflictError extends AppError {
  constructor(message = 'Your cart contains items from a different restaurant.') {
    super(message, 409, 'CART_RESTAURANT_CONFLICT');
  }
}

// ── Added Phase 6 (idempotency + orders) ──────────────────────────────
//
// Both follow the exact same established pattern as CartRestaurantConflictError
// above: a small dedicated AppError subclass with a fixed statusCode/code,
// rather than constructing a generic ValidationError/ConflictError and
// hoping every throw site remembers to set the right .code by hand.

// The client omitted the Idempotency-Key header on an endpoint that
// requires one. Modeled as a 400 (VALIDATION-shaped — the request itself
// is malformed/incomplete), not a 409, since nothing has conflicted yet;
// the request just can't be safely processed as-is.
class IdempotencyKeyMissingError extends AppError {
  constructor(message = 'An Idempotency-Key header is required for this request.') {
    super(message, 400, 'IDEMPOTENCY_KEY_MISSING');
  }
}

// The client reused an Idempotency-Key it has used before, but this
// request's body doesn't match what that key was originally used for.
// This is a real client bug (same key, different payload) — deliberately
// NOT served from cache, since doing so would silently return a stale
// response for a request that was never actually made. 409, matching the
// project's convention that "conflicts with prior state" is a 409.
class IdempotencyKeyReusedError extends AppError {
  constructor(
    message = 'This Idempotency-Key was already used for a different request. Use a new key for a new request.'
  ) {
    super(message, 409, 'IDEMPOTENCY_KEY_REUSED');
  }
}

// Thrown when the concurrency guard in orders.service.js detects that the
// customer's cart changed between the moment it was read and the moment
// the transaction tried to clear it (see orders.service.js's
// createOrder() for the full explanation of why this can happen and what
// it means). This is NOT the same thing as "cart is empty" (a plain
// ConflictError, checked earlier) — this is specifically "your cart
// changed mid-request, so we backed out rather than risk creating an
// order that doesn't match what you actually have in your cart right
// now." 409, and the message tells the customer exactly what to do next.
class CartChangedDuringOrderError extends AppError {
  constructor(
    message = 'Your cart changed while we were placing your order. Please review your cart and try again.'
  ) {
    super(message, 409, 'CART_CHANGED_DURING_ORDER');
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
  IdempotencyKeyMissingError,
  IdempotencyKeyReusedError,
  CartChangedDuringOrderError,
};