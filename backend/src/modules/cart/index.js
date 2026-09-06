// No other module currently needs to call into `cart` — this exists for
// consistency with the module convention. The Orders module (a later
// phase) will very likely need to read a customer's cart contents at
// checkout time, which is the sanctioned place to add an export here
// rather than Orders reaching into cart.repository.js directly.
module.exports = {};