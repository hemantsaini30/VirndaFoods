// src/modules/restaurantApplications/restaurantApplications.events.js
//
// Domain events this module emits. Other modules (e.g. notifications)
// subscribe to these via events/eventBus.js instead of importing
// restaurantApplications.service.js or .repository.js directly — this
// file is the intentional public "event contract," safe for other
// modules to import even though the module-boundary rule blocks them
// from importing the service/repository layers.

const RESTAURANT_APPLICATION_STATUS_CHANGED = 'RESTAURANT_APPLICATION_STATUS_CHANGED';

module.exports = { RESTAURANT_APPLICATION_STATUS_CHANGED };