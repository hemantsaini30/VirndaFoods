// src/modules/restaurants/restaurants.repository.js
const prisma = require('../../config/prisma');

function findById(id) {
  return prisma.restaurant.findUnique({ where: { id } });
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

module.exports = { findById, updateStatus, createFromApplication };