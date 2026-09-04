// src/middleware/errorHandler.js
//
// Every error response in this entire API — from Phase 1 through the final
// phase — has this exact shape:
//   { error: { code, message, requestId } }
// Every later phase's tests assume this. Do not change it without updating
// every module that relies on it.

const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      requestId: req.id,
    },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const requestId = req.id;

  if (err instanceof AppError) {
    // Operational error: expected, safe to describe to the client.
    logger.warn(
      { requestId, code: err.code, statusCode: err.statusCode },
      `Operational error: ${err.message}`,
    );
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
      },
    });
  }

  // Programmer error / unexpected failure: log full detail server-side,
  // but never leak internals (stack trace, DB error text) to the client.
  logger.error({ requestId, err }, `Unexpected error: ${err.message}`);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong. Please try again.',
      requestId,
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
