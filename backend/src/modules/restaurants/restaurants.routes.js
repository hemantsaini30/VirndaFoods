// src/modules/restaurants/restaurants.routes.js
const express = require('express');
const controller = require('./restaurants.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  updateRestaurantStatusSchema,
  restaurantIdParamSchema,
} = require('./restaurants.validator');

const router = express.Router();

// Public — minimal, just enough to support the status page. Full
// restaurant/menu browsing is Phase 4's job.
router.get('/:id', validate(restaurantIdParamSchema, 'params'), controller.getOne);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  validate(restaurantIdParamSchema, 'params'),
  validate(updateRestaurantStatusSchema),
  controller.updateStatus
);

module.exports = router;