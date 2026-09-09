const service = require('./cart.service');

// Public interface for other modules. Prior to Phase 6 this was an empty
// placeholder (module.exports = {}), left deliberately for whichever
// future module would need to read cart contents at checkout — this is
// that module (orders).
//
// Only the two transaction-aware functions are exposed here. getCart/
// addItem/updateItemQuantity/removeItem/clearCart remain intentionally
// UNEXPORTED from this public interface — they are cart's own HTTP-facing
// functions (called directly by cart.controller.js within this module),
// not intended for cross-module use. Orders never needs "give me the
// serialized UI-shaped cart" or "clear the cart outside of a
// transaction" — it needs exactly these two transaction-participating
// primitives and nothing else, so the public surface is kept as narrow as
// the actual cross-module need.
module.exports = {
  getCartForOrder: service.getCartForOrder,
  clearCartItemsForOrder: service.clearCartItemsForOrder,
};