// src/modules/notifications/notifications.listener.js
const eventBus = require('../../events/eventBus');
const { logger } = require('../../utils/logger');
const repository = require('./notifications.repository');
const {
  RESTAURANT_APPLICATION_STATUS_CHANGED,
} = require('../restaurantApplications/restaurantApplications.events');
const {
  DELIVERY_PARTNER_APPLICATION_STATUS_CHANGED,
} = require('../deliveryPartnerApplications/deliveryPartnerApplications.events');

// Only final decisions are worth notifying the applicant about — a move
// to UNDER_REVIEW just means "an admin is looking at it now," not a
// decision, so we don't create a notification for that transition.
const NOTIFIABLE_STATUSES = new Set(['APPROVED', 'REJECTED']);

async function handleRestaurantApplicationStatusChanged({ applicantId, toStatus }) {
  if (!NOTIFIABLE_STATUSES.has(toStatus)) return;
  try {
    await repository.createNotification({
      userId: applicantId,
      type: 'APPLICATION_UPDATE',
      title: 'Restaurant application update',
      body:
        toStatus === 'APPROVED'
          ? 'Your restaurant application has been approved! Your restaurant is now live.'
          : 'Your restaurant application was not approved.',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create notification for restaurant application update.');
  }
}

async function handleDeliveryPartnerApplicationStatusChanged({ applicantId, toStatus }) {
  if (!NOTIFIABLE_STATUSES.has(toStatus)) return;
  try {
    await repository.createNotification({
      userId: applicantId,
      type: 'APPLICATION_UPDATE',
      title: 'Delivery partner application update',
      body:
        toStatus === 'APPROVED'
          ? 'Your delivery partner application has been approved!'
          : 'Your delivery partner application was not approved.',
    });
  } catch (err) {
    logger.error(
      { err },
      'Failed to create notification for delivery partner application update.'
    );
  }
}

let registered = false;

function registerListeners() {
  // Guards against double-registration (e.g. if app.js were required more
  // than once in some test setup) — otherwise listeners would stack up
  // and create duplicate Notification rows per event.
  if (registered) return;
  eventBus.on(RESTAURANT_APPLICATION_STATUS_CHANGED, handleRestaurantApplicationStatusChanged);
  eventBus.on(
    DELIVERY_PARTNER_APPLICATION_STATUS_CHANGED,
    handleDeliveryPartnerApplicationStatusChanged
  );
  registered = true;
}

module.exports = { registerListeners };