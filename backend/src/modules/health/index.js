// src/modules/health/index.js
// Explicit public exports — this is the ONLY interface other modules may use
// to interact with the health module.

const { checkHealth } = require('./health.service');

module.exports = { checkHealth };
