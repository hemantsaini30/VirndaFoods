// src/app.js
//
// Assembles the Express app but does NOT start a server (no app.listen()
// here). Keeping app construction separate from server startup means our
// test suite can import this file and hit routes directly with Supertest,
// without needing a real running server bound to a real port.

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');

const env = require('./config/env');
const { logger, runWithRequestId } = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./modules/health/health.routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

// pino-http auto-generates a request ID (via the `genReqId` option below),
// attaches it as req.id, and logs one line per request/response with
// consistent structured fields (method, url, statusCode, responseTime).
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const id = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
  }),
);

// Wrap every request in AsyncLocalStorage so any code called during this
// request (services, repositories, jobs triggered synchronously) can fetch
// the current request ID via getRequestId() without it being passed as an
// explicit parameter everywhere.
app.use((req, res, next) => {
  runWithRequestId(req.id, next);
});

// Versioned route mounting. Business logic never hardcodes "v1" — only this
// one line does, so introducing /api/v2 later doesn't touch module internals.
app.use('/api/v1/health', healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
