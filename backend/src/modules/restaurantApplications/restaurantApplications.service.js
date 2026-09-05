// src/modules/restaurantApplications/restaurantApplications.service.js
const prisma = require('../../config/prisma');
const eventBus = require('../../events/eventBus');
const restaurantsModule = require('../restaurants');
const { ConflictError, NotFoundError } = require('../../utils/errors');
const repository = require('./restaurantApplications.repository');
const { RESTAURANT_APPLICATION_STATUS_CHANGED } = require('./restaurantApplications.events');

// Central, single guard function for this state machine (rule #4 of the
// master prompt) — built directly from the CONTEXT HANDOFF's Section 2
// table. PENDING -> REJECTED is the explicit shortcut mentioned there.
const ALLOWED_TRANSITIONS = {
  PENDING: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

function canTransition(fromStatus, toStatus) {
  return Boolean(ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus));
}

async function submitApplication({ applicantId, name, address, city, documentsUrl }) {
  const existingActive = await repository.findActiveByApplicant(applicantId);
  if (existingActive) {
    throw new ConflictError(
      'You already have an active restaurant application. Wait for it to be reviewed before submitting another.'
    );
  }
  return repository.create({ applicantId, name, address, city, documentsUrl });
}

function getOwnApplication(applicantId) {
  // Returns the applicant's most recent application, or null if they've
  // never applied. Even after a REJECTED outcome this still returns that
  // application so the UI can show why — a fresh PENDING/UNDER_REVIEW
  // check for "am I blocked from reapplying" happens in submitApplication.
  return repository.findLatestByApplicant(applicantId);
}

function listApplications(status) {
  return repository.findMany(status);
}

async function reviewApplication({ applicationId, adminId, toStatus, reviewNote }) {
  const application = await repository.findById(applicationId);
  if (!application) {
    throw new NotFoundError('Restaurant application not found.');
  }
  if (!canTransition(application.status, toStatus)) {
    throw new ConflictError(
      `Cannot move a restaurant application from ${application.status} to ${toStatus}.`
    );
  }

  // Status update + (on approval) the new Restaurant row happen in one
  // transaction — an application can never end up APPROVED without a
  // matching live Restaurant, or vice versa.
  const updatedApplication = await prisma.$transaction(async (tx) => {
    const updated = await repository.updateStatus(tx, applicationId, {
      status: toStatus,
      reviewedBy: adminId,
      reviewNote: reviewNote ?? null,
    });

    if (toStatus === 'APPROVED') {
      await restaurantsModule.createFromApplication(tx, {
        applicationId: application.id,
        ownerId: application.applicantId,
        name: application.name,
        address: application.address,
        city: application.city,
      });
    }

    return updated;
  });

  // Emitted only after the transaction commits — if it had rolled back,
  // we never want to have already told the applicant about a decision
  // that didn't actually take effect.
  eventBus.emit(RESTAURANT_APPLICATION_STATUS_CHANGED, {
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