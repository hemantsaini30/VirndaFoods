// src/modules/deliveryPartnerApplications/deliveryPartnerApplications.routes.js
const express = require('express');
const controller = require('./deliveryPartnerApplications.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  submitDeliveryPartnerApplicationSchema,
  reviewApplicationStatusSchema,
  listApplicationsQuerySchema,
  applicationIdParamSchema,
} = require('./deliveryPartnerApplications.validator');

const router = express.Router();

// Mirrors the restaurant-application role split: CUSTOMER and
// RESTAURANT_OWNER may apply to become a delivery partner; an existing
// DELIVERY_PARTNER is blocked (already one), and ADMIN is blocked
// (admins review, they don't apply). This wasn't explicitly stated in
// the phase prompt for this module — flagging the assumption here.
router.post(
  '/',
  authenticate,
  authorize('CUSTOMER', 'RESTAURANT_OWNER'),
  validate(submitDeliveryPartnerApplicationSchema),
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