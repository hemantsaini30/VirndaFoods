// tests/health.test.js

const request = require('supertest');
const app = require('../src/app');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');
const redis = require('../src/config/redis');

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await disconnectPrisma();
  redis.disconnect();
});

describe('GET /api/v1/health', () => {
  it('returns 200 with database and redis connectivity true when everything is up', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.dependencies.database).toBe(true);
    expect(res.body.dependencies.redis).toBe(true);
    expect(res.body.timestamp).toEqual(expect.any(String));
  });
});

describe('server responds at all', () => {
  it('responds to a basic request without crashing', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBeLessThan(600);
  });
});
