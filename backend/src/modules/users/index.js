// src/modules/users/index.js
const usersService = require('./users.service');

// Public interface other modules may call — e.g. a future orders or
// reviews module needing a lightweight profile lookup for display
// purposes goes through here, never through users.repository.js directly.
module.exports = {
  getOwnProfile: usersService.getOwnProfile,
};