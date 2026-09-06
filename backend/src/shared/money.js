// ALL money math lives here — never inline in a service, controller, or
// anywhere else. Money is always stored and passed between backend layers
// as an integer number of paise (the smallest currency unit), never a
// float — floats lose precision on arithmetic in ways that are unacceptable
// for money (e.g. 0.1 + 0.2 !== 0.3 in IEEE 754).
//
// The ONLY place rupees (a decimal, human-facing unit) should appear is at
// the edges: what the client sends in a request body, and what the client
// displays. Everything in between — calculations, storage, comparisons —
// uses paise.

/**
 * Converts a rupee amount (as received from a client request body — a
 * number, e.g. 249.50) into an integer number of paise for storage.
 *
 * Rounds to the nearest paisa to guard against floating-point noise in the
 * input (e.g. 249.50 arriving as 249.49999999999997 after JSON parsing).
 *
 * @param {number} rupees
 * @returns {number} integer paise
 */
function rupeesToPaise(rupees) {
  if (typeof rupees !== 'number' || !Number.isFinite(rupees)) {
    throw new TypeError('rupeesToPaise expects a finite number.');
  }
  if (rupees < 0) {
    throw new RangeError('rupeesToPaise does not accept negative amounts.');
  }
  return Math.round(rupees * 100);
}

/**
 * Converts an integer paise amount (as stored in the database) back into a
 * rupee amount for sending to the client, e.g. for a JSON response.
 *
 * @param {number} paise
 * @returns {number} rupees, with up to 2 decimal places
 */
function paiseToRupees(paise) {
  if (!Number.isInteger(paise)) {
    throw new TypeError('paiseToRupees expects an integer number of paise.');
  }
  return Math.round(paise) / 100;
}

/**
 * Formats an integer paise amount as a display string with the ₹ symbol,
 * e.g. 24950 -> "₹249.50". Convenience wrapper for UI-facing responses;
 * the frontend is also free to format paiseToRupees() output itself.
 *
 * @param {number} paise
 * @returns {string}
 */
function formatPaiseAsRupees(paise) {
  return `₹${paiseToRupees(paise).toFixed(2)}`;
}

module.exports = { rupeesToPaise, paiseToRupees, formatPaiseAsRupees };