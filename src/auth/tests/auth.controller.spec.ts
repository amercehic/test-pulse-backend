import { PrismaService } from '@db/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: `test+${Date.now()}@example.com`,
    password: 'Test1234!',
    firstName: 'Test',
    lastName: 'User',
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

    const roles = ['admin', 'super'];
    for (const roleName of roles) {
      await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

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

  it('should register a user', async () => {
    const response = await registerUser(testUser);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id');
    userId = response.body.user.id;
  });

  it('should return 409 if email already exists', async () => {
    const response = await registerUser(testUser);
    expect(response.status).toBe(409);
  });

  it('should return 400 for invalid email format', async () => {
    const response = await registerUser({
      email: 'invalid-email',
      password: 'ValidPass123!',
      firstName: 'Invalid',
      lastName: 'Email',
    });
    expect(response.status).toBe(400);
  });

  it('should return 400 for weak password', async () => {
    const response = await registerUser({
      email: 'test2@example.com',
      password: '123',
      firstName: 'Weak',
      lastName: 'Pass',
    });
    expect(response.status).toBe(400);
  });

  it('should login a user', async () => {
    accessToken = await loginUser(testUser);
    expect(accessToken).toBeDefined();
  });

  it('should return 401 for invalid password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: 'WrongPass123!' });
    expect(response.status).toBe(401);
  });

  it('should return 401 for unregistered email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'unregistered@example.com', password: 'Test1234!' });
    expect(response.status).toBe(401);
  });

  it('should return 400 for missing fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({});
    expect(response.status).toBe(400);
  });

  it('should assign the "super" role to a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/assign-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, roleName: 'super' });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty(
      'message',
      `Role super assigned to user ${testUser.email}`,
    );
  });

  it('should return 404 if user does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app.getHttpServer())
      .post('/auth/assign-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId: nonExistentId, roleName: 'super' });
    expect(response.status).toBe(404);
  });

  it('should return 404 if role does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/assign-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, roleName: 'non-existent-role' });
    expect(response.status).toBe(404);
  });

  it('should return 401 if no token is provided', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/assign-role')
      .send({ userId, roleName: 'super' });
    expect(response.status).toBe(401);
  });

  it('should return 403 if token is invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/assign-role')
      .set('Authorization', 'Bearer InvalidToken')
      .send({ userId, roleName: 'super' });
    expect(response.status).toBe(403);
  });

  it('should return 409 if role is already assigned', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/assign-role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ userId, roleName: 'super' });
    expect(response.status).toBe(409);
  });
});
