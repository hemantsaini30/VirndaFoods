// src/modules/restaurants/restaurants.validator.js
const { z } = require('zod');

const updateRestaurantStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED'], {
    errorMap: () => ({ message: 'Status must be ACTIVE, SUSPENDED, or CLOSED.' }),
  }),
});

const restaurantIdParamSchema = z.object({
  id: z.string().uuid('Invalid restaurant id.'),
});

module.exports = { updateRestaurantStatusSchema, restaurantIdParamSchema };