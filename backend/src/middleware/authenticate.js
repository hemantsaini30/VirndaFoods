// src/middleware/authenticate.js
const { verifyAccessToken } = require('../utils/tokens');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Verifies the access token from the Authorization header and attaches
 * { id, role } to req.user. Does NOT hit the database — it trusts the
 * short-lived, signed token. Routes that need fresh profile data (e.g.
 * GET /users/me) look the user up themselves, scoped to req.user.id.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header.'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid or expired access token.'));
  }
}

module.exports = authenticate;