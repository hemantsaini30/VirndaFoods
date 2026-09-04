// src/sockets/index.js
//
// Minimal Socket.IO wiring for Phase 1: the server accepts connections, and
// that's it. Authentication on the handshake, room-joining, and every actual
// event (order tracking, driver location, assignment offers) are implemented
// in Phase 10 per the Socket.IO event plan from Phase 0. Setting this up now
// just proves the server can accept socket connections at all.

const { Server } = require('socket.io');
const env = require('./../config/env');
const { logger } = require('../utils/logger');

function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected (no auth/events wired yet)');

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket disconnected');
    });
  });

  return io;
}

module.exports = { attachSocketServer };
