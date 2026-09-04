// tests/setup/authTestUtils.js
const request = require('supertest');
const app = require('../../src/app');

/**
 * Registers and logs in a fresh test user, returning everything a test
 * needs: the access token for the Authorization header, and the raw
 * Set-Cookie string for the refresh-token cookie.
 */
async function registerAndLogin({
  email = `user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
  password = 'Password123',
  name = 'Test User',
  role = 'CUSTOMER',
} = {}) {
  await request(app).post('/api/v1/auth/register').send({ email, password, name, role });

  const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password });

  const setCookieHeader = loginRes.headers['set-cookie'] || [];
  const refreshCookie = setCookieHeader.find((c) => c.startsWith('refreshToken='));

  return {
    email,
    password,
    name,
    role,
    user: loginRes.body.user,
    accessToken: loginRes.body.accessToken,
    refreshCookie,
  };
}

module.exports = { registerAndLogin };