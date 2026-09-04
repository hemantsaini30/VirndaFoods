// src/modules/auth/auth.validator.js
const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
  name: z.string().min(1, 'Name is required.').max(100),
  phone: z.string().min(7).max(20).optional(),
  role: z.enum(['CUSTOMER', 'RESTAURANT_OWNER', 'DELIVERY_PARTNER'], {
    errorMap: () => ({
      message: 'Role must be CUSTOMER, RESTAURANT_OWNER, or DELIVERY_PARTNER.',
    }),
  }),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

module.exports = { registerSchema, loginSchema };