jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  };
});

import { PrismaService } from '@db/prisma.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { ApiKeyService } from '../services/api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let prisma: any;

  const dummyUserId = 'dummy-user-id';
  const dummyOrgId = 'dummy-org-id';
  const dummyApiKeyId = 'dummy-api-key-id';

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an API key successfully', async () => {
      const dto: CreateApiKeyDto = { name: 'Test API Key' };

      prisma.user.findUnique.mockResolvedValue({ organizationId: dummyOrgId });

      const createdApiKey = {
        id: dummyApiKeyId,
        name: dto.name,
        createdAt: new Date(),
      };
      prisma.apiKey.create.mockResolvedValue(createdApiKey);

      const result = await service.create(dto, dummyUserId);
      const expectedPlainKey = 'tp_123e4567e89b12d3a456426614174000';

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: dummyUserId },
        select: { organizationId: true },
      });

      expect(prisma.apiKey.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          key: expect.stringMatching(/^\$2b\$10\$/),
          organizationId: dummyOrgId,
          createdBy: dummyUserId,
        },
      });
      expect(result).toEqual({
        id: dummyApiKeyId,
        name: dto.name,
        key: expectedPlainKey,
        createdAt: createdApiKey.createdAt,
      });
    });

    it('should throw UnauthorizedException if user has no organization', async () => {
      const dto: CreateApiKeyDto = { name: 'Test API Key' };

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, dummyUserId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of API keys for the organization', async () => {
      prisma.user.findUnique.mockResolvedValue({ organizationId: dummyOrgId });
      const apiKeys = [
        {
          id: '1',
          name: 'Key1',
          createdAt: new Date(),
          lastUsedAt: new Date(),
          user: { email: 'a@b.com', firstName: 'A', lastName: 'B' },
        },
      ];
      prisma.apiKey.findMany.mockResolvedValue(apiKeys);

      const result = await service.findAll(dummyUserId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: dummyUserId },
        select: { organizationId: true },
      });
      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { organizationId: dummyOrgId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastUsedAt: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(apiKeys);
    });

    it('should throw UnauthorizedException if user has no organization', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findAll(dummyUserId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('regenerate', () => {
    it('should regenerate an API key successfully', async () => {
      const oldApiKey = {
        id: dummyApiKeyId,
        name: 'Old Key',
        createdAt: new Date(),
        user: { organizationId: dummyOrgId },
      };
      prisma.apiKey.findUnique.mockResolvedValueOnce(oldApiKey);
      prisma.user.findUnique.mockResolvedValueOnce({
        organizationId: dummyOrgId,
      });
      const updatedApiKey = {
        id: dummyApiKeyId,
        name: 'Old Key',
        createdAt: oldApiKey.createdAt,
      };
      prisma.apiKey.update.mockResolvedValue(updatedApiKey);

      const result = await service.regenerate(dummyApiKeyId, dummyUserId);
      const expectedPlainNewKey = 'tp_123e4567e89b12d3a456426614174000';

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { id: dummyApiKeyId },
        include: { user: { select: { organizationId: true } } },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: dummyUserId },
        select: { organizationId: true },
      });
      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: dummyApiKeyId },
        data: { key: expect.stringMatching(/^\$2b\$10\$/) },
      });
      expect(result).toEqual({
        id: dummyApiKeyId,
        name: 'Old Key',
        key: expectedPlainNewKey,
        createdAt: oldApiKey.createdAt,
      });
    });

    it('should throw NotFoundException if API key is not found', async () => {
      prisma.apiKey.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.regenerate(dummyApiKeyId, dummyUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user organization does not match API key organization', async () => {
      const oldApiKey = {
        id: dummyApiKeyId,
        name: 'Old Key',
        createdAt: new Date(),
        user: { organizationId: 'different-org' },
      };
      prisma.apiKey.findUnique.mockResolvedValue(oldApiKey);
      prisma.user.findUnique.mockResolvedValue({ organizationId: dummyOrgId });

      await expect(
        service.regenerate(dummyApiKeyId, dummyUserId),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('remove', () => {
    it('should remove the API key successfully', async () => {
      const apiKey = {
        id: dummyApiKeyId,
        name: 'Key to Delete',
        createdAt: new Date(),
        user: { organizationId: dummyOrgId },
      };
      prisma.apiKey.findUnique.mockResolvedValue(apiKey);
      prisma.user.findUnique.mockResolvedValue({ organizationId: dummyOrgId });
      prisma.apiKey.delete.mockResolvedValue(apiKey);

      const result = await service.remove(dummyApiKeyId, dummyUserId);

      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
        where: { id: dummyApiKeyId },
        include: { user: { select: { organizationId: true } } },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: dummyUserId },
        select: { organizationId: true },
      });
      expect(prisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: dummyApiKeyId },
      });
      expect(result).toEqual({
        message: `API key ${apiKey.name} deleted successfully`,
      });
    });

    it('should throw NotFoundException if API key is not found', async () => {
      prisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.remove(dummyApiKeyId, dummyUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException if user organization does not match API key organization for deletion', async () => {
      const apiKey = {
        id: dummyApiKeyId,
        name: 'Key to Delete',
        createdAt: new Date(),
        user: { organizationId: 'different-org' },
      };
      prisma.apiKey.findUnique.mockResolvedValue(apiKey);
      prisma.user.findUnique.mockResolvedValue({ organizationId: dummyOrgId });

      await expect(service.remove(dummyApiKeyId, dummyUserId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateApiKey', () => {
    it('should return null if API key is not found', async () => {
      prisma.apiKey.findMany.mockResolvedValue([]);
      const result = await service.validateApiKey('non-existent-key');
      expect(result).toBeNull();
    });

    it('should update lastUsedAt and return the API key if found', async () => {
      const plainKey = 'tp_123e4567e89b12d3a456426614174000';
      const hashedKey = bcrypt.hashSync(plainKey, 10);

      prisma.apiKey.findMany.mockResolvedValue([
        { key: hashedKey, organizationId: dummyOrgId },
      ]);
      prisma.apiKey.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.validateApiKey(plainKey);

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        select: {
          key: true,
          organizationId: true,
        },
      });
      expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: { key: hashedKey },
        data: { lastUsedAt: expect.any(Date) },
      });
      expect(result).toEqual({ organizationId: dummyOrgId });
    });
  });
});
