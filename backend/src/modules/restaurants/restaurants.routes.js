const express = require('express');
const controller = require('./restaurants.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  updateRestaurantStatusSchema,
  restaurantIdParamSchema,
  listRestaurantsQuerySchema,
  listRestaurantsAdminQuerySchema,
  updateRestaurantProfileSchema,
} = require('./restaurants.validator');

const router = express.Router();

// Public — paginated, filterable by city. Always ACTIVE-only (enforced in
// the service layer, not here).
router.get('/', validate(listRestaurantsQuerySchema, 'query'), controller.list);

// ADMIN-only — separate route (not a branch inside GET /) so the
// public-listing code path can never accidentally leak non-ACTIVE
// restaurants. IMPORTANT: this must be registered before GET /:id below,
// or Express matches "/admin" as an :id value first.
router.get(
  '/admin',
  authenticate,
  authorize('ADMIN'),
  validate(listRestaurantsAdminQuerySchema, 'query'),
  controller.listAdmin
);

// RESTAURANT_OWNER-only — resolves "my restaurant" for the dashboard.
// Added because there was no existing way for the frontend to discover
// which Restaurant belongs to the logged-in owner (RestaurantApplication's
// own lookup does not include the linked Restaurant). Also registered
// before GET /:id for the same routing reason as /admin above.
router.get(
  '/mine',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  controller.getMine
);

router.get('/:id', validate(restaurantIdParamSchema, 'params'), controller.getOne);

router.patch(
  '/:id',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(restaurantIdParamSchema, 'params'),
  validate(updateRestaurantProfileSchema),
  controller.updateProfile
);

router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  validate(restaurantIdParamSchema, 'params'),
  validate(updateRestaurantStatusSchema),
  controller.updateStatus
);

module.exports = router;