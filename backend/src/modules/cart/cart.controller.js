const service = require('./cart.service');

async function getCart(req, res, next) {
  try {
    const cart = await service.getCart(req.user.id);
    res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const cart = await service.addItem(req.user.id, req.body);
    res.status(201).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function updateItemQuantity(req, res, next) {
  try {
    const cart = await service.updateItemQuantity(req.user.id, req.params.id, req.body.quantity);
    res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const cart = await service.removeItem(req.user.id, req.params.id);
    res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

async function clearCart(req, res, next) {
  try {
    const cart = await service.clearCart(req.user.id);
    res.status(200).json({ cart });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addItem, updateItemQuantity, removeItem, clearCart };