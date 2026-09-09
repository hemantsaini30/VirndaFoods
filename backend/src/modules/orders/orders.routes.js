const express = require('express');
const controller = require('./orders.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const idempotent = require('../../middleware/idempotency');
const {
  createOrderSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
} = require('./orders.validator');

const router = express.Router();

// idempotent() is mounted AFTER validate(createOrderSchema) — this is
// required, not incidental: the idempotency middleware fingerprints
// req.body, and it must fingerprint the VALIDATED/coerced body Zod
// produces, not the raw pre-validation request. See idempotency.js's own
// comment on hashRequestBody for the full reasoning.
router.post(
  '/',
  authenticate,
  authorize('CUSTOMER'),
  validate(createOrderSchema),
  idempotent(),
  controller.create
);

router.get(
  '/me',
  authenticate,
  authorize('CUSTOMER'),
  validate(listOrdersQuerySchema, 'query'),
  controller.listMine
);

router.get(
  '/:id',
  authenticate,
  authorize('CUSTOMER'),
  validate(orderIdParamSchema, 'params'),
  controller.getOne
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize('CUSTOMER', 'ADMIN'),
  validate(orderIdParamSchema, 'params'),
  controller.cancel
);

module.exports = router;