const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');
const { registerAndLogin } = require('./setup/authTestUtils');

async function createRestaurant({ ownerId, name = 'Test Restaurant', status = 'ACTIVE' }) {
  const application = await prisma.restaurantApplication.create({
    data: {
      applicantId: ownerId,
      name,
      address: '123 Test Street',
      city: 'Delhi',
      status: 'APPROVED',
    },
  });
  return prisma.restaurant.create({
    data: {
      applicationId: application.id,
      ownerId,
      name,
      address: '123 Test Street',
      city: 'Delhi',
      status,
    },
  });
}

async function createCategory(restaurantId, name = 'Starters') {
  return prisma.menuCategory.create({ data: { restaurantId, name } });
}

async function createFoodItem(restaurantId, categoryId, overrides = {}) {
  return prisma.foodItem.create({
    data: {
      restaurantId,
      categoryId,
      name: 'Test Item',
      priceInPaise: 10000,
      ...overrides,
    },
  });
}

describe('Menu module (Phase 4)', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('GET /restaurants/:id/menu', () => {
    it('returns categories with nested available items for a public caller', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      await createFoodItem(restaurant.id, category.id, { name: 'Available Item', isAvailable: true });
      await createFoodItem(restaurant.id, category.id, { name: 'Unavailable Item', isAvailable: false });

      const res = await request(app).get(`/api/v1/restaurants/${restaurant.id}/menu`);

      expect(res.status).toBe(200);
      expect(res.body.categories).toHaveLength(1);
      expect(res.body.categories[0].foodItems).toHaveLength(1);
      expect(res.body.categories[0].foodItems[0].name).toBe('Available Item');
    });

    it('shows unavailable items too when the owner requests includeUnavailable=true', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      await createFoodItem(restaurant.id, category.id, { name: 'Available Item', isAvailable: true });
      await createFoodItem(restaurant.id, category.id, { name: 'Unavailable Item', isAvailable: false });

      const res = await request(app)
        .get(`/api/v1/restaurants/${restaurant.id}/menu`)
        .query({ includeUnavailable: 'true' })
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.categories[0].foodItems).toHaveLength(2);
    });

    it('does NOT honor includeUnavailable for a non-owner, even if authenticated', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      await createFoodItem(restaurant.id, category.id, { name: 'Unavailable Item', isAvailable: false });
      const customer = await registerAndLogin({ role: 'CUSTOMER' });

      const res = await request(app)
        .get(`/api/v1/restaurants/${restaurant.id}/menu`)
        .query({ includeUnavailable: 'true' })
        .set('Authorization', `Bearer ${customer.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.categories[0].foodItems).toHaveLength(0);
    });

    it('includes priceInRupees converted from priceInPaise', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      await createFoodItem(restaurant.id, category.id, { priceInPaise: 24950 });

      const res = await request(app).get(`/api/v1/restaurants/${restaurant.id}/menu`);

      expect(res.body.categories[0].foodItems[0].priceInRupees).toBe(249.5);
    });
  });

  describe('POST /restaurants/:id/categories', () => {
    it('allows the owner to create a category on an ACTIVE restaurant', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id, status: 'ACTIVE' });

      const res = await request(app)
        .post(`/api/v1/restaurants/${restaurant.id}/categories`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Mains' });

      expect(res.status).toBe(201);
      expect(res.body.category.name).toBe('Mains');
    });

    it('blocks category creation when the restaurant is SUSPENDED', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id, status: 'SUSPENDED' });

      const res = await request(app)
        .post(`/api/v1/restaurants/${restaurant.id}/categories`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Mains' });

      expect(res.status).toBe(403);
    });

    it('returns 403 when a different owner tries to add a category', async () => {
      const ownerA = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const ownerB = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: ownerA.user.id });

      const res = await request(app)
        .post(`/api/v1/restaurants/${restaurant.id}/categories`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`)
        .send({ name: 'Mains' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('blocks deletion when the category still has food items', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      await createFoodItem(restaurant.id, category.id);

      const res = await request(app)
        .delete(`/api/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(409);
    });

    it('allows deletion of an empty category', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);

      const res = await request(app)
        .delete(`/api/v1/categories/${category.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(204);
    });
  });

  describe('POST /restaurants/:id/items — price conversion', () => {
    it('accepts priceInRupees and stores/returns it converted correctly', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);

      const res = await request(app)
        .post(`/api/v1/restaurants/${restaurant.id}/items`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ categoryId: category.id, name: 'Paneer Tikka', priceInRupees: 249.5 });

      expect(res.status).toBe(201);
      expect(res.body.item.priceInPaise).toBe(24950);
      expect(res.body.item.priceInRupees).toBe(249.5);

      const stored = await prisma.foodItem.findUnique({ where: { id: res.body.item.id } });
      expect(stored.priceInPaise).toBe(24950);
    });
  });

  describe('PATCH /items/:id — optimistic locking', () => {
    it('succeeds when the client sends the current version', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      const item = await createFoodItem(restaurant.id, category.id, { version: 0 });

      const res = await request(app)
        .patch(`/api/v1/items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Updated Name', version: 0 });

      expect(res.status).toBe(200);
      expect(res.body.item.name).toBe('Updated Name');
      expect(res.body.item.version).toBe(1);
    });

    it('returns 409 when the client sends a stale version', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      const item = await createFoodItem(restaurant.id, category.id, { version: 0 });

      // Simulate someone else having already updated it (version now 1).
      await prisma.foodItem.update({ where: { id: item.id }, data: { version: 1 } });

      const res = await request(app)
        .patch(`/api/v1/items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Stale Update', version: 0 });

      expect(res.status).toBe(409);

      // Confirm the stale write did NOT apply.
      const fresh = await prisma.foodItem.findUnique({ where: { id: item.id } });
      expect(fresh.name).not.toBe('Stale Update');
    });

    it('requires version in the request body', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      const item = await createFoodItem(restaurant.id, category.id);

      const res = await request(app)
        .patch(`/api/v1/items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'No Version Sent' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /items/:id/availability — optimistic locking', () => {
    it('toggles availability with a correct version', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      const item = await createFoodItem(restaurant.id, category.id, { isAvailable: true, version: 0 });

      const res = await request(app)
        .patch(`/api/v1/items/${item.id}/availability`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ isAvailable: false, version: 0 });

      expect(res.status).toBe(200);
      expect(res.body.item.isAvailable).toBe(false);
    });

    it('returns 409 on a stale version', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      const item = await createFoodItem(restaurant.id, category.id, { version: 0 });
      await prisma.foodItem.update({ where: { id: item.id }, data: { version: 5 } });

      const res = await request(app)
        .patch(`/api/v1/items/${item.id}/availability`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ isAvailable: false, version: 0 });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /items/:id', () => {
    it('deletes an item with no order history', async () => {
      const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: owner.user.id });
      const category = await createCategory(restaurant.id);
      const item = await createFoodItem(restaurant.id, category.id);

      const res = await request(app)
        .delete(`/api/v1/items/${item.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(204);
    });

    it('returns 403 for a non-owning restaurant owner', async () => {
      const ownerA = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const ownerB = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
      const restaurant = await createRestaurant({ ownerId: ownerA.user.id });
      const category = await createCategory(restaurant.id);
      const item = await createFoodItem(restaurant.id, category.id);

      const res = await request(app)
        .delete(`/api/v1/items/${item.id}`)
        .set('Authorization', `Bearer ${ownerB.accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});