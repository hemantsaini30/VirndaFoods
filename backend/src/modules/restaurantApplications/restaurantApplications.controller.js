// src/modules/restaurantApplications/restaurantApplications.controller.js
const service = require('./restaurantApplications.service');

async function submit(req, res, next) {
  try {
    const application = await service.submitApplication({
      applicantId: req.user.id,
      ...req.body,
    });
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const application = await service.getOwnApplication(req.user.id);
    res.status(200).json({ application: application || null });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const applications = await service.listApplications(req.query.status);
    res.status(200).json({ applications });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const application = await service.reviewApplication({
      applicationId: req.params.id,
      adminId: req.user.id,
      toStatus: req.body.status,
      reviewNote: req.body.reviewNote,
    });
    res.status(200).json({ application });
  } catch (err) {
    next(err);
  }
}

module.exports = { submit, getMine, list, updateStatus };