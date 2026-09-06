const { z } = require('zod');

// POST /cart/items — quantity is capped at a sane upper bound (99) purely
// as an abuse guard; there's no product reason to allow an absurd cart
// quantity for a food item.
const addCartItemSchema = z.object({
  foodItemId: z.string().uuid('Invalid food item id.'),
  quantity: z.coerce.number().int().min(1).max(99),
});

// PATCH /cart/items/:id — deliberately does NOT accept quantity: 0.
// Setting a cart item's quantity to zero is conceptually a removal, and
// this API models removal as its own explicit action (DELETE
// /cart/items/:id) rather than overloading PATCH with two meanings. A
// client that sends 0 here gets a clear validation error telling them
// which endpoint to use instead, rather than an ambiguous silent no-op or
// an implicit delete hidden inside an update.
const updateCartItemSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Quantity must be at least 1. Use DELETE /cart/items/:id to remove an item.')
    .max(99),
});

const cartItemIdParamSchema = z.object({
  id: z.string().uuid('Invalid cart item id.'),
});

module.exports = {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemIdParamSchema,
};