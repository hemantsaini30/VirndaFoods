// src/modules/notifications/notifications.repository.js
const prisma = require('../../config/prisma');

function createNotification({ userId, type, title, body }) {
  return prisma.notification.create({ data: { userId, type, title, body } });
}

module.exports = { createNotification };