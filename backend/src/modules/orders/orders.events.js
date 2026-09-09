// src/modules/orders/orders.events.js
//
// Domain events this module emits onto the internal event bus (events/),
// per the master prompt's module-boundary rule: side effects that don't
// need an immediate return value go through the event bus, not a direct
// cross-module function call. Naming convention matches the existing
// restaurantApplications.events.js / deliveryPartnerApplications.events.js
// pattern (a single exported constant string per event type).
//
// ONE event type covers every order status transition (creation AND
// cancellation), distinguished by the emitted payload's fromStatus/
// toStatus — rather than a separate ORDER_CREATED / ORDER_CANCELLED pair.
// Rationale: any future listener (e.g. notifications, once it grows a
// listener for order events) almost certainly wants to react to "an
// order's status changed" as one concept and branch on the specific
// transition itself, the same way a human reading an order's timeline
// would — not maintain two independent subscriptions that must be kept in
// sync as more transitions are added in Phases 7-9. This can be split
// into more granular event types later without breaking this module's own
// internals, since the emit call sites are centralized in
// orders.service.js.
const ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED';

module.exports = { ORDER_STATUS_CHANGED };