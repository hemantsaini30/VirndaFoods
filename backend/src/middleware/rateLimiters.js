// src/middleware/rateLimiters.js
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Stricter than any general API limiter: login/register are the endpoints
 * attackers actually want to hammer (credential stuffing, account
 * enumeration), so they get a tighter window than the rest of the API.
 *
 * Skipped entirely in test env: our test suite runs many sequential
 * register/login calls against a shared in-memory limiter store, which
 * would otherwise make later tests fail with 429s that have nothing to do
 * with what's actually being tested.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please try again in a few minutes.',
        requestId: req.id || req.requestId || undefined,
      },
    });
  },
});

module.exports = { authLimiter };