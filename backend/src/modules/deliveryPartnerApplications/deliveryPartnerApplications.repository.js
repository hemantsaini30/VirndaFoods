// src/modules/deliveryPartnerApplications/deliveryPartnerApplications.repository.js
const prisma = require('../../config/prisma');

function create({ applicantId, vehicleType, licenseUrl }) {
  return prisma.deliveryPartnerApplication.create({
    data: { applicantId, vehicleType, licenseUrl },
  });
}

function findById(id) {
  return prisma.deliveryPartnerApplication.findUnique({ where: { id } });
}

function findActiveByApplicant(applicantId) {
  return prisma.deliveryPartnerApplication.findFirst({
    where: { applicantId, status: { in: ['PENDING', 'UNDER_REVIEW'] } },
  });
}

function findLatestByApplicant(applicantId) {
  return prisma.deliveryPartnerApplication.findFirst({
    where: { applicantId },
    orderBy: { createdAt: 'desc' },
  });
}

function findMany(status) {
  return prisma.deliveryPartnerApplication.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'asc' },
  });
}

function updateStatus(tx, id, data) {
  const client = tx || prisma;
  return client.deliveryPartnerApplication.update({ where: { id }, data });
}

module.exports = {
  create,
  findById,
  findActiveByApplicant,
  findLatestByApplicant,
  findMany,
  updateStatus,
};