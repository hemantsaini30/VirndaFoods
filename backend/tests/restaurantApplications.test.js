// tests/restaurantApplications.test.js
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');
const { truncateAllTables, disconnectPrisma } = require('./setup/dbTestUtils');
const { registerAndLogin } = require('./setup/authTestUtils');
const { createAdminAndLogin } = require('./setup/adminTestUtils');

beforeEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await disconnectPrisma();
});

function submitApplication(accessToken, overrides = {}) {
  return request(app)
    .post('/api/v1/restaurant-applications')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Test Restaurant',
      address: '123 Main Street',
      city: 'Delhi',
      ...overrides,
    });
}

// The notifications listener runs off eventBus.emit() without being
// awaited by the caller (see restaurantApplications.service.js), so the
// Notification row can land a beat after the HTTP response returns. Poll
// briefly instead of asserting immediately, to avoid a flaky test.
async function waitForNotification(userId, type) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const notification = await prisma.notification.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });
    if (notification) return notification;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

describe('POST /api/v1/restaurant-applications', () => {
  it('lets a CUSTOMER submit an application, starting PENDING', async () => {
    const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });

    const res = await submitApplication(accessToken);

    expect(res.status).toBe(201);
    expect(res.body.application.status).toBe('PENDING');
    expect(res.body.application.name).toBe('Test Restaurant');
  });

  it('rejects a second active application with 409', async () => {
    const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });

    const first = await submitApplication(accessToken);
    expect(first.status).toBe(201);

    const second = await submitApplication(accessToken, { name: 'Another Restaurant' });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('rejects a request with no access token with 401', async () => {
    const res = await request(app).post('/api/v1/restaurant-applications').send({
      name: 'Test Restaurant',
      address: '123 Main Street',
      city: 'Delhi',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/restaurant-applications/me', () => {
  it("returns the applicant's own latest application", async () => {
    const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });
    await submitApplication(accessToken);

    const res = await request(app)
      .get('/api/v1/restaurant-applications/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('PENDING');
  });

  it('returns null when the user has never applied', async () => {
    const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });

    const res = await request(app)
      .get('/api/v1/restaurant-applications/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.application).toBeNull();
  });
});

describe('GET /api/v1/restaurant-applications (admin list)', () => {
  it('blocks a non-admin with 403', async () => {
    const { accessToken } = await registerAndLogin({ role: 'CUSTOMER' });

    const res = await request(app)
      .get('/api/v1/restaurant-applications')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('lets an admin list applications, filtered by status', async () => {
    const { accessToken: customerToken } = await registerAndLogin({ role: 'CUSTOMER' });
    await submitApplication(customerToken);
    const { accessToken: adminToken } = await createAdminAndLogin();

    const res = await request(app)
      .get('/api/v1/restaurant-applications?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].status).toBe('PENDING');
  });
});

describe('PATCH /api/v1/restaurant-applications/:id/status', () => {
  it('blocks a non-admin with 403', async () => {
    const { accessToken: customerToken } = await registerAndLogin({ role: 'CUSTOMER' });
    const submitRes = await submitApplication(customerToken);

    const res = await request(app)
      .patch(`/api/v1/restaurant-applications/${submitRes.body.application.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'UNDER_REVIEW' });

    expect(res.status).toBe(403);
  });

  it('rejects an invalid transition (PENDING -> APPROVED) with 409', async () => {
    const { accessToken: customerToken } = await registerAndLogin({ role: 'CUSTOMER' });
    const submitRes = await submitApplication(customerToken);
    const { accessToken: adminToken } = await createAdminAndLogin();

    const res = await request(app)
      .patch(`/api/v1/restaurant-applications/${submitRes.body.application.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('allows the PENDING -> REJECTED shortcut', async () => {
    const { accessToken: customerToken } = await registerAndLogin({ role: 'CUSTOMER' });
    const submitRes = await submitApplication(customerToken);
    const { accessToken: adminToken } = await createAdminAndLogin();

    const res = await request(app)
      .patch(`/api/v1/restaurant-applications/${submitRes.body.application.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED', reviewNote: 'Not a fit.' });

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('REJECTED');
    expect(res.body.application.reviewNote).toBe('Not a fit.');
  });

  it('walks the full PENDING -> UNDER_REVIEW -> APPROVED path, creating a linked Restaurant atomically', async () => {
    const { accessToken: customerToken, user: customer } = await registerAndLogin({
      role: 'CUSTOMER',
    });
    const submitRes = await submitApplication(customerToken);
    const applicationId = submitRes.body.application.id;
    const { accessToken: adminToken } = await createAdminAndLogin();

    const underReviewRes = await request(app)
      .patch(`/api/v1/restaurant-applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'UNDER_REVIEW' });
    expect(underReviewRes.status).toBe(200);
    expect(underReviewRes.body.application.status).toBe('UNDER_REVIEW');

    const approvedRes = await request(app)
      .patch(`/api/v1/restaurant-applications/${applicationId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(approvedRes.status).toBe(200);
    expect(approvedRes.body.application.status).toBe('APPROVED');

    const restaurant = await prisma.restaurant.findUnique({ where: { applicationId } });
    expect(restaurant).not.toBeNull();
    expect(restaurant.ownerId).toBe(customer.id);
    expect(restaurant.name).toBe('Test Restaurant');

    const notification = await waitForNotification(customer.id, 'APPLICATION_UPDATE');
    expect(notification).not.toBeNull();
  });
});