// src/modules/users/users.repository.js
const prisma = require('../../config/prisma');

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

function findById(id) {
  return prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_SELECT });
}

function updateById(id, data) {
  return prisma.user.update({ where: { id }, data, select: PUBLIC_USER_SELECT });
}

module.exports = { PUBLIC_USER_SELECT, findById, updateById };