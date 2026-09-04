// src/modules/auth/auth.service.js
const bcrypt = require('bcrypt');
const env = require('../../config/env');
const { logger } = require('../../utils/logger');
const repo = require('./auth.repository');
const { generateRefreshToken, hashToken, signAccessToken } = require('../../utils/tokens');
const { ConflictError, UnauthorizedError } = require('../../utils/errors');
const {
  emitUserRegistered,
  emitUserLoggedIn,
  emitUserLoginFailed,
} = require('./auth.events');

function refreshExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return d;
}

async function issueRefreshToken(userId) {
  const rawToken = generateRefreshToken();
  const tokenHash = hashToken(rawToken);
  await repo.createRefreshToken({ userId, tokenHash, expiresAt: refreshExpiryDate() });
  return rawToken;
}

async function register({ email, password, name, phone, role }) {
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    // A raw Prisma unique-constraint error would leak a stack trace and a
    // generic 500 to the client — we catch the duplicate ourselves so the
    // client gets a clean, expected 409 instead.
    throw new ConflictError('An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST);
  const user = await repo.createUser({ email, passwordHash, name, phone, role });

  logger.info({ event: 'USER_REGISTERED', userId: user.id, role: user.role }, 'User registered');
  emitUserRegistered({ userId: user.id, role: user.role });

  return user;
}

async function login({ email, password }) {
  const user = await repo.findUserByEmail(email);
  if (!user) {
    logger.warn({ event: 'LOGIN_FAILED', reason: 'unknown_email' }, 'Login attempt failed');
    emitUserLoginFailed({ reason: 'unknown_email' });
    // Same message for "unknown email" and "wrong password" — telling an
    // attacker which one it was would let them enumerate valid emails.
    throw new UnauthorizedError('Invalid email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    logger.warn(
      { event: 'LOGIN_FAILED', userId: user.id, reason: 'bad_password' },
      'Login attempt failed'
    );
    emitUserLoginFailed({ userId: user.id, reason: 'bad_password' });
    throw new UnauthorizedError('Invalid email or password.');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  logger.info({ event: 'USER_LOGGED_IN', userId: user.id }, 'User logged in');
  emitUserLoggedIn({ userId: user.id });

  const { passwordHash, ...publicUser } = user;
  return { user: publicUser, accessToken, refreshToken };
}

async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new UnauthorizedError('No refresh token provided.');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findRefreshTokenByHash(tokenHash);

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token is invalid or has expired.');
  }

  const user = await repo.findUserById(stored.userId);
  if (!user) {
    throw new UnauthorizedError('Refresh token is invalid or has expired.');
  }

  // Rotation: every refresh immediately revokes the token that was just
  // used and issues a brand-new one in its place. This means a refresh
  // token can only ever be used once. If a stolen token is ever replayed
  // after the real user has already refreshed, it will fail (already
  // revoked) — which is itself a useful signal that a token was stolen.
  const newRawToken = generateRefreshToken();
  const newTokenHash = hashToken(newRawToken);
  await repo.createRefreshToken({
    userId: user.id,
    tokenHash: newTokenHash,
    expiresAt: refreshExpiryDate(),
  });
  await repo.revokeRefreshToken(stored.id, { replacedBy: newTokenHash });

  const accessToken = signAccessToken(user);

  return { user, accessToken, refreshToken: newRawToken };
}

async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  const stored = await repo.findRefreshTokenByHash(tokenHash);
  if (stored && !stored.revokedAt) {
    await repo.revokeRefreshToken(stored.id);
  }
}

module.exports = { register, login, refresh, logout };