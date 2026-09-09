const prisma = require('../../config/prisma');

// Every CUSTOMER has exactly one Cart (schema: Cart.customerId is
// @unique). findOrCreateForCustomer is the one place that invariant is
// enforced — every other function in this module assumes a Cart already
// exists for the caller (it will, once they've called any cart endpoint
// at all, since even GET /cart calls this first).
async function findOrCreateForCustomer(customerId) {
  const existing = await prisma.cart.findUnique({ where: { customerId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { customerId } });
}

// Fetches the cart's items joined with their FoodItem row, so the service
// layer can build the "live truth" response (current name/price/
// availability) without a second round-trip per item.
function findItemsWithFoodItem(cartId) {
  return prisma.cartItem.findMany({
    where: { cartId },
    include: { foodItem: true },
    orderBy: { createdAt: 'asc' },
  });
}

function findItemById(id) {
  return prisma.cartItem.findUnique({ where: { id } });
}

function findItemByCartAndFoodItem(cartId, foodItemId) {
  return prisma.cartItem.findFirst({ where: { cartId, foodItemId } });
}

function countItems(cartId) {
  return prisma.cartItem.count({ where: { cartId } });
}

function createItem(cartId, foodItemId, quantity) {
  return prisma.cartItem.create({ data: { cartId, foodItemId, quantity } });
}

function updateItemQuantity(id, quantity) {
  return prisma.cartItem.update({ where: { id }, data: { quantity } });
}

// quantity is ADDED to the existing row, not overwritten — re-adding an
// item already in the cart increases how many you're ordering, matching
// how every real food-delivery app's "Add" button behaves once an item is
// already in the cart, rather than resetting it back down to 1.
function incrementItemQuantity(id, byQuantity) {
  return prisma.cartItem.update({
    where: { id },
    data: { quantity: { increment: byQuantity } },
  });
}

function deleteItem(id) {
  return prisma.cartItem.delete({ where: { id } });
}

function deleteAllItems(cartId) {
  return prisma.cartItem.deleteMany({ where: { cartId } });
}

// Used when switching restaurants: the cart's own restaurantId pointer
// must be cleared/reset alongside deleting its items, so a fresh add
// starts a clean single-restaurant cart rather than leaving a stale
// restaurantId with zero items in it.
function setCartRestaurant(cartId, restaurantId) {
  return prisma.cart.update({ where: { id: cartId }, data: { restaurantId } });
}

// ── Added Phase 6 — transaction-aware, order-creation-only ─────────────
//
// Every function above this point uses the shared `prisma` singleton
// directly and is NOT transaction-aware — they each run as their own
// independent operation, exactly as before. This is a deliberate,
// unchanged behavior for every existing caller (cart.service.js's own
// getCart/addItem/updateItemQuantity/removeItem/clearCart, and by
// extension the cart HTTP routes) — none of them are touched by anything
// below.
//
// The two functions below are NEW, distinct, and only ever called from
// inside orders.service.js's single order-creation transaction (via
// cart.service.js's getCartForOrder/clearCartItemsForOrder wrappers — see
// that file). They take an explicit Prisma transaction client `tx` as
// their first parameter instead of using the shared `prisma` singleton,
// so their writes participate in and are bound by that transaction's
// atomicity/rollback — not a modification of any existing function's
// signature or behavior.

// Fetches cart + items + FoodItem, using `tx` so this read happens inside
// the caller's transaction (consistent, isolated view of the data for the
// rest of that transaction to act on).
function findCartWithItemsForUpdate(tx, customerId) {
  return tx.cart.findUnique({
    where: { customerId },
    include: {
      items: {
        include: { foodItem: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

// Conditional delete: only deletes the cart's items if the row count
// currently matches `expectedCount` (the count the caller observed moments
// earlier, in the same transaction, via findCartWithItemsForUpdate above).
// Uses deleteMany + a returned `count`, exactly the same "compare via
// affected-row-count instead of a raw row lock" idiom already established
// in menu.repository.js's updateItemWithVersionCheck — applied here to a
// delete instead of an update, since CartItem has no version column to
// check against directly. The caller (cart.service.js's
// clearCartItemsForOrder) is responsible for treating a mismatched count
// as a conflict and throwing — this function only performs the delete and
// reports how many rows it actually removed.
async function deleteItemsWithCountCheck(tx, cartId, expectedCount) {
  const currentCount = await tx.cartItem.count({ where: { cartId } });
  if (currentCount !== expectedCount) {
    return { deleted: false, actualCount: currentCount };
  }
  await tx.cartItem.deleteMany({ where: { cartId } });
  return { deleted: true, actualCount: currentCount };
}

// Same reasoning as setCartRestaurant above, but tx-bound so it commits or
// rolls back with the rest of the order-creation transaction.
function setCartRestaurantTx(tx, cartId, restaurantId) {
  return tx.cart.update({ where: { id: cartId }, data: { restaurantId } });
}

module.exports = {
  findOrCreateForCustomer,
  findItemsWithFoodItem,
  findItemById,
  findItemByCartAndFoodItem,
  countItems,
  createItem,
  updateItemQuantity,
  incrementItemQuantity,
  deleteItem,
  deleteAllItems,
  setCartRestaurant,
  findCartWithItemsForUpdate,
  deleteItemsWithCountCheck,
  setCartRestaurantTx,
};