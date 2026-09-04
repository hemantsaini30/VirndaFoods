// src/modules/auth/auth.repository.js
const prisma = require('../../config/prisma');

// Never select passwordHash by default — every read of a User row for
// anything other than credential verification must go through this shape.
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

function findUserByEmail(email) {
  // Includes passwordHash deliberately — this is the one place in the
  // codebase allowed to read it, for bcrypt.compare in the login flow.
  return prisma.user.findUnique({ where: { email } });
}

function findUserById(id) {
  return prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
}

function createUser({ email, passwordHash, name, phone, role }) {
  return prisma.user.create({
    data: { email, passwordHash, name, phone, role },
    select: PUBLIC_USER_SELECT,
  });
}

function createRefreshToken({ userId, tokenHash, expiresAt }) {
  return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
}

function findRefreshTokenByHash(tokenHash) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

function revokeRefreshToken(id, { replacedBy } = {}) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date(), replacedBy: replacedBy || null },
  });
}

module.exports = {
  PUBLIC_USER_SELECT,
  findUserByEmail,
  findUserById,
  createUser,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
};