import { PrismaService } from '@db/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/app.module';

describe('InvitationController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let adminId: string;
  let inviteToken: string;

  const testAdmin = {
    email: `admin+${Date.now()}@example.com`,
    password: 'Admin1234!',
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
    await prisma.user.deleteMany({ where: { email: testAdmin.email } });

    // Create test roles if they don't exist
    const roles = ['admin', 'viewer', 'member'];
    for (const roleName of roles) {
      await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testAdmin.email } });
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

  it('should register an admin user', async () => {
    const response = await registerUser(testAdmin);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('id');
    adminId = response.body.user.id;
  });

  it('should login the admin user', async () => {
    accessToken = await loginUser(testAdmin);
    expect(accessToken).toBeDefined();
  });

  describe('Invitations', () => {
    const inviteeEmail = `invitee+${Date.now()}@example.com`;

    it('should invite a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteeEmail, roleName: 'viewer' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      inviteToken = response.body.token;
    });

    it('should return 409 if the user already has a pending invite', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: inviteeEmail, roleName: 'viewer' });

      expect(response.status).toBe(409);
    });

    it('should return 409 if the user already exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: testAdmin.email, roleName: 'viewer' });

      expect(response.status).toBe(409);
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations')
        .send({
          email: `new+${Date.now()}@example.com`,
          roleName: 'viewer',
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 if token is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', 'Bearer InvalidToken')
        .send({ email: `new+${Date.now()}@example.com`, roleName: 'viewer' });

      expect(response.status).toBe(403);
    });

    it('should accept an invitation', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations/accept')
        .send({ token: inviteToken, password: 'InviteePass123!' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Invitation accepted successfully');
    });

    it('should return 404 for invalid or expired invitation', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations/accept')
        .send({ token: 'invalid-token', password: 'SomePass123!' });

      expect(response.status).toBe(404);
    });

    it('should get a list of invitations', async () => {
      const response = await request(app.getHttpServer())
        .get('/invitations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should revoke an invitation', async () => {
      const newInvitee = `new+${Date.now()}@example.com`;
      const inviteResponse = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: newInvitee, roleName: 'viewer' });

      const revokeToken = inviteResponse.body.token;

      const response = await request(app.getHttpServer())
        .delete(`/invitations/${revokeToken}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 404 when trying to revoke a non-existent invitation', async () => {
      const response = await request(app.getHttpServer())
        .delete('/invitations/invalid-token')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should update an invitation role', async () => {
      const newInvitee = `update+${Date.now()}@example.com`;
      const inviteResponse = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: newInvitee, roleName: 'viewer' });

      const updateToken = inviteResponse.body.token;

      const response = await request(app.getHttpServer())
        .patch(`/invitations/${updateToken}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ roleName: 'admin' });

      expect(response.status).toBe(200);
    });

    it('should return 404 if invitation is not found when updating', async () => {
      const response = await request(app.getHttpServer())
        .patch('/invitations/invalid-token')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ roleName: 'admin' });

      expect(response.status).toBe(404);
    });
  });
});
