import { PrismaService } from '@db/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { AppModule } from '@/app.module';

describe('ApiKeyController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let createdApiKeyId: string;

  const testUser = {
    email: `apikey-user-${Date.now()}@example.com`,
    password: 'Password123!',
    firstName: 'API',
    lastName: 'Test',
  };

  const registerUser = async (user: any) => {
    return request(app.getHttpServer()).post('/auth/register').send(user);
  };

  const loginUser = async (user: any) => {
    const loginDto = { email: user.email, password: user.password };
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginDto);
    return response.body.token;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  it('should register and login primary test user', async () => {
    await registerUser(testUser);
    accessToken = await loginUser(testUser);
    expect(accessToken).toBeDefined();
  });

  describe('POST /api-keys', () => {
    it('should create a new API key', async () => {
      const createDto = { name: 'E2E API Key' };

      const response = await request(app.getHttpServer())
        .post('/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toEqual(createDto.name);
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('createdAt');
      createdApiKeyId = response.body.id;
    });

    it('should return 401 if not authenticated', async () => {
      const createDto = { name: 'E2E API Key' };

      const response = await request(app.getHttpServer())
        .post('/api-keys')
        .send(createDto)
        .expect(401);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('GET /api-keys', () => {
    it("should list API keys for the authenticated user's organization", async () => {
      const response = await request(app.getHttpServer())
        .get('/api-keys')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const found = response.body.find(
        (key: any) => key.id === createdApiKeyId,
      );
      expect(found).toBeDefined();
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-keys')
        .expect(401);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('PATCH /api-keys/:id/regenerate', () => {
    it('should regenerate an existing API key', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api-keys/${createdApiKeyId}/regenerate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdApiKeyId);
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should return 404 if API key is not found', async () => {
      const nonExistentId = uuidv4();
      const response = await request(app.getHttpServer())
        .patch(`/api-keys/${nonExistentId}/regenerate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
      expect(response.body.message).toContain('not found');
    });

    it('should return 401 if regeneration is not authorized', async () => {
      const otherUser = {
        email: `other-user-${Date.now()}@example.com`,
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'User',
      };

      await prisma.user.deleteMany({ where: { email: otherUser.email } });
      await registerUser(otherUser);
      const otherAccessToken = await loginUser(otherUser);
      expect(otherAccessToken).toBeDefined();

      const response = await request(app.getHttpServer())
        .patch(`/api-keys/${createdApiKeyId}/regenerate`)
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .expect(401);
      expect(response.body.message).toContain('Cannot modify API key');

      await prisma.user.delete({ where: { email: otherUser.email } });
    });
  });

  describe('DELETE /api-keys/:id', () => {
    it('should delete an existing API key', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api-keys/${createdApiKeyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 when trying to delete a non-existent API key', async () => {
      const nonExistentId = uuidv4();
      const response = await request(app.getHttpServer())
        .delete(`/api-keys/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
      expect(response.body.message).toContain('not found');
    });
  });
});
