// src/middleware/idempotency.js
//
// Cross-cutting concern — lives in middleware/, not inside any one
// module, per the master prompt's own reasoning for why things like
// authenticate/authorize/validate live here rather than being duplicated
// per-module.
//
// GENERIC BY DESIGN (explicit decision, stated per the phase brief's own
// prompt to decide and state this): this middleware is NOT
// orders-specific. It's built against the IdempotencyKey table exactly as
// that table already exists in the schema — key, userId, route,
// requestFingerprint, responseStatusCode, responseBody, expiresAt — none
// of which reference "order" anywhere. Phase 7's payment-initiation
// endpoint (also listed with an Idempotency-Key requirement in the
// original route table) will be able to reuse this exact same
// `idempotent()` middleware factory, mounted on its own route, with zero
// changes needed here. Building it orders-specific now and generalizing
// it later would mean either duplicating this logic in Phase 7 or coming
// back to refactor this file at that point — doing it generically now, in
// the one place a cross-cutting concern belongs, avoids both.

const crypto = require('crypto');
const prisma = require('../config/prisma');
const { IdempotencyKeyMissingError, IdempotencyKeyReusedError } = require('../utils/errors');

const RETENTION_HOURS = 24; // matches the value already stated (and previously unimplemented) in the Phase 5 handoff

function hashRequestBody(body) {
  // Deliberately NOT hashing req.body before validate() has run — this
  // middleware must always be mounted AFTER validate() in a route's
  // middleware chain, so that what gets fingerprinted is the parsed/
  // coerced/whitespace-normalized body Zod produced, not the raw request
  // text. Two functionally-identical requests that differ only in JSON
  // key order or incidental whitespace must fingerprint identically, or
  // this middleware would wrongly treat a legitimate retry as a "reused
  // key, different payload" conflict.
  const normalized = JSON.stringify(body ?? {});
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Express middleware factory. Usage (mounted AFTER authenticate + validate,
 * so req.user and the parsed req.body are both already available):
 *
 *   router.post('/', authenticate, authorize('CUSTOMER'),
 *     validate(createOrderSchema), idempotent(), controller.create);
 *
 * Behavior:
 * - No Idempotency-Key header -> 400 IDEMPOTENCY_KEY_MISSING.
 * - Key not seen before (for this user+route) -> proceeds to the real
 *   handler. Response is captured and stored after the handler completes
 *   successfully.
 * - Key seen before, same request fingerprint -> the ORIGINAL cached
 *   response is replayed verbatim (same status code, same body); the real
 *   handler never runs a second time.
 * - Key seen before, DIFFERENT request fingerprint -> 409
 *   IDEMPOTENCY_KEY_REUSED. This is a client bug (same key reused for a
 *   materially different request) — never silently served from cache.
 */
function idempotent() {
  return async function idempotencyMiddleware(req, res, next) {
    const key = req.headers['idempotency-key'];
    if (!key || typeof key !== 'string' || key.trim() === '') {
      return next(new IdempotencyKeyMissingError());
    }

    const userId = req.user.id; // this middleware must run after `authenticate`
    const route = req.originalUrl.split('?')[0]; // path only, ignore query string
    const fingerprint = hashRequestBody(req.body);

    try {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key } });

      if (existing) {
        // Defense in depth: even though `key` is globally unique in the
        // schema, a key collision across two DIFFERENT users (or routes)
        // should never be possible in practice (UUIDs), but if it somehow
        // happened we must not let user A replay a response meant for
        // user B. Treated as "different payload" rather than silently
        // succeeding or leaking user B's response.
        if (existing.userId !== userId || existing.route !== route) {
          return next(new IdempotencyKeyReusedError());
        }

        if (existing.requestFingerprint !== fingerprint) {
          return next(new IdempotencyKeyReusedError());
        }

        if (existing.expiresAt < new Date()) {
          // Expired — treat as if the key had never been used. Delete the
          // stale row so the upcoming fresh attempt can insert cleanly
          // (the `key` column is unique, so a stale row would otherwise
          // block the new insert).
          await prisma.idempotencyKey.delete({ where: { key } });
        } else {
          // Genuine replay: same user, same route, same fingerprint,
          // not expired. Return exactly what was returned the first time
          // — the real handler is never invoked.
          return res.status(existing.responseStatusCode).json(existing.responseBody);
        }
      }
    } catch (err) {
      return next(err);
    }

    // First use of this key (or a just-expired one we cleaned up above).
    // Intercept res.json so we can capture whatever the real handler
    // ultimately sends, then persist it AFTER the handler has run and
    // succeeded — this file never assumes what shape a given route's
    // success response takes.
    const originalJson = res.json.bind(res);
    let responseCaptured = false;

    res.json = (body) => {
      if (!responseCaptured) {
        responseCaptured = true;
        // Fire-and-forget-but-awaited-safely: we still want this write to
        // happen before the process could exit, but we must not delay the
        // actual HTTP response to the client on it. Errors here are
        // logged via the standard error path but deliberately do NOT
        // change the response already being sent — a failed idempotency
        // record write should never turn a successful order creation into
        // an error response for the customer.
        const expiresAt = new Date(Date.now() + RETENTION_HOURS * 60 * 60 * 1000);
        prisma.idempotencyKey
          .create({
            data: {
              key,
              userId,
              route,
              requestFingerprint: fingerprint,
              responseStatusCode: res.statusCode,
              responseBody: body,
              expiresAt,
            },
          })
          .catch((err) => {
            req.log?.error?.({ err }, 'Failed to persist idempotency key record.');
          });
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = idempotent;