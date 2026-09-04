// src/modules/users/users.service.js
const repo = require('./users.repository');
const { NotFoundError } = require('../../utils/errors');

async function getOwnProfile(userId) {
  const user = await repo.findById(userId);
  if (!user) throw new NotFoundError('User not found.');
  return user;
}

async function updateOwnProfile(userId, updates) {
  // Ownership enforcement: userId is always req.user.id, taken from the
  // verified access token — never from the request body or a URL param.
  // There is no code path in this function that can target another user's
  // row, by construction, not just by convention.
  const user = await repo.findById(userId);
  if (!user) throw new NotFoundError('User not found.');
  return repo.updateById(userId, updates);
}

module.exports = { getOwnProfile, updateOwnProfile };