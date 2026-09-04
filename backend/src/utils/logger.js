// src/utils/logger.js
//
// What's a "request ID"? Every incoming HTTP request gets a random unique ID
// the moment it arrives. Every log line produced while handling that request
// includes the same ID. So if a customer says "my order failed at 3:04pm,"
// you can grep your logs for one request ID and see every single log line
// from that one request, in order — instead of guessing which lines out of
// thousands belong to that one request.
//
// We use Node's built-in AsyncLocalStorage to carry the request ID through
// any function call within a request's lifetime, WITHOUT having to manually
// pass a `requestId` parameter into every single function. pino-http (wired
// up in app.js) generates the ID per-request; this module exposes a
// getRequestId() helper so deeply-nested service code (e.g. inside a
// try/catch three layers into a service function) can still log with the
// correct ID attached, without threading it through every function signature.

const pino = require('pino');
const { AsyncLocalStorage } = require('async_hooks');
const env = require('../config/env');

const asyncLocalStorage = new AsyncLocalStorage();

const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  // Structured JSON output — every log line is a JSON object with consistent
  // fields, which is what lets log aggregation tools (or just `grep`/`jq`)
  // query logs reliably instead of parsing free-text sentences.
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

function runWithRequestId(requestId, fn) {
  return asyncLocalStorage.run({ requestId }, fn);
}

function getRequestId() {
  const store = asyncLocalStorage.getStore();
  return store ? store.requestId : undefined;
}

/**
 * Returns a child logger with the current request ID (if any) attached to
 * every log line automatically.
 */
function getContextLogger() {
  const requestId = getRequestId();
  return requestId ? logger.child({ requestId }) : logger;
}

module.exports = {
  logger,
  runWithRequestId,
  getRequestId,
  getContextLogger,
};
