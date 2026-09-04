// src/modules/users/users.controller.js
const usersService = require('./users.service');

async function getMe(req, res, next) {
  try {
    const user = await usersService.getOwnProfile(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await usersService.updateOwnProfile(req.user.id, req.body);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, updateMe };