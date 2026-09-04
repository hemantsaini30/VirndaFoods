// src/middleware/validate.js
const { ValidationError } = require('../utils/errors');

/**
 * Generic Zod-validation middleware.
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.errors
        .map((e) => `${e.path.join('.') || source}: ${e.message}`)
        .join('; ');
      return next(new ValidationError(message));
    }
    // Replace with the parsed (and, per schema, coerced/stripped) data.
    req[source] = result.data;
    next();
  };
}

module.exports = validate;