import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  setupTestContainers,
  teardownTestContainers,
  seedTestData,
} from './setup';
import { PrismaClient } from '../src/generated/prisma';

describe('IRED PropertyOS API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let adminAccessToken: string;
  let adminRefreshToken: string;

  beforeAll(async () => {
    const containers = await setupTestContainers();
    prisma = containers.prisma;
    await seedTestData(prisma);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    const tokens = await loginAsAdmin();
    adminAccessToken = tokens.accessToken;
    adminRefreshToken = tokens.refreshToken;
  }, 60000);

  afterAll(async () => {
    await app?.close();
    await teardownTestContainers();
  }, 30000);

  async function loginAsAdmin(): Promise<{ accessToken: string; refreshToken: string }> {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@123' })
      .expect(201);

    const { userId, devOtp } = loginRes.body;

    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email-otp')
      .send({ userId, otp: devOtp })
      .expect(201);

    return {
      accessToken: verifyRes.body.accessToken,
      refreshToken: verifyRes.body.refreshToken,
    };
  }

  // ─── Health ────────────────────────────────────────────────────────

  describe('Health', () => {
    it('GET /api/v1/health — returns status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
        });
    });
  });

  // ─── Auth Flow ─────────────────────────────────────────────────────

  describe('Auth Flow', () => {
    it('POST /auth/login — rejects invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrong' })
        .expect(401);
    });

    it('POST /auth/login — returns userId, email, requiresOtp, and devOtp on success', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin@123' })
        .expect(201);

      expect(res.body).toMatchObject({
        email: 'admin@test.com',
        requiresOtp: true,
      });
      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('devOtp');
    });

    it('POST /auth/verify-email-otp — rejects invalid OTP', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin@123' })
        .expect(201);

      return request(app.getHttpServer())
        .post('/api/v1/auth/verify-email-otp')
        .send({ userId: loginRes.body.userId, otp: '000000' })
        .expect(401);
    });

    it('POST /auth/verify-email-otp — returns tokens on valid OTP', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin@123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email-otp')
        .send({ userId: loginRes.body.userId, otp: loginRes.body.devOtp })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toMatchObject({
        email: 'admin@test.com',
        role: 'ADMIN',
      });
    });

    it('GET /auth/me — returns user profile with valid token', async () => {
      const { accessToken } = await loginAsAdmin();

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        email: 'admin@test.com',
        fullName: 'Test Admin',
        role: 'ADMIN',
        status: 'active',
      });
      expect(res.body).toHaveProperty('id');
    });

    it('GET /auth/me — returns 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('POST /auth/refresh-token — returns new tokens', async () => {
      const { refreshToken } = await loginAsAdmin();

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('POST /auth/refresh-token — rejects reused refresh token', async () => {
      const { refreshToken } = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);
    });

    it('POST /auth/refresh-token — requires refreshToken field', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh-token')
        .send({})
        .expect(400);
    });

    it('POST /auth/forgot-password — always returns success message', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@test.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('If an account exists');
        });
    });
  });

  // ─── Reference Data ────────────────────────────────────────────────

  describe('Reference Data', () => {
    it('GET /reference/states — returns states', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reference/states')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('GET /reference/property-types — returns property types', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reference/property-types')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.some((p: any) => p.name === 'Office')).toBe(true);
        });
    });

    it('GET /reference/sources — returns sources', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reference/sources')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /reference/availability-statuses — returns availability statuses', () => {
      return request(app.getHttpServer())
        .get('/api/v1/reference/availability-statuses')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.some((a: any) => a.name === 'Available')).toBe(true);
        });
    });
  });

  // ─── Protected Endpoints (401 checks) ──────────────────────────────

  describe('Protected Endpoints', () => {
    it('GET /buildings — returns 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/buildings')
        .expect(401);
    });

    it('GET /clients — returns 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/clients')
        .expect(401);
    });

    it('GET /deals — returns 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/deals')
        .expect(401);
    });

    it('GET /tasks — returns 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tasks')
        .expect(401);
    });

    it('GET /proposals — returns 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/proposals')
        .expect(401);
    });
  });

  // ─── Building CRUD ─────────────────────────────────────────────────

  describe('Building CRUD', () => {
    let createdBuildingId: string;

    it('POST /buildings — creates a building', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/buildings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'E2E Test Building',
          totalFloors: 5,
          totalUnits: 20,
          fullAddress: '123 Test Street, Mumbai',
          latitude: 19.076,
          longitude: 72.8777,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toMatchObject(
        expect.objectContaining({
          name: 'E2E Test Building',
        }),
      );
      createdBuildingId = res.body.id;
    });

    it('GET /buildings — lists buildings and includes created one', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
      const found = res.body.data.find((b: any) => b.id === createdBuildingId);
      expect(found).toBeDefined();
      expect(found.name).toBe('E2E Test Building');
    });

    it('GET /buildings/:id — gets building by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/buildings/${createdBuildingId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          id: createdBuildingId,
          name: 'E2E Test Building',
        }),
      );
    });

    it('GET /buildings/:id — returns 404 for non-existent building', () => {
      return request(app.getHttpServer())
        .get('/api/v1/buildings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    it('PATCH /buildings/:id — updates a building', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/buildings/${createdBuildingId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'E2E Test Building Updated', totalFloors: 10 })
        .expect(200);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          name: 'E2E Test Building Updated',
        }),
      );
    });

    it('DELETE /buildings/:id — soft-deletes a building', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/buildings/${createdBuildingId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deletedAt');
    });

    it('GET /buildings/:id — returns deleted building is hidden from list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/buildings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const found = res.body.data.find((b: any) => b.id === createdBuildingId);
      expect(found).toBeUndefined();
    });
  });

  // ─── Floor and Unit Tests ──────────────────────────────────────────

  describe('Floor and Unit Tests', () => {
    let buildingId: string;
    let floorId: string;
    let unitId: string;

    beforeAll(async () => {
      const buildingRes = await request(app.getHttpServer())
        .post('/api/v1/buildings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Floor Test Building', totalFloors: 3, totalUnits: 6 });
      buildingId = buildingRes.body.id;
    });

    it('POST /buildings/:buildingId/floors — creates a floor', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/buildings/${buildingId}/floors`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ floorName: 'Ground Floor', floorNumber: 0, totalArea: 5000 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      floorId = res.body.id;
    });

    it('GET /buildings/:buildingId/floors — lists floors for building', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/buildings/${buildingId}/floors`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((f: any) => f.id === floorId)).toBe(true);
    });

    it('POST /units — creates a unit under the floor', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          buildingId,
          floorId,
          unitNumber: '101',
          carpetArea: 800,
          monthlyRent: 50000,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toMatchObject(
        expect.objectContaining({ unitNumber: '101' }),
      );
      unitId = res.body.id;
    });

    it('GET /units — lists units and includes created one', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/units')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((u: any) => u.id === unitId)).toBe(true);
    });

    it('GET /units/:id — gets unit by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/units/${unitId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toMatchObject(
        expect.objectContaining({ unitNumber: '101' }),
      );
    });

    it('GET /units/:id — returns 404 for non-existent unit', () => {
      return request(app.getHttpServer())
        .get('/api/v1/units/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    it('DELETE /units/:id — soft-deletes unit', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/units/${unitId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deletedAt');
    });
  });

  // ─── Client CRUD ───────────────────────────────────────────────────

  describe('Client CRUD', () => {
    let createdClientId: string;

    it('POST /clients — creates a client', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'E2E Test Client',
          company: 'Test Corp',
          email: 'client@test.com',
          mobileNumber: '9876543210',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toMatchObject(
        expect.objectContaining({
          name: 'E2E Test Client',
          company: 'Test Corp',
        }),
      );
      createdClientId = res.body.id;
    });

    it('GET /clients — lists clients and includes created one', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((c: any) => c.id === createdClientId);
      expect(found).toBeDefined();
      expect(found.name).toBe('E2E Test Client');
    });

    it('GET /clients/:id — gets client by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          id: createdClientId,
          name: 'E2E Test Client',
        }),
      );
    });

    it('GET /clients/:id — returns 404 for non-existent client', () => {
      return request(app.getHttpServer())
        .get('/api/v1/clients/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    it('PATCH /clients/:id — updates a client', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'E2E Test Client Updated', company: 'Updated Corp' })
        .expect(200);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          name: 'E2E Test Client Updated',
          company: 'Updated Corp',
        }),
      );
    });

    it('DELETE /clients/:id — soft-deletes a client', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deletedAt');
    });

    it('POST /clients — rejects missing required field (name)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ email: 'notest@test.com' })
        .expect(400);
    });
  });

  // ─── Task CRUD ─────────────────────────────────────────────────────

  describe('Task CRUD', () => {
    let createdTaskId: string;

    it('POST /tasks — creates a task', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          title: 'E2E Test Task',
          description: 'Test task description',
          type: 'follow_up',
          priority: 'High',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toMatchObject(
        expect.objectContaining({
          title: 'E2E Test Task',
          type: 'follow_up',
          priority: 'High',
        }),
      );
      createdTaskId = res.body.id;
    });

    it('GET /tasks — lists tasks and includes created one', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((t: any) => t.id === createdTaskId);
      expect(found).toBeDefined();
      expect(found.title).toBe('E2E Test Task');
    });

    it('GET /tasks/:id — gets task by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          id: createdTaskId,
          title: 'E2E Test Task',
        }),
      );
    });

    it('GET /tasks/:id — returns 404 for non-existent task', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);
    });

    it('PATCH /tasks/:id — updates task status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          status: 'in_progress',
        }),
      );
    });

    it('PATCH /tasks/:id — updates task priority', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ priority: 'Urgent' })
        .expect(200);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          priority: 'Urgent',
        }),
      );
    });

    it('DELETE /tasks/:id — soft-deletes a task', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deletedAt');
    });

    it('POST /tasks — rejects missing required field (title)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ type: 'general' })
        .expect(400);
    });
  });

  // ─── Swagger ───────────────────────────────────────────────────────

  describe('Swagger', () => {
    it('GET /api/docs-json — returns OpenAPI spec', () => {
      return request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('openapi');
          expect(res.body.info.title).toContain('IRED PropertyOS');
        });
    });
  });
});
