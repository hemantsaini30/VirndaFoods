const prisma = require('../../config/prisma');

// ── Reads (non-transactional; used by GET endpoints) ────────────────────

function findByIdWithDetails(id) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          foodItem: { select: { name: true, imageUrl: true } },
        },
      },
      events: { orderBy: { createdAt: 'asc' } },
    },
  });
}

async function findManyByCustomer(customerId, { skip, take }) {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: { foodItem: { select: { name: true, imageUrl: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.order.count({ where: { customerId } }),
  ]);
  return { orders, total };
}

// ── Writes (transaction-only; every function below REQUIRES a `tx`) ────
//
// Every write in this module happens inside orders.service.js's single
// prisma.$transaction() call — Order creation, OrderItem creation, and
// the first OrderEvent row must all commit together or not at all, per
// the master prompt's append-only-audit rule ("State-column update +
// event-row insert happen in the same DB transaction"). None of these
// functions accept an implicit shared-prisma fallback — a missing `tx`
// argument is a programmer error, not a valid call shape, so there is no
// non-tx variant of any of them to accidentally call instead.

function createOrder(tx, data) {
  return tx.order.create({ data });
}

function createOrderItems(tx, items) {
  // items: array of { orderId, foodItemId, quantity, priceAtPurchaseInPaise }
  return tx.orderItem.createMany({ data: items });
}

function createOrderEvent(tx, data) {
  // data: { orderId, fromStatus, toStatus, triggeredBy, triggeredById, reason, rawPayload }
  return tx.orderEvent.create({ data });
}

// Used by cancelOrder — fetches the order fresh WITHIN the cancellation
// transaction (not via findByIdWithDetails, which is a non-tx read) so
// the status check and the subsequent update both see a consistent view
// inside the same transaction.
function findByIdForUpdate(tx, id) {
  return tx.order.findUnique({ where: { id } });
}

// Optimistic-locking update, following the EXACT pattern already
// established in menu.repository.js's updateItemWithVersionCheck (Phase
// 4) — updateMany (not update) so a version mismatch is detectable via
// the returned count rather than needing a separate existence check.
// Reused here rather than inventing a new concurrency mechanism, per the
// phase brief's explicit instruction.
async function updateStatusWithVersionCheck(tx, id, expectedVersion, newStatus) {
  const result = await tx.order.updateMany({
    where: { id, version: expectedVersion },
    data: { status: newStatus, version: { increment: 1 } },
  });
  return result.count; // 0 = conflict (stale version, or status already changed), 1 = success
}

module.exports = {
  findByIdWithDetails,
  findManyByCustomer,
  createOrder,
  createOrderItems,
  createOrderEvent,
  findByIdForUpdate,
  updateStatusWithVersionCheck,
};