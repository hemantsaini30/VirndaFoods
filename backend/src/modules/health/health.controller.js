// src/modules/health/health.controller.js
// req/res translation only — calls the service, shapes the HTTP response.

const { checkHealth } = require('./health.service');

async function getHealthStatus(req, res) {
  const result = await checkHealth();
  const statusCode = result.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(result);
}

module.exports = { getHealthStatus };
