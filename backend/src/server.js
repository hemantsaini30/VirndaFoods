// src/server.js
//
// This is the only file that actually starts the server (app.js just builds
// the Express app; this file boots it). It also implements "graceful
// shutdown": what is that?
//
// When you stop the server (Ctrl+C locally, or a deployment restarting it in
// production), the operating system sends a signal (SIGINT for Ctrl+C,
// SIGTERM for most deployment platforms). Without handling this, the process
// dies IMMEDIATELY — any in-flight HTTP request gets cut off mid-response,
// any database connection is dropped uncleanly, and any BullMQ job that's
// halfway through processing is abandoned. Graceful shutdown means: stop
// accepting NEW connections, let in-flight work finish (or finish shortly),
// then close the database pool, Redis connection, and job workers cleanly,
// and only then actually exit.

const http = require('http');
const env = require('./config/env');
const app = require('./app');
const prisma = require('./config/prisma');
const redis = require('./config/redis');
const { attachSocketServer } = require('./sockets');
const { createHealthPingWorker } = require('./jobs/healthPing.job');
const { logger } = require('./utils/logger');

const server = http.createServer(app);
attachSocketServer(server);

const healthPingWorker = createHealthPingWorker();

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, `Server listening on port ${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutdown signal received, closing server gracefully...');

  server.close(async () => {
    logger.info('HTTP server closed (no longer accepting new connections)');

    try {
      await healthPingWorker.close();
      logger.info('BullMQ worker closed');

      await prisma.$disconnect();
      logger.info('Prisma disconnected');

      redis.disconnect();
      logger.info('Redis disconnected');

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });

  // Safety net: if something hangs and shutdown doesn't complete in time,
  // force-exit rather than let the process hang forever.
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
