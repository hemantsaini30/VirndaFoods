// src/config/redis.js
//
// Redis is used in this project for two SEPARATE things, introduced at
// different phases:
//   1. (This phase) As the backing store for BullMQ background jobs.
//   2. (A later, dedicated phase) As a cache for hot reads like restaurant
//      menus, using a cache-aside pattern. Do not add caching logic yet.
//
// One shared ioredis connection is exported here; BullMQ queues/workers reuse
// it via their own internal connection options rather than each opening a
// brand new socket.

const Redis = require('ioredis');
const env = require('./env');

const redis = new Redis(env.REDIS_URL, {
  // BullMQ requires this exact setting on any connection it manages,
  // otherwise it cannot correctly block/wait for jobs.
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Redis connection error:', err.message);
});

module.exports = redis;
