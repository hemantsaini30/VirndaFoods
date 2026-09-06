const repository = require('./menu.repository');

// New in Phase 5. The cart module needs to resolve a FoodItem's current
// name/price/availability/imageUrl (cart always shows live truth, not a
// stale snapshot — see cart.service.js) and confirm which restaurant it
// belongs to. Per the strict module-boundary rule, cart may only call
// into menu's public interface — never menu.repository.js or the Prisma
// FoodItem model directly. This is a thin passthrough: no new business
// logic, just exposing the existing repository lookup that
// menu.service.js already uses internally (see getItemOrThrow there).
//
// Returns the raw FoodItem row (or null) — NOT the priceInRupees-enriched
// shape menu.service.js's serializeFoodItem produces, since cart.service
// only needs priceInPaise for its own calculations and does its own
// response shaping.
function getFoodItemById(id) {
  return repository.findItemById(id);
}

module.exports = { getFoodItemById };