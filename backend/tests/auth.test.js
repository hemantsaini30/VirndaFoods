// tests/auth.test.js
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');
const { registerAndLogin } = require('./setup/authTestUtils');

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await disconnectPrisma();
});

describe('POST /api/v1/auth/register', () => {
  it('registers a new customer successfully', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'jane@example.com',
      password: 'Password123',
      name: 'Jane Doe',
      role: 'CUSTOMER',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('jane@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'dupe@example.com',
      password: 'Password123',
      name: 'First',
      role: 'CUSTOMER',
    });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'dupe@example.com',
      password: 'Password123',
      name: 'Second',
      role: 'CUSTOMER',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects a weak password with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'weak@example.com',
      password: 'short',
      name: 'Weak Pw',
      role: 'CUSTOMER',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an attempt to self-register as ADMIN', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'wannabe-admin@example.com',
      password: 'Password123',
      name: 'Sneaky',
      role: 'ADMIN',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials and sets a refresh cookie', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'login@example.com',
      password: 'Password123',
      name: 'Login Test',
      role: 'CUSTOMER',
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'Password123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('login@example.com');
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('rejects a wrong password with 401', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'wrongpw@example.com',
      password: 'Password123',
      name: 'WrongPw',
      role: 'CUSTOMER',
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'wrongpw@example.com', password: 'NotThePassword1' });

    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doesnotexist@example.com', password: 'Password123' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('issues a new access token given a valid refresh cookie', async () => {
    const { refreshCookie } = await registerAndLogin();

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('rejects a missing refresh cookie with 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid/garbage refresh token with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('rejects reuse of an already-rotated (old) refresh token', async () => {
    const { refreshCookie } = await registerAndLogin();

    // First refresh: rotates the token, old one is now revoked.
    await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);

    // Reusing the original cookie should now fail.
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    const { refreshCookie } = await registerAndLogin();

    const logoutRes = await request(app).post('/api/v1/auth/logout').set('Cookie', refreshCookie);
    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(refreshRes.status).toBe(401);
  });
});

describe('authenticate middleware', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('rejects a request with an invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('accepts a request with a valid access token', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });
});