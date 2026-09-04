// src/utils/errors.js
//
// "Operational errors" (things we EXPECT can happen — a user sends bad data,
// requests something that doesn't exist, isn't allowed to do something) vs
// "programmer errors" (bugs — a null reference, a typo, something we did NOT
// expect). Every error below is operational: it extends AppError, carries an
// HTTP status code and a machine-readable `code`, and is safe to describe to
// the client. Anything that is NOT an instance of AppError is treated by the
// error middleware as a programmer error: logged with its full stack trace,
// but the client only ever sees a generic "something went wrong" message —
// never leaking internal details.

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Invalid request data', details = undefined) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do this') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Request conflicts with current state') {
    super(message, 409, 'CONFLICT');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthError,
  ForbiddenError,
  ConflictError,
};
