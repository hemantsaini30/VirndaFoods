const express = require('express');
const controller = require('./cart.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemIdParamSchema,
} = require('./cart.validator');

const router = express.Router();

// Every route in this module is CUSTOMER-only and requires auth —
// applied once here rather than per-route, since there's no public or
// other-role access to any cart endpoint in this phase.
router.use(authenticate, authorize('CUSTOMER'));

router.get('/', controller.getCart);
router.post('/items', validate(addCartItemSchema), controller.addItem);
router.patch(
  '/items/:id',
  validate(cartItemIdParamSchema, 'params'),
  validate(updateCartItemSchema),
  controller.updateItemQuantity
);
router.delete('/items/:id', validate(cartItemIdParamSchema, 'params'), controller.removeItem);
router.delete('/', controller.clearCart);

module.exports = router;