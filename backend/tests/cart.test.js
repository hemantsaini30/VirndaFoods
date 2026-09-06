const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');
const { registerAndLogin } = require('./setup/authTestUtils');

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await disconnectPrisma();
});

// Creates a full Restaurant -> MenuCategory -> FoodItem chain directly via
// Prisma, bypassing onboarding/menu-management endpoints entirely, since
// these tests care about cart behavior, not how the menu got there.
async function createRestaurantWithItem({ ownerId, priceInPaise = 15000, isAvailable = true, restaurantStatus = 'ACTIVE' }) {
  const application = await prisma.restaurantApplication.create({
    data: {
      applicantId: ownerId,
      name: 'Test Restaurant',
      address: '123 Test Street',
      city: 'Delhi',
      status: 'APPROVED',
    },
  });
  const restaurant = await prisma.restaurant.create({
    data: {
      applicationId: application.id,
      ownerId,
      name: 'Test Restaurant',
      address: '123 Test Street',
      city: 'Delhi',
      status: restaurantStatus,
    },
  });
  const category = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: 'Mains' },
  });
  const foodItem = await prisma.foodItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: category.id,
      name: 'Butter Chicken',
      priceInPaise,
      isAvailable,
    },
  });
  return { restaurant, category, foodItem };
}

describe('POST /api/v1/cart/items', () => {
  it('adds an available item to an empty cart', async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(2);
    expect(res.body.cart.items[0].priceInPaise).toBe(15000);
    expect(res.body.cart.totalInPaise).toBe(30000);
  });

  it('rejects adding an unavailable item', async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id, isAvailable: false });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects adding an item whose restaurant is not ACTIVE', async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({
      ownerId: owner.user.id,
      restaurantStatus: 'SUSPENDED',
    });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns a distinguishable CART_RESTAURANT_CONFLICT when adding from a different restaurant', async () => {
    const ownerA = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const ownerB = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem: itemA } = await createRestaurantWithItem({ ownerId: ownerA.user.id });
    const { foodItem: itemB } = await createRestaurantWithItem({ ownerId: ownerB.user.id });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    const first = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: itemA.id, quantity: 1 });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: itemB.id, quantity: 1 });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CART_RESTAURANT_CONFLICT');
  });

  it('succeeds adding from a new restaurant after the cart is cleared', async () => {
    const ownerA = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const ownerB = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem: itemA } = await createRestaurantWithItem({ ownerId: ownerA.user.id });
    const { foodItem: itemB } = await createRestaurantWithItem({ ownerId: ownerB.user.id });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: itemA.id, quantity: 1 });

    const clearRes = await request(app)
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${customer.accessToken}`);
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.cart.items).toHaveLength(0);

    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: itemB.id, quantity: 1 });

    expect(addRes.status).toBe(201);
    expect(addRes.body.cart.items).toHaveLength(1);
    expect(addRes.body.cart.items[0].foodItemId).toBe(itemB.id);
  });

  it('increments quantity instead of duplicating when the same item is added twice', async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 1 });

    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(3);
  });
});

describe('Cart total always reflects live FoodItem price', () => {
  it('reflects a price change made after the item was added to the cart', async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id, priceInPaise: 10000 });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 2 });

    // Price changes directly in the DB, simulating the restaurant owner
    // editing the item's price via the menu module while it's already in
    // someone's cart.
    await prisma.foodItem.update({
      where: { id: foodItem.id },
      data: { priceInPaise: 20000, version: { increment: 1 } },
    });

    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.cart.items[0].priceInPaise).toBe(20000);
    expect(res.body.cart.totalInPaise).toBe(40000); // 20000 * 2, not the stale 10000 * 2
  });
});

describe('PATCH /api/v1/cart/items/:id', () => {
  it('updates quantity for the owning customer', async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 1 });
    const cartItemId = addRes.body.cart.items[0].id;

    const res = await request(app)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.cart.items[0].quantity).toBe(5);
  });

  it('rejects quantity: 0 with a validation error', async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 1 });
    const cartItemId = addRes.body.cart.items[0].id;

    const res = await request(app)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ quantity: 0 });

    expect(res.status).toBe(400);
  });

  it("returns 404 when customer B tries to modify customer A's cart item", async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id });
    const customerA = await registerAndLogin({ role: 'CUSTOMER' });
    const customerB = await registerAndLogin({ role: 'CUSTOMER' });

    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerA.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 1 });
    const cartItemId = addRes.body.cart.items[0].id;

    const res = await request(app)
      .patch(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerB.accessToken}`)
      .send({ quantity: 3 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/cart/items/:id', () => {
  it('removes an item for the owning customer', async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id });
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 1 });
    const cartItemId = addRes.body.cart.items[0].id;

    const res = await request(app)
      .delete(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(0);
  });

  it("returns 404 when customer B tries to delete customer A's cart item", async () => {
    const owner = await registerAndLogin({ role: 'RESTAURANT_OWNER' });
    const { foodItem } = await createRestaurantWithItem({ ownerId: owner.user.id });
    const customerA = await registerAndLogin({ role: 'CUSTOMER' });
    const customerB = await registerAndLogin({ role: 'CUSTOMER' });

    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerA.accessToken}`)
      .send({ foodItemId: foodItem.id, quantity: 1 });
    const cartItemId = addRes.body.cart.items[0].id;

    const res = await request(app)
      .delete(`/api/v1/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerB.accessToken}`);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/cart', () => {
  it('returns an empty cart for a customer who has never added anything', async () => {
    const customer = await registerAndLogin({ role: 'CUSTOMER' });

    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(0);
    expect(res.body.cart.totalInPaise).toBe(0);
  });
});