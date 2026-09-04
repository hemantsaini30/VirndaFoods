// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');

const env = require('./config/env');
const { logger, runWithRequestId } = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // required so the browser will send/receive the refresh-token cookie
  })
);
app.use(express.json());
app.use(cookieParser());

// pino-http needs the real pino instance — destructuring { logger } here
// pulls it out of utils/logger's exports object correctly.
app.use(pinoHttp({ logger }));

// Every request now carries its pino-http-generated ID through
// AsyncLocalStorage for the rest of its lifetime, so deeply-nested service
// code can call getContextLogger() and still log with the right requestId
// attached, without threading it through every function signature.
app.use((req, res, next) => {
  runWithRequestId(req.id, next);
});

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;