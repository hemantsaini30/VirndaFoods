// src/modules/users/users.routes.js
const express = require('express');
const controller = require('./users.controller');
const authenticate = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const { updateProfileSchema } = require('./users.validator');

const router = express.Router();

router.get('/me', authenticate, controller.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), controller.updateMe);

module.exports = router;