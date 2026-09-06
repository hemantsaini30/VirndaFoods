// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');

const env = require('./config/env');
const { logger, runWithRequestId } = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const restaurantApplicationsRoutes = require('./modules/restaurantApplications/restaurantApplications.routes');
const deliveryPartnerApplicationsRoutes = require('./modules/deliveryPartnerApplications/deliveryPartnerApplications.routes');
const restaurantsRoutes = require('./modules/restaurants/restaurants.routes');
const {
  restaurantScopedRouter: menuRestaurantScopedRoutes,
  categoryRouter: menuCategoryRoutes,
  itemRouter: menuItemRoutes,
} = require('./modules/menu/menu.routes');
const uploadsRoutes = require('./modules/uploads/uploads.routes');

const { registerListeners: registerNotificationListeners } = require('./modules/notifications');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // required so the browser will send/receive the refresh-token cookie
  })
);
app.use(express.json());
app.use(cookieParser());

// pino-http needs the real pino instance — destructuring { logger } here
// pulls it out of utils/logger's exports object correctly.
app.use(pinoHttp({ logger }));

// Every request now carries its pino-http-generated ID through
// AsyncLocalStorage for the rest of its lifetime, so deeply-nested service
// code can call getContextLogger() and still log with the right requestId
// attached, without threading it through every function signature.
app.use((req, res, next) => {
  runWithRequestId(req.id, next);
});

// Wires up cross-module side effects (application review -> notification)
// via the internal event bus, per the module-boundary rule — this only
// attaches listeners; it does not import restaurantApplications' or
// deliveryPartnerApplications' service/repository layers directly.
registerNotificationListeners();

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/restaurant-applications', restaurantApplicationsRoutes);
app.use('/api/v1/delivery-partner-applications', deliveryPartnerApplicationsRoutes);

// restaurantsRoutes handles GET /, GET /admin, GET /:id, PATCH /:id,
// PATCH /:id/status. menuRestaurantScopedRoutes ADDS GET /:id/menu,
// POST /:id/categories, POST /:id/items onto the SAME /restaurants prefix
// — both routers are mounted here, in this order. Express tries routers
// in mount order and each router internally tries its own routes in
// registration order, so this is safe: restaurantsRoutes' GET /:id won't
// intercept menuRestaurantScopedRoutes' GET /:id/menu, since Express only
// matches a route if the full path matches (":id" alone doesn't match
// ":id/menu").
app.use('/api/v1/restaurants', restaurantsRoutes);
app.use('/api/v1/restaurants', menuRestaurantScopedRoutes);

// Flat category/item routes, per the phase spec (PATCH /categories/:id,
// PATCH /items/:id, etc. — not nested under /restaurants/:id/...).
app.use('/api/v1/categories', menuCategoryRoutes);
app.use('/api/v1/items', menuItemRoutes);

app.use('/api/v1/uploads', uploadsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;