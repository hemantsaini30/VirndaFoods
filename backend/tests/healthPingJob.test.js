// tests/healthPingJob.test.js
//
// Proves the BullMQ wiring works end-to-end: enqueue a job onto the
// health-ping queue, let a real worker (backed by the real test Redis)
// process it, and confirm it completed successfully.

const { QueueEvents } = require('bullmq');
const { healthPingQueue, connection } = require('../src/config/queues');
const { createHealthPingWorker } = require('../src/jobs/healthPing.job');

describe('health-ping BullMQ job', () => {
  let worker;
  let queueEvents;

  beforeAll(async () => {
    worker = createHealthPingWorker();
    // QueueEvents opens its own Redis connection (separate from the one
    // BullMQ uses to add/process jobs) so it can listen for completion
    // events. We create exactly one instance here and close it in
    // afterAll — creating one per test and never closing it is what leaves
    // a dangling connection open, which is why Jest previously warned
    // "did not exit one second after the test run completed."
    queueEvents = new QueueEvents('health-ping', { connection });
    await queueEvents.waitUntilReady();
  });

  afterAll(async () => {
    await worker.close();
    await queueEvents.close();
    await healthPingQueue.close();
    connection.disconnect();
  });

  it('enqueues and processes successfully', async () => {
    const job = await healthPingQueue.add('ping', { source: 'test-suite' });

    const result = await job.waitUntilFinished(queueEvents, 10000);

    expect(result.pinged).toBe(true);
    expect(result.receivedAt).toEqual(expect.any(String));
  });
});