// src/modules/restaurantApplications/restaurantApplications.repository.js
const prisma = require('../../config/prisma');

function create({ applicantId, name, address, city, documentsUrl }) {
  return prisma.restaurantApplication.create({
    data: { applicantId, name, address, city, documentsUrl },
  });
}

function findById(id) {
  return prisma.restaurantApplication.findUnique({ where: { id } });
}

function findActiveByApplicant(applicantId) {
  return prisma.restaurantApplication.findFirst({
    where: { applicantId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
  });
}

function findLatestByApplicant(applicantId) {
  return prisma.restaurantApplication.findFirst({
    where: { applicantId },
    orderBy: { createdAt: 'desc' },
  });
}

function findMany(status) {
  return prisma.restaurantApplication.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'asc' },
  });
}

// `tx` lets this write join the caller's Prisma transaction (used when
// approving — see restaurants.repository.createFromApplication).
function updateStatus(tx, id, data) {
  const client = tx || prisma;
  return client.restaurantApplication.update({ where: { id }, data });
}

module.exports = {
  create,
  findById,
  findActiveByApplicant,
  findLatestByApplicant,
  findMany,
  updateStatus,
};