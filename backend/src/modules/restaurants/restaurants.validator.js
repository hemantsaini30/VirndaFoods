const { z } = require('zod');

const updateRestaurantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED'], {
    errorMap: () => ({ message: 'Status must be ACTIVE, SUSPENDED, or CLOSED.' }),
  }),
});

const restaurantIdParamSchema = z.object({
  id: z.string().uuid('Invalid restaurant id.'),
});

// GET /restaurants — public listing. city/status filters are optional;
// status is intentionally NOT accepted here (public callers always get
// ACTIVE-only — see restaurants.service.js). page/limit are coerced from
// query-string strings to numbers, with sane bounds so nobody can request
// an unbounded page size.
const listRestaurantsQuerySchema = z.object({
  city: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /restaurants/admin — ADMIN-only listing. Same pagination, but status
// is a free filter here (including "show me everything" by omitting it).
const listRestaurantsAdminQuerySchema = z.object({
  city: z.string().trim().min(1).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// PATCH /restaurants/:id — owner self-edit. Deliberately excludes `status`
// (ADMIN-only, via the existing PATCH /:id/status endpoint) and
// `applicationId`/`ownerId` (immutable, set once at creation). All fields
// optional since this is a partial update, but at least one must be
// present — enforced via .refine below so an empty body is rejected with a
// clear validation error rather than silently succeeding as a no-op.
const updateRestaurantProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().min(1).max(300).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    imageUrl: z.string().url('imageUrl must be a valid URL.').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

module.exports = {
  updateRestaurantStatusSchema,
  restaurantIdParamSchema,
  listRestaurantsQuerySchema,
  listRestaurantsAdminQuerySchema,
  updateRestaurantProfileSchema,
};