const repository = require('./menu.repository');
const restaurants = require('../restaurants'); // public interface only — index.js
const { rupeesToPaise, paiseToRupees } = require('../../shared/money');
const {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../utils/errors');

// Converts a FoodItem row's priceInPaise into a client-facing shape that
// also includes priceInRupees, so the frontend never has to do the
// conversion itself or guess at a divisor.
function serializeFoodItem(item) {
  return { ...item, priceInRupees: paiseToRupees(item.priceInPaise) };
}

function serializeCategory(category) {
  return {
    ...category,
    foodItems: category.foodItems.map(serializeFoodItem),
  };
}

// ── Menu read (public + owner views) ───────────────────────────────────

// includeUnavailable is only honored if the requester is actually the
// restaurant's owner — an unauthenticated caller, a different owner, or
// any other role always gets isAvailable:true items only, regardless of
// what query param was sent. This check happens here (service layer), not
// left to the controller to remember.
async function getMenu(restaurantId, requestingUser, includeUnavailableRequested) {
  const restaurant = await restaurants.getById(restaurantId); // throws NotFoundError

  const isOwnerViewing =
    includeUnavailableRequested &&
    requestingUser &&
    requestingUser.role === 'RESTAURANT_OWNER' &&
    restaurant.ownerId === requestingUser.id;

  const categories = await repository.findCategoriesByRestaurant(restaurantId, {
    includeUnavailableItems: isOwnerViewing,
  });

  return categories.map(serializeCategory);
}

// ── Categories ─────────────────────────────────────────────────────────

async function createCategory(restaurantId, userId, data) {
  await restaurants.assertOwnerAndActive(restaurantId, userId); // 404/403 as appropriate
  return repository.createCategory(restaurantId, data);
}

async function getCategoryOrThrow(categoryId) {
  const category = await repository.findCategoryById(categoryId);
  if (!category) {
    throw new NotFoundError('Menu category not found.');
  }
  return category;
}

// Ownership is checked THROUGH the parent restaurant, per the phase spec —
// a category has no ownerId of its own, so we resolve restaurantId from
// the category row first, then defer to the same assertOwnerAndActive used
// everywhere else, rather than duplicating an ownership check here.
async function updateCategory(categoryId, userId, data) {
  const category = await getCategoryOrThrow(categoryId);
  await restaurants.assertOwnerAndActive(category.restaurantId, userId);
  return repository.updateCategory(categoryId, data);
}

// DECISION: block deletion if the category still has food items in it,
// rather than cascading. Cascading would silently delete FoodItem rows
// that might already be referenced by an OrderItem in a future phase (the
// OrderItem table exists in the schema now, even though nothing writes to
// it yet) — "block, make the owner move or delete the items first" is the
// safer default, and matches the same reasoning used below for FoodItem
// hard-deletion. The owner gets a clear 409 telling them why, rather than
// silent data loss.
async function deleteCategory(categoryId, userId) {
  const category = await getCategoryOrThrow(categoryId);
  await restaurants.assertOwnerAndActive(category.restaurantId, userId);

  const itemCount = await repository.countFoodItemsInCategory(categoryId);
  if (itemCount > 0) {
    throw new ConflictError(
      `This category still has ${itemCount} food item(s) in it. Move or delete them before deleting the category.`
    );
  }
  return repository.deleteCategory(categoryId);
}

// ── Food items ─────────────────────────────────────────────────────────

async function createItem(restaurantId, userId, data) {
  await restaurants.assertOwnerAndActive(restaurantId, userId);

  const category = await getCategoryOrThrow(data.categoryId);
  if (category.restaurantId !== restaurantId) {
    throw new ForbiddenError('That category does not belong to this restaurant.');
  }

  const { priceInRupees, ...rest } = data;
  const item = await repository.createItem(restaurantId, {
    ...rest,
    priceInPaise: rupeesToPaise(priceInRupees),
  });
  return serializeFoodItem(item);
}

async function getItemOrThrow(itemId) {
  const item = await repository.findItemById(itemId);
  if (!item) {
    throw new NotFoundError('Food item not found.');
  }
  return item;
}

// The optimistic-locking pattern, explained inline since this is the first
// real use of it in the project:
//
// 1. The client must have last fetched this item (e.g. via GET .../menu)
//    and knows its current `version` number.
// 2. The client sends that version back along with its intended change.
// 3. We attempt the update with a WHERE clause that requires BOTH the id
//    AND that exact version to still match (see
//    updateItemWithVersionCheck in menu.repository.js).
// 4. If nobody else touched the row in the meantime, the version still
//    matches, the update succeeds, and the version is incremented.
// 5. If someone else updated it first (their write already bumped the
//    version), our WHERE no longer matches anything — updateMany returns
//    count: 0 — and we throw a 409 Conflict instead of silently
//    overwriting their change (which is what would happen with a naive
//    "read, then write" approach and no version check at all).
//
// This matters most once real concurrent order contention exists (a
// future phase), but establishing the pattern correctly now — rather than
// bolting it on later — is the point of doing it here.
async function updateItem(itemId, userId, data) {
  const item = await getItemOrThrow(itemId);
  await restaurants.assertOwnerAndActive(item.restaurantId, userId);

  const { version, priceInRupees, categoryId, ...rest } = data;

  if (categoryId) {
    const category = await getCategoryOrThrow(categoryId);
    if (category.restaurantId !== item.restaurantId) {
      throw new ForbiddenError('That category does not belong to this restaurant.');
    }
    rest.categoryId = categoryId;
  }

  if (priceInRupees !== undefined) {
    rest.priceInPaise = rupeesToPaise(priceInRupees);
  }

  const updatedCount = await repository.updateItemWithVersionCheck(itemId, version, rest);
  if (updatedCount === 0) {
    throw new ConflictError(
      'This item was updated elsewhere since you last loaded it. Refresh and try again.'
    );
  }

  const fresh = await getItemOrThrow(itemId);
  return serializeFoodItem(fresh);
}

async function updateAvailability(itemId, userId, { isAvailable, version }) {
  const item = await getItemOrThrow(itemId);
  await restaurants.assertOwnerAndActive(item.restaurantId, userId);

  const updatedCount = await repository.updateItemWithVersionCheck(itemId, version, {
    isAvailable,
  });
  if (updatedCount === 0) {
    throw new ConflictError(
      'This item was updated elsewhere since you last loaded it. Refresh and try again.'
    );
  }

  const fresh = await getItemOrThrow(itemId);
  return serializeFoodItem(fresh);
}

// DECISION: a food item that has ever been ordered (i.e. any OrderItem
// references it) is NOT hard-deletable, even though no phase writes
// OrderItem rows yet — the table and relation already exist in the
// schema, so we check it defensively now rather than retrofitting this
// safety check once Orders actually ships. A restaurant owner should use
// the availability toggle (PATCH /items/:id/availability) to remove an
// item from the live menu without destroying order history that will
// eventually reference it. This is a forward-looking guard, flagged
// explicitly as requested by the phase brief.
async function deleteItem(itemId, userId) {
  const item = await getItemOrThrow(itemId);
  await restaurants.assertOwnerAndActive(item.restaurantId, userId);

  const orderItemCount = await repository.countOrderItemsReferencingFoodItem(itemId);
  if (orderItemCount > 0) {
    throw new ConflictError(
      'This item has been ordered before and cannot be deleted. Use the availability toggle instead.'
    );
  }
  return repository.deleteItem(itemId);
}

module.exports = {
  getMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  updateAvailability,
  deleteItem,
};