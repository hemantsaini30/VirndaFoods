// src/modules/notifications/index.js
const { registerListeners } = require('./notifications.listener');

// This module has no HTTP routes yet (GET /notifications is still
// deferred per the handoff doc). Its only public interface right now is
// wiring up its event-bus subscriptions, called once from app.js.
module.exports = { registerListeners };