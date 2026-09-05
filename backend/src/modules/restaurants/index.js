// src/modules/restaurants/index.js
const service = require('./restaurants.service');

// Public interface for other modules. restaurantApplications calls
// createFromApplication() here — inside its own approval transaction —
// so the application-status update and the new Restaurant row commit
// atomically, without restaurantApplications reaching into this module's
// repository or Prisma model directly.
module.exports = {
  createFromApplication: service.createFromApplication,
  getById: service.getById,
};