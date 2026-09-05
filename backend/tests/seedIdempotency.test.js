// tests/seedIdempotency.test.js
const { execSync } = require('child_process');
const path = require('path');
const prisma = require('../src/config/prisma');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');

const backendRoot = path.join(__dirname, '..');

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await disconnectPrisma();
});

describe('prisma/seed.js admin seeding', () => {
  it('is idempotent — running it twice results in exactly one admin', async () => {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_NAME) {
      throw new Error(
        'ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME must be set in .env.test to run this test.'
      );
    }

    // Runs the real seed script as a child process, inheriting this
    // process's environment — which tests/setup/loadTestEnv.js has
    // already pointed at the test database and test admin credentials
    // by the time this file is imported. Runs it twice to prove the
    // "check if user already exists" guard actually prevents a duplicate.
    execSync('node prisma/seed.js', { cwd: backendRoot, env: process.env });
    execSync('node prisma/seed.js', { cwd: backendRoot, env: process.env });

    const admins = await prisma.user.findMany({
      where: { email: process.env.ADMIN_EMAIL, role: 'ADMIN' },
    });

    expect(admins).toHaveLength(1);
  });
});