import { PrismaService } from '@db/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { AppModule } from '@/app.module'; // ili neki modul koji u sebi ima TestExecutionModule, AuthModule...
import { RetryTestsDto } from '@/test-run/dto/retry-tests.dto';

describe('TestExecutionController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  let testRunId: string;
  let testExecutionId: string;

  const testUser = {
    email: `testexecution-user-${Date.now()}@example.com`,
    password: 'Password123!',
    firstName: 'E2E',
    lastName: 'TestUser',
  };

  const registerUser = async (user: any) => {
    return request(app.getHttpServer()).post('/auth/register').send(user);
  };
  const loginUser = async (user: any) => {
    const data = {
      email: user.email,
      password: user.password,
    };
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(data);
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

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  it('should register and login user', async () => {
    await registerUser(testUser);
    accessToken = await loginUser(testUser);
    expect(accessToken).toBeDefined();
  });

  describe('Setup a TestRun + TestExecution for testing', () => {
    it('should create a TestRun with ephemeral tests', async () => {
      const createDto = {
        name: 'Controller E2E TestRun',
        triggeredBy: 'E2E Tests',
        commit: 'abc123',
        branch: 'main',
        framework: 'Jest',
        browser: 'Chrome',
        browserVersion: '95.0',
        platform: 'Ubuntu',
        tests: [{ name: 'Execution1' }],
      };

      const resp = await request(app.getHttpServer())
        .post('/test-runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto);

      expect(resp.status).toBe(201);
      testRunId = resp.body.id;
      expect(resp.body.testExecutions.length).toBe(1);
      testExecutionId = resp.body.testExecutions[0].id;
      expect(testExecutionId).toBeDefined();
    });
  });

  describe('GET /test-executions/:id', () => {
    it('should get the testExecution by ID', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/test-executions/${testExecutionId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(resp.status).toBe(200);
      expect(resp.body.id).toBe(testExecutionId);
      expect(resp.body.name).toBe('Execution1');
    });

    it('should return 404 for non-existent testExecution ID', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/test-executions/${uuidv4()}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(resp.status).toBe(404);
    });
  });

  describe('GET /test-executions/:testRunId/attempt/:attempt', () => {
    it('should get attempt=1 within that test run', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/test-executions/${testRunId}/attempt/1`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(resp.status).toBe(200);
      expect(resp.body.id).toBe(testExecutionId);
      expect(resp.body.attempt).toBe(1);
      expect(resp.body.testRunId).toBe(testRunId);
    });

    it('should return 404 if no record found for that attempt in run', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/test-executions/${testRunId}/attempt/99`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(resp.status).toBe(404);
    });
  });

  describe('POST /test-executions/retry', () => {
    it('should partial rerun (create new execution with attempt=2)', async () => {
      const retryDto: RetryTestsDto = {
        testRunId,
        testExecutionIds: [testExecutionId],
      };
      const resp = await request(app.getHttpServer())
        .post('/test-executions/retry')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(retryDto);

      expect(resp.status).toBe(201); // jer je to .post – možda 200, ovisi o vašoj default strategiji
      // Vraća testRun s novim executionima
      expect(resp.body.id).toBe(testRunId);
      expect(Array.isArray(resp.body.testExecutions)).toBe(true);
      // Sada bi trebala postojati barem 2 zapisa (attempt=1 i attempt=2)
      const secondAttempt = resp.body.testExecutions.find(
        (exec: { attempt: number }) => exec.attempt === 2,
      );
      expect(secondAttempt).toBeTruthy();
    });

    it('should return 404 if some testExecution IDs are invalid for that run', async () => {
      const retryDto: RetryTestsDto = {
        testRunId,
        testExecutionIds: [uuidv4()], // random ID
      };
      const resp = await request(app.getHttpServer())
        .post('/test-executions/retry')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(retryDto);
      expect(resp.status).toBe(404);
    });
  });

  describe('DELETE /test-executions/:id', () => {
    let newExecutionId: string;

    beforeAll(async () => {
      const execution = await prisma.testExecution.create({
        data: {
          testRunId,
          name: 'DeleteMeTest',
        },
      });
      newExecutionId = execution.id;
    });

    it('should delete the test execution', async () => {
      const resp = await request(app.getHttpServer())
        .delete(`/test-executions/${newExecutionId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(resp.status).toBe(200);
      expect(resp.body.message).toMatch(/deleted successfully/i);
    });

    it('should return 404 if test execution does not exist', async () => {
      const resp = await request(app.getHttpServer())
        .delete(`/test-executions/${uuidv4()}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(resp.status).toBe(404);
    });
  });
});
