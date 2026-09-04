// src/utils/tokens.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

function verifyAccessToken(token) {
  // Throws if invalid/expired — callers must catch this.
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function generateRefreshToken() {
  // 40 random bytes = plenty of entropy; hex-encoded for easy cookie transport.
  return crypto.randomBytes(40).toString('hex');
}

function hashToken(rawToken) {
  // Refresh tokens are never stored raw — only their SHA-256 hash, so a DB
  // leak alone can't be used to log in as anyone.
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
};