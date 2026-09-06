const { verifyAccessToken } = require('../utils/tokens');

/**
 * Same verification logic as authenticate.js, but never rejects the
 * request. If a valid Bearer token is present, req.user is populated
 * exactly as authenticate.js would. If the header is missing, malformed,
 * or the token is invalid/expired, req.user is simply left undefined and
 * the request proceeds as an anonymous/public call.
 *
 * Used only for routes that serve BOTH public and authenticated callers
 * with different content depending on who's asking — e.g.
 * GET /restaurants/:id/menu, where the owner's own authenticated request
 * can see unavailable items but a logged-out customer just sees the
 * public menu. Never use this in place of `authenticate` on a route that
 * actually requires a logged-in user — an invalid/expired token here
 * fails silently by design, which is correct for this narrow use case and
 * wrong everywhere else.
 */
function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch (err) {
    // Invalid/expired token on an optional-auth route: proceed as
    // anonymous rather than erroring, since the caller may just have a
    // stale token and still be entitled to the public view.
  }
  next();
}

module.exports = optionalAuthenticate;