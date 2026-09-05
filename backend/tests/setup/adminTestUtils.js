// tests/setup/adminTestUtils.js
const bcrypt = require('bcrypt');
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');

/**
 * Creates an ADMIN user directly via Prisma (bypassing the registration
 * endpoint, which deliberately rejects ADMIN as a self-registerable role
 * per auth.validator.js) and logs in via the real /auth/login endpoint,
 * so admin-protected-route tests still exercise the real login and
 * authenticate flow rather than fabricating a token by hand.
 */
async function createAdminAndLogin({
  email = `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
  password = 'AdminPass123',
  name = 'Test Admin',
} = {}) {
  const bcryptCost = Number(process.env.BCRYPT_COST) || 12;
  const passwordHash = await bcrypt.hash(password, bcryptCost);

  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: 'ADMIN' },
  });

  const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password });

  return {
    email,
    password,
    name,
    user: { id: user.id, email: user.email, role: user.role },
    accessToken: loginRes.body.accessToken,
  };
}

module.exports = { createAdminAndLogin };