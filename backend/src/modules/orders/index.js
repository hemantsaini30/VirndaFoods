// No other module currently needs to call into `orders`. Kept present
// (rather than omitted entirely) for consistency with the established
// module convention — every module has an index.js as its public-interface
// boundary, even when that surface is currently empty. A future phase
// (e.g. Reviews, which needs to confirm an order was DELIVERED and belongs
// to the reviewing customer) is the expected first real consumer.
module.exports = {};