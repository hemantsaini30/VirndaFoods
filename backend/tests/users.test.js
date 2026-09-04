// tests/users.test.js
const request = require('supertest');
const app = require('../src/app');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');
const { registerAndLogin } = require('./setup/authTestUtils');

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await disconnectPrisma();
});

describe('GET /api/v1/users/me', () => {
  it("returns only the caller's own profile, never another user's", async () => {
    const userA = await registerAndLogin({ name: 'User A' });
    const userB = await registerAndLogin({ name: 'User B' });

    const resA = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userA.accessToken}`);

    expect(resA.status).toBe(200);
    expect(resA.body.user.email).toBe(userA.email);
    expect(resA.body.user.email).not.toBe(userB.email);
    expect(resA.body.user.passwordHash).toBeUndefined();
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('updates name and phone for the authenticated user', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name', phone: '9999999999' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
    expect(res.body.user.phone).toBe('9999999999');
  });

  it('rejects an empty update body with 400', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('ignores an attempt to change role via the body', async () => {
    const { accessToken, user } = await registerAndLogin({ role: 'CUSTOMER' });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Still Customer', role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(user.role);
    expect(res.body.user.role).not.toBe('ADMIN');
  });

  it('rejects requests with no access token', async () => {
    const res = await request(app).patch('/api/v1/users/me').send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });
});

describe('authorize middleware (role check)', () => {
  it('a valid token for any role can reach a route open to "any"', async () => {
    const driver = await registerAndLogin({ role: 'DELIVERY_PARTNER' });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${driver.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('DELIVERY_PARTNER');
  });
});