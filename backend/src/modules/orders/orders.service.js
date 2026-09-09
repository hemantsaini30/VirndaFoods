const prisma = require('../../config/prisma');
const eventBus = require('../../events/eventBus');
const cart = require('../cart'); // public interface only — index.js
const restaurants = require('../restaurants'); // public interface only — index.js
const { paiseToRupees } = require('../../shared/money');
const {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../utils/errors');
const repository = require('./orders.repository');
const { ORDER_STATUS_CHANGED } = require('./orders.events');

// Flat delivery fee. Real fee calculation (distance-based, surge pricing,
// etc.) is explicitly out of scope for this phase per the brief — this is
// a simple placeholder constant, defined here (not in shared/money.js,
// which is pure unit-conversion math with no business/domain knowledge,
// and not in config/env.js, since this isn't something that needs to vary
// by deployment environment at this stage). Revisit as its own dedicated
// concern in a future phase if/when real fee logic is needed.
const DELIVERY_FEE_IN_PAISE = 4000; // ₹40 flat

// Central, single guard function for Order's state machine (master prompt
// rule #4), scoped to exactly what this phase supports. Per the phase
// brief: "Only the CREATED state and its immediate transitions are in
// scope this phase... this phase creates orders in CREATED state and
// stops there, plus supports CREATED → CANCELLED." Every other transition
// from the full Order state table (Section 2 of the Phase 5 handoff) is
// deliberately NOT included here yet — PAYMENT_PENDING, CONFIRMED,
// PREPARING, etc. all belong to Phase 7 onward, and adding them to this
// table now (even as unreachable dead entries) would misrepresent what
// this phase actually implements.
const ALLOWED_TRANSITIONS = {
  CREATED: ['CANCELLED'],
  CANCELLED: [],
};

function canTransition(fromStatus, toStatus) {
  return Boolean(ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus));
}

function serializeOrderItem(orderItem) {
  return {
    id: orderItem.id,
    foodItemId: orderItem.foodItemId,
    name: orderItem.foodItem?.name,
    imageUrl: orderItem.foodItem?.imageUrl,
    quantity: orderItem.quantity,
    priceAtPurchaseInPaise: orderItem.priceAtPurchaseInPaise,
    priceAtPurchaseInRupees: paiseToRupees(orderItem.priceAtPurchaseInPaise),
  };
}

function serializeOrder(order) {
  return {
    id: order.id,
    status: order.status,
    restaurantId: order.restaurantId,
    deliveryAddress: order.deliveryAddress,
    subtotalInPaise: order.subtotalInPaise,
    subtotalInRupees: paiseToRupees(order.subtotalInPaise),
    deliveryFeeInPaise: order.deliveryFeeInPaise,
    deliveryFeeInRupees: paiseToRupees(order.deliveryFeeInPaise),
    discountInPaise: order.discountInPaise,
    totalInPaise: order.totalInPaise,
    totalInRupees: paiseToRupees(order.totalInPaise),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items || []).map(serializeOrderItem),
    events: order.events, // present on the detail view only (findByIdWithDetails); undefined/omitted on list views, which is fine — JSON.stringify drops undefined keys
  };
}

// POST /orders. The entire operation — cart re-validation, price
// recalculation, Order + OrderItem + first OrderEvent creation, and
// clearing the cart — happens inside ONE prisma.$transaction(), per the
// master prompt's rule that money/state changes and their audit event
// must commit atomically together.
async function createOrder(customerId, { deliveryAddress }) {
  const order = await prisma.$transaction(async (tx) => {
    // Step 1: read the cart, inside this transaction, via cart's public
    // transaction-aware interface — never cart.repository.js directly.
    const { cart: customerCart, items: cartItems } = await cart.getCartForOrder(tx, customerId);

    if (!customerCart || cartItems.length === 0) {
      throw new ConflictError('Your cart is empty. Add items before placing an order.');
    }

    // Step 2a: restaurant must currently be ACTIVE. restaurants.getById
    // is not itself tx-aware (it uses the shared prisma singleton
    // internally), which is fine for a READ inside a transaction — Prisma
    // transactions in this project isolate WRITES via the tx client; a
    // plain read through the singleton here is consistent with how
    // menu.service.js and cart.service.js already treat cross-module
    // reads (e.g. cart.service.js's own addItem calls restaurants.getById
    // the same way, outside of any transaction at all). Re-validated HERE
    // regardless of what was true when the item was originally added to
    // the cart, per the phase brief's explicit instruction not to trust
    // the cart's state as of whenever items were added.
    const restaurant = await restaurants.getById(customerCart.restaurantId);
    if (restaurant.status !== 'ACTIVE') {
      throw new ConflictError(
        'This restaurant is not currently accepting orders. Please review your cart.'
      );
    }

    // Step 2b: every cart item's FoodItem must currently be available.
    // Collects ALL unavailable items (not just the first one found) so
    // the error can name every offending item at once, per the phase
    // brief's "identify which item(s), don't just say cart invalid."
    const unavailableItems = cartItems.filter((item) => !item.foodItem.isAvailable);
    if (unavailableItems.length > 0) {
      const names = unavailableItems.map((item) => item.foodItem.name).join(', ');
      throw new ConflictError(
        `The following item(s) are no longer available and must be removed from your cart before ordering: ${names}.`
      );
    }

    // Step 2c: recalculate the subtotal SERVER-SIDE from each item's
    // CURRENT FoodItem.priceInPaise, read fresh inside this transaction
    // (via the foodItem already joined in cartItems from step 1) — never
    // any client-sent amount, and never any price the cart might have
    // displayed earlier in the customer's session. This is also the exact
    // moment priceAtPurchaseInPaise gets its value for every OrderItem —
    // the one and only price-snapshot write in the entire system.
    const subtotalInPaise = cartItems.reduce(
      (sum, item) => sum + item.foodItem.priceInPaise * item.quantity,
      0
    );
    const totalInPaise = subtotalInPaise + DELIVERY_FEE_IN_PAISE; // discountInPaise stays 0 — no discount mechanism exists yet

    // Step 3: create the Order row (status: CREATED, version defaults to
    // 0 per the schema).
    const createdOrder = await repository.createOrder(tx, {
      customerId,
      restaurantId: restaurant.id,
      status: 'CREATED',
      subtotalInPaise,
      deliveryFeeInPaise: DELIVERY_FEE_IN_PAISE,
      discountInPaise: 0,
      totalInPaise,
      deliveryAddress,
    });

    // Step 4: create OrderItem rows, snapshotting priceAtPurchaseInPaise
    // from the SAME priceInPaise values just used for the subtotal above
    // — not a second, separate read that could theoretically observe a
    // different value.
    await repository.createOrderItems(
      tx,
      cartItems.map((item) => ({
        orderId: createdOrder.id,
        foodItemId: item.foodItemId,
        quantity: item.quantity,
        priceAtPurchaseInPaise: item.foodItem.priceInPaise,
      }))
    );

    // Step 5: the first OrderEvent row — fromStatus: null (this is the
    // order's very first state), toStatus: 'CREATED', triggeredBy: 'USER'
    // (the customer's own checkout action, not a webhook/admin/system
    // job), triggeredById: customerId. Written in the SAME transaction as
    // the Order/OrderItem rows above, per the master prompt's append-only
    // audit rule.
    await repository.createOrderEvent(tx, {
      orderId: createdOrder.id,
      fromStatus: null,
      toStatus: 'CREATED',
      triggeredBy: 'USER',
      triggeredById: customerId,
      reason: null,
      rawPayload: null,
    });

    // Step 6: clear the cart — via cart's public, transaction-aware
    // interface, passing the exact item count observed in step 1 as the
    // concurrency check's expected count. See cart.service.js's
    // clearCartItemsForOrder for the full explanation of what happens
    // (and why) if this count no longer matches — a mismatch throws
    // CartChangedDuringOrderError, which propagates out of this callback
    // and causes prisma.$transaction to roll back EVERYTHING above
    // (Order, OrderItem, OrderEvent creation included), leaving no
    // partial order behind.
    await cart.clearCartItemsForOrder(tx, customerCart.id, cartItems.length);

    return createdOrder;
  });

  // Emitted only after the transaction has committed — consistent with
  // the exact same reasoning already established in
  // restaurantApplications.service.js: never announce a state change that
  // might not have actually taken effect.
  eventBus.emit(ORDER_STATUS_CHANGED, {
    orderId: order.id,
    customerId: order.customerId,
    fromStatus: null,
    toStatus: 'CREATED',
    reason: null,
  });

  const fresh = await repository.findByIdWithDetails(order.id);
  return serializeOrder(fresh);
}

// GET /orders/me
async function listOwnOrders(customerId, { page, limit }) {
  const skip = (page - 1) * limit;
  const { orders, total } = await repository.findManyByCustomer(customerId, {
    skip,
    take: limit,
  });
  return {
    orders: orders.map(serializeOrder),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// GET /orders/:id
//
// SCOPE DECISION (stated explicitly per the phase brief's instruction):
// the original route contract lists CUSTOMER/RESTAURANT_OWNER/
// DELIVERY_PARTNER as all having ownership-based access to this endpoint.
// This phase implements the CUSTOMER path fully (order.customerId must
// equal the requester's id) and explicitly DEFERS both other roles rather
// than stubbing a guess at their access rules. Reason: "ownership" for a
// RESTAURANT_OWNER would mean "this order belongs to MY restaurant" — but
// there is no restaurant-side order list/view/management surface at all
// yet (that's Phase 8 per the master prompt's constraints for this
// phase), so there's no existing UI or endpoint that would even use that
// access path today. Similarly, "ownership" for a DELIVERY_PARTNER would
// mean "I am the assigned driver for this order" — but DeliveryAssignment
// doesn't exist as a module yet (Phase 9). Implementing a check against a
// concept that doesn't exist yet would mean guessing at Phase 8/9's
// eventual shape now, which risks being wrong and needing rework then —
// worse than plainly deferring it. For now, a RESTAURANT_OWNER or
// DELIVERY_PARTNER calling this endpoint receives the same ForbiddenError
// a random unrelated customer would.
async function getOwnOrder(customerId, orderId) {
  const order = await repository.findByIdWithDetails(orderId);
  if (!order) {
    throw new NotFoundError('Order not found.');
  }
  if (order.customerId !== customerId) {
    // Deliberately NotFoundError, not ForbiddenError — same reasoning as
    // cart.service.js's getOwnCartItemOrThrow: don't reveal to a caller
    // that an order with this id exists at all if it isn't theirs.
    throw new NotFoundError('Order not found.');
  }
  return serializeOrder(order);
}

// POST /orders/:id/cancel — CUSTOMER (own order) or ADMIN.
async function cancelOrder(orderId, requestingUser) {
  const updated = await prisma.$transaction(async (tx) => {
    const order = await repository.findByIdForUpdate(tx, orderId);
    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    const isOwner = order.customerId === requestingUser.id;
    const isAdmin = requestingUser.role === 'ADMIN';
    if (!isOwner && !isAdmin) {
      // NotFoundError here too, for the same information-leak reasoning
      // as getOwnOrder above — a non-owning, non-admin caller shouldn't
      // learn that this order id exists.
      throw new NotFoundError('Order not found.');
    }

    if (!canTransition(order.status, 'CANCELLED')) {
      throw new ConflictError(
        `Cannot cancel an order in ${order.status} status. Only orders in CREATED status can be cancelled at this stage.`
      );
    }

    const updatedCount = await repository.updateStatusWithVersionCheck(
      tx,
      orderId,
      order.version,
      'CANCELLED'
    );
    if (updatedCount === 0) {
      // Same optimistic-locking idiom as menu.service.js's updateItem —
      // someone else changed this order's status/version between our read
      // and our write.
      throw new ConflictError(
        'This order was updated elsewhere since you last loaded it. Refresh and try again.'
      );
    }

    await repository.createOrderEvent(tx, {
      orderId,
      fromStatus: order.status,
      toStatus: 'CANCELLED',
      triggeredBy: isAdmin && !isOwner ? 'ADMIN' : 'USER',
      triggeredById: requestingUser.id,
      reason: null,
      rawPayload: null,
    });

    return { ...order, status: 'CANCELLED' };
  });

  eventBus.emit(ORDER_STATUS_CHANGED, {
    orderId: updated.id,
    customerId: updated.customerId,
    fromStatus: 'CREATED',
    toStatus: 'CANCELLED',
    reason: null,
  });

  const fresh = await repository.findByIdWithDetails(orderId);
  return serializeOrder(fresh);
}

module.exports = {
  canTransition,
  createOrder,
  listOwnOrders,
  getOwnOrder,
  cancelOrder,
};