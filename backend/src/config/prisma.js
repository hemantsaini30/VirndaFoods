// src/config/prisma.js
//
// A single shared PrismaClient instance for the whole app. Creating a new
// PrismaClient per request would open a new connection pool each time, which
// exhausts Postgres's connection limit fast. Every module imports this file
// instead of instantiating its own client.

const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
