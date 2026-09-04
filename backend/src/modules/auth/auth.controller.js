// src/modules/auth/auth.controller.js
const authService = require('./auth.service');
const env = require('../../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';

function refreshCookieOptions() {
  return {
    httpOnly: true, // JavaScript on the page can never read this — the core XSS defense
    secure: env.COOKIE_SECURE, // must be true in production (HTTPS only)
    sameSite: 'lax',
    path: '/api/v1/auth', // only sent back to auth endpoints, not the whole API
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    res.status(200).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE_NAME];
    const { user, accessToken, refreshToken } = await authService.refresh(rawToken);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
    res.status(200).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const rawToken = req.cookies[REFRESH_COOKIE_NAME];
    await authService.logout(rawToken);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, REFRESH_COOKIE_NAME };