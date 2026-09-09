const repository = require('./cart.repository');
const menu = require('../menu'); // public interface only — index.js
const restaurants = require('../restaurants'); // public interface only — index.js
const { paiseToRupees } = require('../../shared/money');
const {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  CartRestaurantConflictError,
  CartChangedDuringOrderError,
} = require('../../utils/errors');

// PRICE SNAPSHOT DECISION (stated explicitly, per the phase brief):
// CartItem does NOT store a price. Every read (GET /cart, and the
// response of any mutating cart endpoint) resolves the item's CURRENT
// FoodItem.priceInPaise live, via menu.getFoodItemById(). This means the
// total shown in a cart can change while items are just sitting there —
// that's intentional, not a bug: a cart is a shopping-list-in-progress,
// not a commitment, so it should always reflect current truth rather than
// a price that might be stale by the time the customer actually checks
// out. The real, permanent price commitment happens at Order creation —
// OrderItem.priceAtPurchaseInPaise already exists in the schema for
// exactly that purpose. Phase 6 is that Order-creation phase; see
// orders.service.js for where the live price is read ONE final time and
// written down immutably.

function serializeCartItem(cartItem, foodItem) {
  return {
    id: cartItem.id,
    foodItemId: cartItem.foodItemId,
    quantity: cartItem.quantity,
    name: foodItem.name,
    description: foodItem.description,
    imageUrl: foodItem.imageUrl,
    priceInPaise: foodItem.priceInPaise,
    priceInRupees: paiseToRupees(foodItem.priceInPaise),
    isAvailable: foodItem.isAvailable,
    lineTotalInPaise: foodItem.priceInPaise * cartItem.quantity,
  };
}

async function buildCartResponse(cart) {
  const rows = await repository.findItemsWithFoodItem(cart.id);
  const items = rows.map((row) => serializeCartItem(row, row.foodItem));
  const totalInPaise = items.reduce((sum, item) => sum + item.lineTotalInPaise, 0);

  return {
    id: cart.id,
    restaurantId: cart.restaurantId,
    items,
    totalInPaise,
    totalInRupees: paiseToRupees(totalInPaise),
  };
}

async function getCart(customerId) {
  const cart = await repository.findOrCreateForCustomer(customerId);
  return buildCartResponse(cart);
}

// Ownership check helper: a CartItem has no direct customerId of its own
// (it belongs to a Cart, which belongs to a customer) — this resolves
// ownership through the parent Cart, the same pattern menu.service.js
// uses for MenuCategory ownership through its parent Restaurant.
async function getOwnCartItemOrThrow(cartItemId, customerId) {
  const cartItem = await repository.findItemById(cartItemId);
  if (!cartItem) {
    throw new NotFoundError('Cart item not found.');
  }
  const cart = await repository.findOrCreateForCustomer(customerId);
  if (cartItem.cartId !== cart.id) {
    // Deliberately NotFoundError, not ForbiddenError: revealing "this
    // exists but isn't yours" vs "this doesn't exist" leaks information
    // about other customers' cart contents for no benefit — a 404 gives
    // the caller nothing to distinguish "wrong id" from "someone else's
    // item", which is the safer default here.
    throw new NotFoundError('Cart item not found.');
  }
  return { cartItem, cart };
}

// POST /cart/items. Enforces, in order:
// 1. The FoodItem actually exists.
// 2. It's currently available (never trust that the frontend already
//    checked isAvailable before allowing the click).
// 3. Its restaurant is currently ACTIVE (reusing restaurants'
//    assertOwnerAndActive would be wrong here — that function ALSO checks
//    ownership, which doesn't apply to a customer adding to a cart; we
//    only need the "is it active" half, so we fetch the restaurant via
//    restaurants.getById and check status directly instead).
// 4. The single-restaurant-cart rule: if the cart already has items from
//    a DIFFERENT restaurant, this throws CartRestaurantConflictError
//    (409, code CART_RESTAURANT_CONFLICT) rather than a generic error, so
//    the frontend can specifically offer "clear cart and add this
//    instead?" only for this situation.
// 5. If the item is already in the cart, its quantity is incremented
//    rather than a duplicate CartItem row being created.
async function addItem(customerId, { foodItemId, quantity }) {
  const foodItem = await menu.getFoodItemById(foodItemId);
  if (!foodItem) {
    throw new NotFoundError('Food item not found.');
  }
  if (!foodItem.isAvailable) {
    throw new ConflictError('This item is currently unavailable.');
  }

  const restaurant = await restaurants.getById(foodItem.restaurantId); // throws NotFoundError if somehow missing
  if (restaurant.status !== 'ACTIVE') {
    throw new ConflictError('This restaurant is not currently accepting orders.');
  }

  const cart = await repository.findOrCreateForCustomer(customerId);
  const existingItemCount = await repository.countItems(cart.id);

  if (existingItemCount > 0 && cart.restaurantId && cart.restaurantId !== foodItem.restaurantId) {
    throw new CartRestaurantConflictError();
  }

  // First item being added to an empty/fresh cart — stamp the cart with
  // this restaurant. (cart.restaurantId can be null if the cart exists
  // but has never had an item added, e.g. right after findOrCreate.)
  if (!cart.restaurantId || existingItemCount === 0) {
    await repository.setCartRestaurant(cart.id, foodItem.restaurantId);
  }

  const existingItem = await repository.findItemByCartAndFoodItem(cart.id, foodItemId);
  if (existingItem) {
    await repository.incrementItemQuantity(existingItem.id, quantity);
  } else {
    await repository.createItem(cart.id, foodItemId, quantity);
  }

  const freshCart = await repository.findOrCreateForCustomer(customerId);
  return buildCartResponse(freshCart);
}

async function updateItemQuantity(customerId, cartItemId, quantity) {
  const { cartItem } = await getOwnCartItemOrThrow(cartItemId, customerId);
  await repository.updateItemQuantity(cartItem.id, quantity);

  const cart = await repository.findOrCreateForCustomer(customerId);
  return buildCartResponse(cart);
}

async function removeItem(customerId, cartItemId) {
  const { cartItem, cart } = await getOwnCartItemOrThrow(cartItemId, customerId);
  await repository.deleteItem(cartItem.id);

  // If that was the last item, clear the cart's restaurantId pointer too
  // — an empty cart shouldn't still claim to "belong" to a restaurant,
  // since that's exactly the state a fresh cart starts in, and leaving a
  // stale restaurantId around could incorrectly trigger the
  // different-restaurant conflict check on the next add.
  const remaining = await repository.countItems(cart.id);
  if (remaining === 0) {
    await repository.setCartRestaurant(cart.id, null);
  }

  const freshCart = await repository.findOrCreateForCustomer(customerId);
  return buildCartResponse(freshCart);
}

async function clearCart(customerId) {
  const cart = await repository.findOrCreateForCustomer(customerId);
  await repository.deleteAllItems(cart.id);
  await repository.setCartRestaurant(cart.id, null);
  return buildCartResponse(cart);
}

// ── Added Phase 6 — transaction-aware, order-creation-only ─────────────
//
// Everything above this point is completely unchanged from Phase 5 and
// keeps using the shared `prisma` singleton via cart.repository.js's
// non-tx functions, exactly as before. Nothing here alters the behavior
// or signature of getCart/addItem/updateItemQuantity/removeItem/
// clearCart, or of any existing exported function.
//
// The two functions below are NEW and are only ever intended to be called
// from inside orders.service.js's single order-creation transaction. They
// are kept as distinct, separately-named exports (not overloads or
// modified signatures on the existing functions above) specifically so
// that no future caller of getCart/clearCart/etc. is silently affected by
// this change — per the explicit instruction to keep transaction-aware
// variants clearly separate.

// Returns the customer's cart with items + FoodItem data, read inside the
// given transaction `tx`. Used by orders.service.js as its first read of
// "what is this customer trying to order" — reading through tx (not the
// shared prisma singleton) means this read is part of the same isolated
// transaction that will go on to validate, create the Order, and then
// attempt to clear the cart, so nothing else can be interleaved between
// this read and the rest of the transaction's logic from the perspective
// of what THIS transaction sees.
//
// Returns { cart, items } where items are raw CartItem rows each carrying
// a nested `foodItem`. Deliberately NOT reusing buildCartResponse's
// serialized shape (priceInRupees, lineTotalInPaise, etc.) — the caller
// (orders.service.js) needs to re-derive its own totals independently
// from priceInPaise as part of its own explicit server-side recalculation
// step, not consume a shape that was designed for a UI cart display.
async function getCartForOrder(tx, customerId) {
  const cart = await repository.findCartWithItemsForUpdate(tx, customerId);
  if (!cart) {
    // A customer with literally no Cart row yet (never called any cart
    // endpoint at all) has nothing to order. Treated identically to an
    // empty cart by the caller — surfaced as the same "cart is empty"
    // ConflictError there, not duplicated here.
    return { cart: null, items: [] };
  }
  return { cart, items: cart.items };
}

// Attempts to clear the customer's cart as the final step of order
// creation, inside the same transaction `tx` that already created the
// Order/OrderItem/OrderEvent rows. `expectedItemCount` is the item count
// the caller observed via getCartForOrder() moments earlier, in the same
// transaction.
//
// WHY THIS CAN FAIL (concurrency): if a second request from the same
// customer (e.g. a double-submit with a different Idempotency-Key,
// racing this one) manages to modify the cart — add an item, remove one,
// or itself clear the cart via its own concurrent order-creation attempt
// — between this transaction's initial read and this delete step, the
// actual current item count will no longer match expectedItemCount. This
// function detects that (via cart.repository.js's
// deleteItemsWithCountCheck, which uses the same "compare via
// affected-row-count" idiom as menu.repository.js's optimistic-locking
// update) and returns deleted:false rather than deleting anything. The
// caller (orders.service.js) treats that as a hard failure and throws
// CartChangedDuringOrderError, which rolls back the ENTIRE transaction —
// so no Order is left half-created against a cart that has since changed
// out from under it. The customer sees a clear "your cart changed,
// please try again" message and their actual current cart is left
// completely untouched by the failed attempt.
async function clearCartItemsForOrder(tx, cartId, expectedItemCount) {
  const result = await repository.deleteItemsWithCountCheck(tx, cartId, expectedItemCount);
  if (!result.deleted) {
    throw new CartChangedDuringOrderError();
  }
  await repository.setCartRestaurantTx(tx, cartId, null);
  return result;
}

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
  getCartForOrder,
  clearCartItemsForOrder,
};