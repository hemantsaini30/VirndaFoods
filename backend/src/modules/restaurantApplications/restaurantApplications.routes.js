// src/modules/restaurantApplications/restaurantApplications.routes.js
const express = require('express');
const controller = require('./restaurantApplications.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  submitRestaurantApplicationSchema,
  reviewApplicationStatusSchema,
  listApplicationsQuerySchema,
  applicationIdParamSchema,
} = require('./restaurantApplications.validator');

const router = express.Router();

// Only CUSTOMER and DELIVERY_PARTNER may apply to become a restaurant
// owner. RESTAURANT_OWNER is blocked because they already own a
// restaurant (no product reason to file a second application), and
// ADMIN is blocked because admins don't apply, they review. This is
// enforced at the route via authorize() rather than inside the service,
// since it's a static role check, not a dynamic ownership fact.
router.post(
  '/',
  authenticate,
  authorize('CUSTOMER', 'DELIVERY_PARTNER'),
  validate(submitRestaurantApplicationSchema),
  controller.submit
);

router.get('/me', authenticate, controller.getMine);

router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(listApplicationsQuerySchema, 'query'),
  controller.list
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  validate(applicationIdParamSchema, 'params'),
  validate(reviewApplicationStatusSchema),
  controller.updateStatus
);

module.exports = router;