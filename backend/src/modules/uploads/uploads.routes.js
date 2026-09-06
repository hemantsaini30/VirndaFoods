const express = require('express');
const controller = require('./uploads.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');

const router = express.Router();

// Gated to RESTAURANT_OWNER only, per the phase spec — the only current
// use case is restaurant/food-item images. If a future phase needs
// uploads from another role (e.g. delivery-partner license documents),
// widen this authorize() call then, rather than opening it up broadly now.
router.post('/signature', authenticate, authorize('RESTAURANT_OWNER'), controller.getUploadSignature);

module.exports = router;