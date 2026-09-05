// src/modules/restaurants/restaurants.controller.js
const service = require('./restaurants.service');

async function getOne(req, res, next) {
  try {
    const restaurant = await service.getById(req.params.id);
    res.status(200).json({ restaurant });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const restaurant = await service.updateStatus(req.params.id, req.body.status);
    res.status(200).json({ restaurant });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOne, updateStatus };