// src/jobs/healthPing.job.js
//
// A trivial, non-business demonstration job that proves BullMQ end-to-end
// wiring works: something can enqueue a job, a worker picks it up, processes
// it, and we can observe that it succeeded. Real business jobs (abandoned-
// order cleanup, payment webhook retry, driver-location pruning) are added
// in their own later phases as separate files in this same folder.

const { Worker } = require('bullmq');
const { connection } = require('../config/queues');
const { logger } = require('../utils/logger');

async function processHealthPing(job) {
  logger.info({ jobId: job.id, data: job.data }, 'Processing health-ping job');
  return { pinged: true, receivedAt: new Date().toISOString() };
}

function createHealthPingWorker() {
  const worker = new Worker('health-ping', processHealthPing, { connection });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'health-ping job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'health-ping job failed');
  });

  return worker;
}

module.exports = { createHealthPingWorker, processHealthPing };
