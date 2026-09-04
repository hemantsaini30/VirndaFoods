// src/config/queues.js
//
// Central place where BullMQ Queue instances are created and exported.
// Individual job definitions/processors live in src/jobs/ — this file is
// just the registry so other modules can enqueue jobs without knowing
// connection details.
//
// Real business queues (abandoned-order cleanup, payment webhook retry,
// driver-location pruning) are added here in their respective later phases.
// For Phase 1 we only register the trivial health-ping demo queue, to prove
// the wiring works end-to-end.

const { Queue } = require('bullmq');
const redis = require('./redis');

const connection = redis;

const healthPingQueue = new Queue('health-ping', { connection });

module.exports = {
  connection,
  healthPingQueue,
};
