// tests/errorHandling.test.js
//
// These tests lock in the consistent error response shape:
//   { error: { code, message, requestId } }
// Every later phase depends on this shape staying exactly this way.

const express = require('express');
const request = require('supertest');
const { notFoundHandler, errorHandler } = require('../src/middleware/errorHandler');
const { ValidationError } = require('../src/utils/errors');

describe('unknown route', () => {
  it('returns a 404 with the consistent error JSON shape', async () => {
    const app = express();
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });
    app.use(notFoundHandler);

    const res = await request(app).get('/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('this-route-does-not-exist'),
        requestId: 'test-request-id',
      },
    });
  });
});

describe('error middleware', () => {
  function buildAppThatThrows(errorToThrow) {
    const app = express();
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });
    app.get('/boom', () => {
      throw errorToThrow;
    });
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  }

  it('returns the consistent shape for a known AppError subclass', async () => {
    const app = buildAppThatThrows(new ValidationError('Field X is required'));

    const res = await request(app).get('/boom');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Field X is required',
        requestId: 'test-request-id',
      },
    });
  });

  it('returns a generic 500 shape for an unexpected error, without leaking internals', async () => {
    const app = buildAppThatThrows(new Error('some internal db driver detail leaked here'));

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong. Please try again.',
        requestId: 'test-request-id',
      },
    });
    // Ensure the raw internal error message was NOT leaked to the client.
    expect(JSON.stringify(res.body)).not.toContain('db driver detail');
  });
});
