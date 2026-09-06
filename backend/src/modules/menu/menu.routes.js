const express = require('express');
const controller = require('./menu.controller');
const authenticate = require('../../middleware/authenticate');
const optionalAuthenticate = require('../../middleware/optionalAuthenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  restaurantIdParamSchema,
  categoryIdParamSchema,
  itemIdParamSchema,
  getMenuQuerySchema,
  createCategorySchema,
  updateCategorySchema,
  createFoodItemSchema,
  updateFoodItemSchema,
  updateAvailabilitySchema,
} = require('./menu.validator');

// Mounted at /restaurants in app.js — routes that are naturally scoped
// under a specific restaurant (reading its menu, creating a category or
// item within it).
const restaurantScopedRouter = express.Router();

restaurantScopedRouter.get(
  '/:id/menu',
  optionalAuthenticate,
  validate(restaurantIdParamSchema, 'params'),
  validate(getMenuQuerySchema, 'query'),
  controller.getMenu
);

restaurantScopedRouter.post(
  '/:id/categories',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(restaurantIdParamSchema, 'params'),
  validate(createCategorySchema),
  controller.createCategory
);

restaurantScopedRouter.post(
  '/:id/items',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(restaurantIdParamSchema, 'params'),
  validate(createFoodItemSchema),
  controller.createItem
);

// Mounted at /categories in app.js — flat routes, per the phase spec.
// Ownership is resolved through the category's parent restaurant inside
// menu.service.js, not via a restaurantId in the URL.
const categoryRouter = express.Router();

categoryRouter.patch(
  '/:id',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema),
  controller.updateCategory
);

categoryRouter.delete(
  '/:id',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(categoryIdParamSchema, 'params'),
  controller.deleteCategory
);

// Mounted at /items in app.js — flat routes, per the phase spec.
const itemRouter = express.Router();

itemRouter.patch(
  '/:id',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(itemIdParamSchema, 'params'),
  validate(updateFoodItemSchema),
  controller.updateItem
);

itemRouter.patch(
  '/:id/availability',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(itemIdParamSchema, 'params'),
  validate(updateAvailabilitySchema),
  controller.updateAvailability
);

itemRouter.delete(
  '/:id',
  authenticate,
  authorize('RESTAURANT_OWNER'),
  validate(itemIdParamSchema, 'params'),
  controller.deleteItem
);

module.exports = { restaurantScopedRouter, categoryRouter, itemRouter };