// src/modules/restaurantApplications/restaurantApplications.validator.js
const { z } = require('zod');

const submitRestaurantApplicationSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required.').max(150),
  address: z.string().min(1, 'Address is required.').max(300),
  city: z.string().min(1, 'City is required.').max(100),
  documentsUrl: z.string().url('documentsUrl must be a valid URL.').optional(),
});

// PENDING is never a valid *target* status via this endpoint — an
// application starts there automatically, it's never transitioned back to.
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
  submitRestaurantApplicationSchema,
  reviewApplicationStatusSchema,
  listApplicationsQuerySchema,
  applicationIdParamSchema,
};