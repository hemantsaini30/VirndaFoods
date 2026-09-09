const { z } = require('zod');

// POST /orders body. Deliberately minimal, per the phase brief — no
// structured address fields (street/city/pincode/etc.), no client-sent
// price/total/restaurantId of any kind. The ENTIRE order (which
// restaurant, which items, what they cost) is derived server-side from
// the customer's cart inside orders.service.js — accepting any of that
// from the client would violate the master prompt's "never trust
// frontend-sent price, total, restaurantId" rule, so this schema
// intentionally has no fields for any of it.
const createOrderSchema = z.object({
  deliveryAddress: z
    .string()
    .trim()
    .min(1, 'A delivery address is required.')
    .max(500, 'Delivery address is too long.'),
});

const orderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order id.'),
});

// GET /orders/me pagination — same shape/defaults as restaurants' public
// listing, for consistency across the API rather than inventing a new
// pagination convention for this one endpoint.
const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

module.exports = {
  createOrderSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
};