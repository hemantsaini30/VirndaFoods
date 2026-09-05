// src/modules/deliveryPartnerApplications/deliveryPartnerApplications.service.js
const prisma = require('../../config/prisma');
const eventBus = require('../../events/eventBus');
const { ConflictError, NotFoundError } = require('../../utils/errors');
const repository = require('./deliveryPartnerApplications.repository');
const {
  DELIVERY_PARTNER_APPLICATION_STATUS_CHANGED,
} = require('./deliveryPartnerApplications.events');

// Same shape as restaurantApplications' state machine — kept as its own
// copy (not shared code) since rule #4 requires each stateful entity to
// own its guard function in its own module's service layer, and the two
// are allowed to diverge independently in the future.
const ALLOWED_TRANSITIONS = {
  PENDING: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

function canTransition(fromStatus, toStatus) {
  return Boolean(ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus));
}

async function submitApplication({ applicantId, vehicleType, licenseUrl }) {
  const existingActive = await repository.findActiveByApplicant(applicantId);
  if (existingActive) {
    throw new ConflictError(
      'You already have an active delivery partner application. Wait for it to be reviewed before submitting another.'
    );
  }
  return repository.create({ applicantId, vehicleType, licenseUrl });
}

function getOwnApplication(applicantId) {
  return repository.findLatestByApplicant(applicantId);
}

function listApplications(status) {
  return repository.findMany(status);
}

async function reviewApplication({ applicationId, adminId, toStatus, reviewNote }) {
  const application = await repository.findById(applicationId);
  if (!application) {
    throw new NotFoundError('Delivery partner application not found.');
  }
  if (!canTransition(application.status, toStatus)) {
    throw new ConflictError(
      `Cannot move a delivery partner application from ${application.status} to ${toStatus}.`
    );
  }

  // No linked "live" record to create on approval (there's no
  // DeliveryPartner-specific table yet) — just the status flip. A future
  // phase's driver-assignment logic checks eligibility by querying for an
  // APPROVED application directly, per the Phase 3 prompt's intended
  // future lookup pattern. Still wrapped in $transaction for consistency
  // and to make adding an audit write here later a non-breaking change.
  const updatedApplication = await prisma.$transaction(async (tx) => {
    return repository.updateStatus(tx, applicationId, {
      status: toStatus,
      reviewedBy: adminId,
      reviewNote: reviewNote ?? null,
    });
  });

  eventBus.emit(DELIVERY_PARTNER_APPLICATION_STATUS_CHANGED, {
    applicationId: updatedApplication.id,
    applicantId: updatedApplication.applicantId,
    fromStatus: application.status,
    toStatus: updatedApplication.status,
    reviewNote: updatedApplication.reviewNote,
  });

  return updatedApplication;
}

module.exports = {
  canTransition,
  submitApplication,
  getOwnApplication,
  listApplications,
  reviewApplication,
};