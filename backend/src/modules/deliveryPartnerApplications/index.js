// src/modules/deliveryPartnerApplications/index.js
const service = require('./deliveryPartnerApplications.service');

module.exports = {
  getOwnApplication: service.getOwnApplication,
};