// src/modules/health/health.routes.js
// HTTP layer only — no business logic here, just wiring the route to the controller.

const express = require('express');
const { getHealthStatus } = require('./health.controller');

const router = express.Router();

router.get('/', getHealthStatus);

module.exports = router;
