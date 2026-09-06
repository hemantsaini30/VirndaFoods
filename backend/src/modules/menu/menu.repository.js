const prisma = require('../../config/prisma');

// ── Categories ───────────────────────────────────────────────────────────

function findCategoriesByRestaurant(restaurantId, { includeUnavailableItems }) {
  return prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { displayOrder: 'asc' },
    include: {
      foodItems: {
        where: includeUnavailableItems ? undefined : { isAvailable: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

function findCategoryById(id) {
  return prisma.menuCategory.findUnique({ where: { id } });
}

function createCategory(restaurantId, data) {
  return prisma.menuCategory.create({
    data: { restaurantId, ...data },
  });
}

function updateCategory(id, data) {
  return prisma.menuCategory.update({ where: { id }, data });
}

function countFoodItemsInCategory(categoryId) {
  return prisma.foodItem.count({ where: { categoryId } });
}

function deleteCategory(id) {
  return prisma.menuCategory.delete({ where: { id } });
}

// ── Food items ───────────────────────────────────────────────────────────

function findItemById(id) {
  return prisma.foodItem.findUnique({ where: { id } });
}

function createItem(restaurantId, data) {
  return prisma.foodItem.create({
    data: { restaurantId, ...data },
  });
}

// Optimistic-locking update. The WHERE clause includes both `id` AND the
// client-supplied `expectedVersion` — so this only matches a row if nobody
// else has changed it since the client last read it. `updateMany` (not
// `update`) is used deliberately: Prisma's `update` throws its own
// "record not found" error when the WHERE doesn't match anything, giving
// us no way to distinguish "wrong id" from "stale version" without a
// second query. `updateMany` instead returns a `{ count }`, which lets the
// service layer check `count === 0` and respond with a clean 409 Conflict
// (see menu.service.js) — a single query, no race window between a "does
// this exist" check and the actual write.
async function updateItemWithVersionCheck(id, expectedVersion, data) {
  const result = await prisma.foodItem.updateMany({
    where: { id, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });
  return result.count; // 0 = conflict (stale version or missing id), 1 = success
}

function countOrderItemsReferencingFoodItem(foodItemId) {
  return prisma.orderItem.count({ where: { foodItemId } });
}

function deleteItem(id) {
  return prisma.foodItem.delete({ where: { id } });
}

module.exports = {
  findCategoriesByRestaurant,
  findCategoryById,
  createCategory,
  updateCategory,
  countFoodItemsInCategory,
  deleteCategory,
  findItemById,
  createItem,
  updateItemWithVersionCheck,
  countOrderItemsReferencingFoodItem,
  deleteItem,
};