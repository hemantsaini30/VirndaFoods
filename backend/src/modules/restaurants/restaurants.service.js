const repository = require('./restaurants.repository');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

async function getById(id) {
  const restaurant = await repository.findById(id);
  if (!restaurant) {
    throw new NotFoundError('Restaurant not found.');
  }
  return restaurant;
}

// Resolves the caller's own restaurant by ownerId — backs GET
// /restaurants/mine. Distinct from getById: this is an ownership-scoped
// lookup, not a public-by-id one.
async function getByOwnerId(ownerId) {
  const restaurant = await repository.findByOwnerId(ownerId);
  if (!restaurant) {
    throw new NotFoundError('You do not have a restaurant yet.');
  }
  return restaurant;
}

async function updateStatus(id, status) {
  await getById(id); // throws NotFoundError if it doesn't exist
  return repository.updateStatus(id, status);
}

function createFromApplication(tx, data) {
  return repository.createFromApplication(tx, data);
}

// Public listing. ACTIVE-only is enforced HERE, not left to the caller to
// remember to pass — a customer (or an unauthenticated request) must never
// be able to browse suspended/closed restaurants, regardless of what query
// params arrive. City is an optional case-insensitive filter.
async function list({ city, page, limit }) {
  const where = { status: 'ACTIVE' };
  if (city) {
    where.city = { equals: city, mode: 'insensitive' };
  }
  const skip = (page - 1) * limit;
  const { restaurants, total } = await repository.findMany({ where, skip, take: limit });
  return {
    restaurants,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Admin listing — separate route, separate function. Status is optional
// here (omit it to see every status). This is intentionally NOT the same
// code path as the public `list()` above, so a future change to public
// browsing (e.g. adding a cuisine filter) can never accidentally loosen
// the ACTIVE-only guarantee for public callers.
async function listAdmin({ city, status, page, limit }) {
  const where = {};
  if (city) {
    where.city = { equals: city, mode: 'insensitive' };
  }
  if (status) {
    where.status = status;
  }
  const skip = (page - 1) * limit;
  const { restaurants, total } = await repository.findMany({ where, skip, take: limit });
  return {
    restaurants,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Owner self-edit. A valid JWT is never sufficient on its own — the
// restaurant's actual ownerId must match the requesting user. This check
// lives here (service layer), not in the route/controller, per the master
// prompt's ownership-check rule.
async function updateProfile(id, userId, data) {
  const restaurant = await getById(id); // throws NotFoundError if missing
  if (restaurant.ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to edit this restaurant.');
  }
  return repository.updateProfile(id, data);
}

// Used by the menu module (and any future module) to confirm a restaurant
// both exists, is owned by the given user, AND is ACTIVE — the menu
// module needs all three checks together before allowing any mutation
// (add category, add item, etc.), so it's exposed as one function here
// rather than making every caller re-derive the same three checks.
async function assertOwnerAndActive(restaurantId, userId) {
  const restaurant = await getById(restaurantId); // throws NotFoundError
  if (restaurant.ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to modify this restaurant.');
  }
  if (restaurant.status !== 'ACTIVE') {
    throw new ForbiddenError(
      'This restaurant is not currently active, so its menu cannot be modified.'
    );
  }
  return restaurant;
}

module.exports = {
  getById,
  getByOwnerId,
  updateStatus,
  createFromApplication,
  list,
  listAdmin,
  updateProfile,
  assertOwnerAndActive,
};