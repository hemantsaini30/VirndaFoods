// src/modules/health/health.service.js
// All business logic for this module lives here.

const prisma = require('../../config/prisma');
const redis = require('../../config/redis');

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (_err) {
    return false;
  }
}

async function checkRedis() {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (_err) {
    return false;
  }
}

async function checkHealth() {
  const [dbConnected, redisConnected] = await Promise.all([checkDatabase(), checkRedis()]);

  const status = dbConnected && redisConnected ? 'ok' : 'degraded';

  return {
    status,
    timestamp: new Date().toISOString(),
    dependencies: {
      database: dbConnected,
      redis: redisConnected,
    },
  };
}

module.exports = { checkHealth };
