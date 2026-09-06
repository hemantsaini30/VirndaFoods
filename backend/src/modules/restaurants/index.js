const service = require('./restaurants.service');

// Public interface for other modules. restaurantApplications calls
// createFromApplication() here — inside its own approval transaction —
// so the application-status update and the new Restaurant row commit
// atomically, without restaurantApplications reaching into this module's
// repository or Prisma model directly.
//
// assertOwnerAndActive is new in Phase 4 — the menu module calls it before
// any mutating operation (create category, add item, etc.) to confirm the
// requesting user owns the restaurant AND that the restaurant is currently
// ACTIVE, without menu.service.js needing to know anything about how
// Restaurant rows are stored or queried.
module.exports = {
  createFromApplication: service.createFromApplication,
  getById: service.getById,
  assertOwnerAndActive: service.assertOwnerAndActive,
};