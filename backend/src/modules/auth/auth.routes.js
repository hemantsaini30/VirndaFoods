// src/modules/auth/auth.routes.js
const express = require('express');
const controller = require('./auth.controller');
const validate = require('../../middleware/validate');
const { authLimiter } = require('../../middleware/rateLimiters');
const { registerSchema, loginSchema } = require('./auth.validator');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

module.exports = router;