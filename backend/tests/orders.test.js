const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { registerAndLogin } = require('./setup/authTestUtils');
const { createAdminAndLogin } = require('./setup/adminTestUtils');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');

// This file seeds its own restaurant + food item directly via prisma,
// rather than via HTTP (restaurant-application-approval flow) or via an
// assumed test factory helper — no shared fixture/factory file's content
// was pasted in this conversation at the time this was written. Seeding
// directly against the schema (which I have verbatim from the pasted
// handoff) is the safer choice than guessing at an unseen factory's
// signature.
//
// beforeEach(truncateAllTables)/afterAll(disconnectPrisma): required —
// confirmed by inspecting dbTestUtils.js directly. This file originally
// omitted them, which caused a real test-pollution bug (documented in this
// phase's handoff): the "same key + same payload" idempotency test failed
// with orderCount === 3 instead of 1, not because of any bug in the
// idempotency middleware, but because every test in this file was running
// against a database still containing every previous test's rows. Adding
// truncation fixed it outright — confirmed via a diagnostic console.log
// showing first.body.order.id === second.body.order.id (the cache was
// always working correctly) once isolation was in place.

async function seedActiveRestaurantWithItem({ priceInPaise = 25000 } = {}) {
  const owner = await prisma.user.create({
    data: {
      email: `owner-${randomUUID()}@test.local`,
      passwordHash: 'not-used-in-this-test',
      name: 'Test Owner',
      role: 'RESTAURANT_OWNER',
    },
  });

  const application = await prisma.restaurantApplication.create({
    data: {
      applicantId: owner.id,
      name: 'Test Restaurant',
      address: '123 Test St',
      city: 'Testville',
      status: 'APPROVED',
    },
  });

  const restaurant = await prisma.restaurant.create({
    data: {
      applicationId: application.id,
      ownerId: owner.id,
      name: 'Test Restaurant',
      address: '123 Test St',
      city: 'Testville',
      status: 'ACTIVE',
    },
  });

  const category = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Mains' },
  });

  const foodItem = await prisma.foodItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: category.id,
      name: 'Test Thali',
      priceInPaise,
      isAvailable: true,
    },
  });

  return { owner, restaurant, foodItem };
}

async function addToCart(accessToken, foodItemId, quantity = 1) {
  return request(app)
    .post('/api/v1/cart/items')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ foodItemId, quantity });
}

describe('Orders', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('POST /api/v1/orders — happy path', () => {
    it('creates an order with correct price snapshot and a CREATED OrderEvent row', async () => {
      const { foodItem } = await seedActiveRestaurantWithItem({ priceInPaise: 25000 });
      const { accessToken, user } = await registerAndLogin({ role: 'CUSTOMER' });

      await addToCart(accessToken, foodItem.id, 2);

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      expect(res.status).toBe(201);
      expect(res.body.order.status).toBe('CREATED');
      expect(res.body.order.subtotalInPaise).toBe(50000); // 25000 * 2
      expect(res.body.order.deliveryFeeInPaise).toBe(4000);
      expect(res.body.order.totalInPaise).toBe(54000);
      expect(res.body.order.items).toHaveLength(1);
      expect(res.body.order.items[0].priceAtPurchaseInPaise).toBe(25000);

      const events = await prisma.orderEvent.findMany({
        where: { orderId: res.body.order.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].fromStatus).toBeNull();
      expect(events[0].toStatus).toBe('CREATED');
      expect(events[0].triggeredBy).toBe('USER');
      expect(events[0].triggeredById).toBe(user.id);
    });

    it('clears the customer cart after successful order creation', async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(accessToken, foodItem.id, 1);

      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(cartRes.body.cart.items).toHaveLength(0);
      expect(cartRes.body.cart.restaurantId).toBeNull();
    });
  });

  describe('POST /api/v1/orders — validation failures', () => {
    it('rejects order creation with an empty cart', async () => {
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('blocks creation and names the item when a cart item became unavailable', async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(accessToken, foodItem.id, 1);

      await prisma.foodItem.update({
        where: { id: foodItem.id },
        data: { isAvailable: false },
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('Test Thali');
    });

    it('blocks creation when the restaurant is no longer ACTIVE', async () => {
      const { foodItem, restaurant } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(accessToken, foodItem.id, 1);

      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: { status: 'SUSPENDED' },
      });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/orders — idempotency', () => {
    it('returns the cached response and does not create a second order on same key + same payload', async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(accessToken, foodItem.id, 1);

      const key = randomUUID();
      const body = { deliveryAddress: '42 Customer Lane' };

      const first = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', key)
        .send(body);

      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', key)
        .send(body);

      expect(second.status).toBe(201);
      expect(second.body.order.id).toBe(first.body.order.id);

      const orderCount = await prisma.order.count({
        where: { customerId: first.body.order.customerId },
      });
      expect(orderCount).toBe(1);
    });

    it('rejects same key with a different payload', async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(accessToken, foodItem.id, 1);

      const key = randomUUID();

      const first = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', key)
        .send({ deliveryAddress: '42 Customer Lane' });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', key)
        .send({ deliveryAddress: 'A DIFFERENT ADDRESS' });

      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    });

    it('rejects a request missing the Idempotency-Key header', async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(accessToken, foodItem.id, 1);

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deliveryAddress: '42 Customer Lane' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_MISSING');
    });
  });

  describe('GET /api/v1/orders/me and /:id — ownership', () => {
    it("returns only the requesting customer's own orders, and blocks access to another customer's order", async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const customerA = await registerAndLogin({ role: 'CUSTOMER' });
      const customerB = await registerAndLogin({ role: 'CUSTOMER' });

      await addToCart(customerA.accessToken, foodItem.id, 1);
      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerA.accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      const orderId = createRes.body.order.id;

      const listRes = await request(app)
        .get('/api/v1/orders/me')
        .set('Authorization', `Bearer ${customerA.accessToken}`);
      expect(listRes.body.orders).toHaveLength(1);

      const forbiddenRes = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerB.accessToken}`);
      expect(forbiddenRes.status).toBe(404);
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    it('cancels an order in CREATED status and writes a CANCELLED OrderEvent', async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(accessToken, foodItem.id, 1);

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      const orderId = createRes.body.order.id;

      const cancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.order.status).toBe('CANCELLED');

      const events = await prisma.orderEvent.findMany({
        where: { orderId },
        orderBy: { createdAt: 'asc' },
      });
      expect(events).toHaveLength(2);
      expect(events[1].toStatus).toBe('CANCELLED');
      expect(events[1].fromStatus).toBe('CREATED');
    });

    it('rejects cancelling an order that is not in CREATED status with 409', async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(accessToken, foodItem.id, 1);

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      const orderId = createRes.body.order.id;

      await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      const secondCancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(secondCancelRes.status).toBe(409);
    });

    it("allows ADMIN to cancel any customer's order", async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
      const { accessToken: adminToken } = await createAdminAndLogin();
      await addToCart(accessToken, foodItem.id, 1);

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      const orderId = createRes.body.order.id;

      const cancelRes = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.order.status).toBe('CANCELLED');
    });

    it("blocks a different customer from cancelling someone else's order", async () => {
      const { foodItem } = await seedActiveRestaurantWithItem();
      const customerA = await registerAndLogin({ role: 'CUSTOMER' });
      const customerB = await registerAndLogin({ role: 'CUSTOMER' });
      await addToCart(customerA.accessToken, foodItem.id, 1);

      const createRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerA.accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ deliveryAddress: '42 Customer Lane' });

      const orderId = createRes.body.order.id;

      const res = await request(app)
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerB.accessToken}`);

      expect(res.status).toBe(404);
    });
  });
});