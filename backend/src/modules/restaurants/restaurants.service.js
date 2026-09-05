// src/modules/restaurants/restaurants.service.js
const repository = require('./restaurants.repository');
const { NotFoundError } = require('../../utils/errors');

async function getById(id) {
  const restaurant = await repository.findById(id);
  if (!restaurant) {
    throw new NotFoundError('Restaurant not found.');
  }
  return restaurant;
}

async function updateStatus(id, status) {
  await getById(id); // throws NotFoundError if it doesn't exist
  return repository.updateStatus(id, status);
}

function createFromApplication(tx, data) {
  return repository.createFromApplication(tx, data);
}

module.exports = { getById, updateStatus, createFromApplication };