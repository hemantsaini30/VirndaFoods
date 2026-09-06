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

  // Status update + (on approval) the applicant's role flip happen in ONE
  // transaction — an application can never end up APPROVED without the
  // applicant actually holding DELIVERY_PARTNER, or else neither change
  // takes effect at all.
  //
  // BUGFIX (mirrors the restaurantApplications fix applied during Phase
  // 4): this role flip was previously missing entirely, exactly like the
  // restaurant-side defect. An approved applicant kept their original
  // role (CUSTOMER or RESTAURANT_OWNER, per the Phase 3 role restriction
  // on who may apply) and could never pass authorize('DELIVERY_PARTNER')
  // on any delivery-partner-authenticated endpoint — meaning an approved
  // driver could never actually act as one. There is no linked "live"
  // record to create here (unlike Restaurant on the other side), so the
  // fix is just the role update alongside the existing status write.
  //
  // Same judgment call as the restaurant side: this goes directly through
  // `tx.user.update(...)` rather than a `users` module export, since
  // `users/index.js` exposes no "update role" function yet. Revisit if a
  // third module ever needs to touch User.role.
  const updatedApplication = await prisma.$transaction(async (tx) => {
    const updated = await repository.updateStatus(tx, applicationId, {
      status: toStatus,
      reviewedBy: adminId,
      reviewNote: reviewNote ?? null,
    });

    if (toStatus === 'APPROVED') {
      await tx.user.update({
        where: { id: application.applicantId },
        data: { role: 'DELIVERY_PARTNER' },
      });
    }

    return updated;
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