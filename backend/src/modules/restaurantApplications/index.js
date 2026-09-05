// src/modules/restaurantApplications/index.js
const service = require('./restaurantApplications.service');

// No other module currently needs to call into this module's service
// layer (the restaurants module is called FROM here on approval, not the
// other way around). Exported now for consistency with the
// module-boundary convention and in case a future phase (e.g. admin
// analytics) needs read access without going through HTTP.
module.exports = {
  getOwnApplication: service.getOwnApplication,
};