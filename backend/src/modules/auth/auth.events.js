// src/modules/auth/auth.events.js
const eventBus = require('../../events/eventBus');

const AUTH_EVENTS = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
};

function emitUserRegistered(payload) {
  eventBus.emit(AUTH_EVENTS.USER_REGISTERED, payload);
}

function emitUserLoggedIn(payload) {
  eventBus.emit(AUTH_EVENTS.USER_LOGGED_IN, payload);
}

function emitUserLoginFailed(payload) {
  eventBus.emit(AUTH_EVENTS.USER_LOGIN_FAILED, payload);
}

module.exports = {
  AUTH_EVENTS,
  emitUserRegistered,
  emitUserLoggedIn,
  emitUserLoginFailed,
};