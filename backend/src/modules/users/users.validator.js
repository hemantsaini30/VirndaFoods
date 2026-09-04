// src/modules/users/users.validator.js
const { z } = require('zod');

const updateProfileSchema = z
  .object({
    name: z.string().min(1, 'Name cannot be empty.').max(100).optional(),
    phone: z.string().min(7).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field (name or phone) must be provided.',
  });

module.exports = { updateProfileSchema };