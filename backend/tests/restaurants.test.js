const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');
const { registerAndLogin } = require('./setup/authTestUtils');
const { createAdminAndLogin } = require('./setup/adminTestUtils');

// Helper: creates a Restaurant row directly via Prisma, bypassing the
// application/approval flow (which is exercised elsewhere), since these
// tests care about restaurant listing/editing, not onboarding.
async function createRestaurant({ ownerId, name, city, status = 'ACTIVE' }) {
  // A Restaurant requires a linked RestaurantApplication (applicationId is
  // a required, unique FK) — create the minimal application row first.
  const application = await prisma.restaurantApplication.create({
    data: {
      applicantId: ownerId,
      name,
      address: '123 Test Street',
      city,
      status: 'APPROVED',
    },
  });
  return prisma.restaurant.create({
    data: {
      applicationId: application.id,
      ownerId,
      name,
      address: '123 Test Street',
      city,
      status,
    },
  });
}

describe('Restaurants module — listing and self-edit (Phase 4)', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('GET /restaurants (public listing)', () => {
    it('returns only ACTIVE restaurants by default', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Active Place', city: 'Delhi', status: 'ACTIVE' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Suspended Place', city: 'Delhi', status: 'SUSPENDED' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Closed Place', city: 'Delhi', status: 'CLOSED' });

      const res = await request(app).get('/api/v1/restaurants');

      expect(res.status).toBe(200);
      expect(res.body.restaurants).toHaveLength(1);
      expect(res.body.restaurants[0].name).toBe('Active Place');
    });

    it('filters by city', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Delhi Place', city: 'Delhi' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Mumbai Place', city: 'Mumbai' });

      const res = await request(app).get('/api/v1/restaurants').query({ city: 'Mumbai' });

      expect(res.status).toBe(200);
      expect(res.body.restaurants).toHaveLength(1);
      expect(res.body.restaurants[0].name).toBe('Mumbai Place');
    });

    it('paginates results', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      for (let i = 0; i < 5; i++) {
        await createRestaurant({ ownerId: owner.user.id, name: `Place ${i}`, city: 'Delhi' });
      }

      const res = await request(app).get('/api/v1/restaurants').query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.restaurants).toHaveLength(2);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
    });

    it('is reachable with no authentication at all', async () => {
      const res = await request(app).get('/api/v1/restaurants');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /restaurants/admin', () => {
    it('returns restaurants of every status for an admin caller', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Active', city: 'Delhi', status: 'ACTIVE' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Suspended', city: 'Delhi', status: 'SUSPENDED' });
      const admin = await createAdminAndLogin();

      const res = await request(app)
        .get('/api/v1/restaurants/admin')
        .set('Authorization', `Bearer ${admin.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.restaurants).toHaveLength(2);
    });

    it('supports filtering by status', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Active', city: 'Delhi', status: 'ACTIVE' });
      await createRestaurant({ ownerId: owner.user.id, name: 'Suspended', city: 'Delhi', status: 'SUSPENDED' });
      const admin = await createAdminAndLogin();

      const res = await request(app)
        .get('/api/v1/restaurants/admin')
        .query({ status: 'SUSPENDED' })
        .set('Authorization', `Bearer ${admin.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.restaurants).toHaveLength(1);
      expect(res.body.restaurants[0].name).toBe('Suspended');
    });

    it('rejects a non-admin caller with 403', async () => {
      const customer = await registerAndLogin({ role: 'CUSTOMER' });

      const res = await request(app)
        .get('/api/v1/restaurants/admin')
        .set('Authorization', `Bearer ${customer.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects an unauthenticated caller with 401', async () => {
      const res = await request(app).get('/api/v1/restaurants/admin');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /restaurants/mine', () => {
    it("returns the logged-in owner's own restaurant", async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      await createRestaurant({ ownerId: owner.user.id, name: 'My Place', city: 'Delhi' });

      const res = await request(app)
        .get('/api/v1/restaurants/mine')
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.restaurant.name).toBe('My Place');
      expect(res.body.restaurant.ownerId).toBe(owner.user.id);
    });

    it('returns 404 when the owner has no restaurant yet', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });

      const res = await request(app)
        .get('/api/v1/restaurants/mine')
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(404);
    });

    it('never returns a different owner\'s restaurant', async () => {
      const ownerA = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const ownerB = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      await createRestaurant({ ownerId: ownerA.user.id, name: 'Owner A Place', city: 'Delhi' });

      const res = await request(app)
        .get('/api/v1/restaurants/mine')
        .set('Authorization', `Bearer ${ownerB.accessToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects a non-owner role with 403', async () => {
      const customer = await registerAndLogin({ role: 'CUSTOMER' });

      const res = await request(app)
        .get('/api/v1/restaurants/mine')
        .set('Authorization', `Bearer ${customer.accessToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects an unauthenticated caller with 401', async () => {
      const res = await request(app).get('/api/v1/restaurants/mine');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /restaurants/:id (owner self-edit)', () => {
    it('allows the owner to update their own restaurant profile', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id, name: 'Old Name', city: 'Delhi' });

      const res = await request(app)
        .patch(`/api/v1/restaurants/${restaurant.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.restaurant.name).toBe('New Name');
    });

    it('returns 403 when a different owner tries to edit it', async () => {
      const ownerA = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const ownerB = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: ownerA.user.id, name: 'Owner A Place', city: 'Delhi' });

      const res = await request(app)
        .patch(`/api/v1/restaurants/${restaurant.id}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ name: 'Hijacked Name' });

      expect(res.status).toBe(403);
    });

    it('cannot change status via this endpoint', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id, name: 'Place', city: 'Delhi' });

      const res = await request(app)
        .patch(`/api/v1/restaurants/${restaurant.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ status: 'SUSPENDED', name: 'Still Active Place' });

      // status is not in the Zod schema for this endpoint, so it's
      // silently stripped, not rejected — the update still succeeds for
      // the fields that ARE allowed.
      expect(res.status).toBe(200);
      const fresh = await prisma.restaurant.findUnique({ where: { id: restaurant.id } });
      expect(fresh.status).toBe('ACTIVE');
    });

    it('rejects an empty update body', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id, name: 'Place', city: 'Delhi' });

      const res = await request(app)
        .patch(`/api/v1/restaurants/${restaurant.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});