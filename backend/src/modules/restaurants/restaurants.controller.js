const service = require('./restaurants.service');

async function getOne(req, res, next) {
  try {
    const restaurant = await service.getById(req.params.id);
    res.status(200).json({ restaurant });
  } catch (err) {
    next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const restaurant = await service.getByOwnerId(req.user.id);
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

async function list(req, res, next) {
  try {
    const result = await service.list(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function listAdmin(req, res, next) {
  try {
    const result = await service.listAdmin(req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const restaurant = await service.updateProfile(req.params.id, req.user.id, req.body);
    res.status(200).json({ restaurant });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOne, getMine, updateStatus, list, listAdmin, updateProfile };