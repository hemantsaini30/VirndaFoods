const { z } = require('zod');

// ── Param schemas ──────────────────────────────────────────────────────

const restaurantIdParamSchema = z.object({
  id: z.string().uuid('Invalid restaurant id.'),
});

const categoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category id.'),
});

const itemIdParamSchema = z.object({
  id: z.string().uuid('Invalid food item id.'),
});

// ── Query schemas ───────────────────────────────────────────────────────

// GET /restaurants/:id/menu — includeUnavailable is a plain string from
// the query string ("true"/"false"); actual authorization to honor it
// (must be the owning RESTAURANT_OWNER) is checked in the service layer,
// not here — this schema only validates the shape of the input.
const getMenuQuerySchema = z.object({
  includeUnavailable: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

// ── Category schemas ────────────────────────────────────────────────────

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

// ── Food item schemas ───────────────────────────────────────────────────

// Price arrives from the client in rupees (a human-facing decimal, e.g.
// 249.5) and is converted to paise in the service layer via
// shared/money.js — never accepted directly as paise from a client, and
// never trusted as a total without server-side recalculation once Orders
// exists (Phase 6+).
const createFoodItemSchema = z.object({
  categoryId: z.string().uuid('Invalid category id.'),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().url('imageUrl must be a valid URL.').optional(),
  priceInRupees: z.coerce.number().positive('Price must be greater than 0.'),
});

// version is REQUIRED here — this is the optimistic-locking read-back the
// client must send: "I last saw this item at version N, apply my change
// only if it's still at version N." Omitting it is a validation error, not
// an implicit "don't check" — that would silently disable the safety net
// this endpoint exists to establish.
const updateFoodItemSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category id.').optional(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    imageUrl: z.string().url('imageUrl must be a valid URL.').optional(),
    priceInRupees: z.coerce.number().positive('Price must be greater than 0.').optional(),
    version: z.coerce.number().int().min(0),
  })
  .refine(
    (data) => Object.keys(data).filter((k) => k !== 'version').length > 0,
    { message: 'At least one field besides version must be provided.' }
  );

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  version: z.coerce.number().int().min(0),
});

module.exports = {
  restaurantIdParamSchema,
  categoryIdParamSchema,
  itemIdParamSchema,
  getMenuQuerySchema,
  createCategorySchema,
  updateCategorySchema,
  createFoodItemSchema,
  updateFoodItemSchema,
  updateAvailabilitySchema,
};