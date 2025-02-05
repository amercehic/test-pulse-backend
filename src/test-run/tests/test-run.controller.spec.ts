import { PrismaService } from '@db/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { AppModule } from '@/app.module';

describe('TestRunController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let testRunId: string;

  const testUser = {
    email: `user+${Date.now()}@example.com`,
    password: 'Test1234!',
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

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  const registerUser = async (user: { email: string; password: string }) => {
    return request(app.getHttpServer()).post('/auth/register').send(user);
  };

  const loginUser = async (user: { email: string; password: string }) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user);

    return response.body.token;
  };

  it('should register a user', async () => {
    const response = await registerUser(testUser);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
  });

  it('should login a user', async () => {
    accessToken = await loginUser(testUser);
    expect(accessToken).toBeDefined();
  });

  describe('Test Runs', () => {
    const testRunData = {
      name: 'Sample Test Run',
      triggeredBy: 'CI/CD Pipeline',
      status: 'passed',
      duration: 120,
      commit: 'abc123',
      branch: 'main',
      framework: 'Playwright',
      browser: 'Chrome',
      browserVersion: '96.0',
      platform: 'Windows',
      tests: [
        {
          name: 'Test 1',
          status: 'passed',
          duration: 30,
          logs: 'Test log output...',
        },
      ],
    };

    it('should create a new test run', async () => {
      const response = await request(app.getHttpServer())
        .post('/test-runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testRunData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      testRunId = response.body.id;
    });

    it('should return 400 for invalid test run payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/test-runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ framework: '' }); // Invalid data

      expect(response.status).toBe(400);
    });

    it('should retrieve all test runs', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-runs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter test runs by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-runs?status=passed')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve a test run by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/test-runs/${testRunId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testRunId);
    });

    it('should return 404 for non-existent test run ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/test-runs/${uuidv4()}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should update a test run', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/test-runs/${testRunId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'failed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('failed');
    });

    it('should return 404 when updating a non-existent test run', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/test-runs/${uuidv4()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'failed' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid update payload', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/test-runs/${testRunId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: '' }); // Invalid status

      expect(response.status).toBe(400);
    });

    it('should delete a test run', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/test-runs/${testRunId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 when deleting a non-existent test run', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/test-runs/${uuidv4()}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app.getHttpServer()).get('/test-runs');

      expect(response.status).toBe(401);
    });

    it('should return 403 if token is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-runs')
        .set('Authorization', 'Bearer InvalidToken');

      expect(response.status).toBe(403);
    });
  });
});
