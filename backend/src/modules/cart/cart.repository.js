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
};