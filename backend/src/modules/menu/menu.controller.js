const service = require('./menu.service');

async function getMenu(req, res, next) {
  try {
    // req.user is only populated if the request went through `authenticate`.
    // The menu route uses an optional-auth middleware so this works for
    // both logged-out public callers and the owner's authenticated view —
    // see menu.routes.js and middleware/optionalAuthenticate.js.
    const categories = await service.getMenu(
      req.params.id,
      req.user || null,
      req.query.includeUnavailable
    );
    res.status(200).json({ categories });
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await service.createCategory(req.params.id, req.user.id, req.body);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await service.updateCategory(req.params.id, req.user.id, req.body);
    res.status(200).json({ category });
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    await service.deleteCategory(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const item = await service.createItem(req.params.id, req.user.id, req.body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const item = await service.updateItem(req.params.id, req.user.id, req.body);
    res.status(200).json({ item });
  } catch (err) {
    next(err);
  }
}

async function updateAvailability(req, res, next) {
  try {
    const item = await service.updateAvailability(req.params.id, req.user.id, req.body);
    res.status(200).json({ item });
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    await service.deleteItem(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  updateAvailability,
  deleteItem,
};