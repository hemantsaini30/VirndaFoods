// src/modules/deliveryPartnerApplications/deliveryPartnerApplications.validator.js
const { z } = require('zod');

const submitDeliveryPartnerApplicationSchema = z.object({
  vehicleType: z.string().min(1, 'Vehicle type is required.').max(50),
  licenseUrl: z.string().url('licenseUrl must be a valid URL.').optional(),
});

const reviewApplicationStatusSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED'], {
    errorMap: () => ({ message: 'Status must be UNDER_REVIEW, APPROVED, or REJECTED.' }),
  }),
  reviewNote: z.string().max(1000).optional(),
});

const listApplicationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
});

const applicationIdParamSchema = z.object({
  id: z.string().uuid('Invalid application id.'),
});

module.exports = {
  submitDeliveryPartnerApplicationSchema,
  reviewApplicationStatusSchema,
  listApplicationsQuerySchema,
  applicationIdParamSchema,
};