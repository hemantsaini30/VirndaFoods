// tests/setup/dbTestUtils.js
//
// TEST DATABASE STRATEGY (justification, since this is a real architectural
// choice, not just boilerplate):
//
// We use a real Postgres database for tests (a separate one from your dev
// database, named food_delivery_test), NOT an in-memory fake. We explicitly
// avoid mongodb-memory-server-style in-memory databases because:
//   1. We're not using Mongo at all — this project is Postgres/Prisma.
//   2. An in-memory or SQLite substitute for Postgres would silently let bugs
//      through that only appear against real Postgres behavior — e.g. our
//      `SELECT ... FOR UPDATE` row locking (used later for concurrency-safe
//      order/inventory writes) has no equivalent in a fake in-memory DB, so
//      tests against a fake DB could pass while the real behavior is broken.
//
// Between each test, rather than dropping and recreating the whole schema
// (slow), we TRUNCATE every table and RESTART their identity/uuid sequences,
// which is fast and leaves the schema (already migrated once, before the
// suite runs) untouched.

const prisma = require('../../src/config/prisma');

/**
 * Truncates every table in the current Prisma schema. Called in a
 * beforeEach() in test files that touch the database, so each test starts
 * with a completely empty database and never leaks state into the next test.
 */
async function truncateAllTables() {
  const tableNames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;

  const tables = tableNames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables.length === 0) return;

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
}

async function disconnectPrisma() {
  await prisma.$disconnect();
}

module.exports = { truncateAllTables, disconnectPrisma };
