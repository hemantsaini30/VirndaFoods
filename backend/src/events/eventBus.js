// src/events/eventBus.js
//
// A minimal internal event bus, built on Node's built-in EventEmitter.
// Purpose: when Module A needs something to happen as a SIDE EFFECT of its
// own action (e.g. "when an order is confirmed, send the customer a
// notification"), but doesn't need a return value back, it emits an event
// here instead of directly importing and calling the notifications module.
//
// Why this matters for our "modular monolith" architecture: Module A stays
// completely unaware that Module B even exists. Later, if Module B needs to
// become its own microservice, only the event bus subscription needs to
// move to a real message queue — Module A's code doesn't change at all.
//
// No business events are published yet in Phase 1 — this file exists now so
// the convention and folder are established before any module needs it.

const { EventEmitter } = require('events');

const eventBus = new EventEmitter();

// Raise the default limit since many modules may subscribe to the same event
// (e.g. both notifications and delivery-assignment may listen to ORDER_STATUS_CHANGED).
eventBus.setMaxListeners(50);

module.exports = eventBus;
