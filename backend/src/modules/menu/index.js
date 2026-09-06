// No other module currently needs to call into `menu` — this file exists
// for consistency with the module convention (every module gets an
// index.js declaring its public interface) and so a future module (e.g.
// a future `cart` module needing to look up a FoodItem's current price)
// has a clear, sanctioned place to add an export rather than reaching
// into menu.repository.js directly.
module.exports = {};