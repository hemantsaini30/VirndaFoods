const prisma = require('../../config/prisma');

function findById(id) {
  return prisma.restaurant.findUnique({ where: { id } });
}

// Backs GET /restaurants/mine. A RESTAURANT_OWNER currently owns at most
// one Restaurant (the schema doesn't prevent multiple, but nothing in the
// product flow creates more than one per owner today), so findFirst is
// sufficient — if that assumption ever changes, this is the function to
// revisit.
function findByOwnerId(ownerId) {
  return prisma.restaurant.findFirst({ where: { ownerId } });
}

function updateStatus(id, status) {
  return prisma.restaurant.update({ where: { id }, data: { status } });
}

// Called from within restaurantApplications.service's approval transaction
// — `tx` is the Prisma transaction client passed in from there, so this
// write commits atomically with the application-status update. Falls back
// to the plain `prisma` client if no `tx` is given (not currently used
// that way, but keeps the function usable outside a transaction too).
function createFromApplication(tx, { applicationId, ownerId, name, address, city }) {
  const client = tx || prisma;
  return client.restaurant.create({
    data: { applicationId, ownerId, name, address, city },
  });
}

async function findMany({ where, skip, take }) {
  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.restaurant.count({ where }),
  ]);
  return { restaurants, total };
}

function updateProfile(id, data) {
  return prisma.restaurant.update({ where: { id }, data });
}

module.exports = {
  findById,
  findByOwnerId,
  updateStatus,
  createFromApplication,
  findMany,
  updateProfile,
};