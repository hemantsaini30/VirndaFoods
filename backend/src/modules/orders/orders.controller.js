const service = require('./orders.service');

async function create(req, res, next) {
  try {
    const order = await service.createOrder(req.user.id, req.body);
    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const result = await service.listOwnOrders(req.user.id, req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const order = await service.getOwnOrder(req.user.id, req.params.id);
    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const order = await service.cancelOrder(req.params.id, req.user);
    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMine, getOne, cancel };