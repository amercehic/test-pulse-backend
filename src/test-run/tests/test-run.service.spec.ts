import { PrismaService } from '@db/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';

import { CreateTestRunDto } from '@/test-run/dto/create-test-run.dto';
import { TestRunQueryDto } from '@/test-run/dto/test-run-query.dto';
import { UpdateTestRunDto } from '@/test-run/dto/update-test-run.dto';
import { TestRunService } from '@/test-run/services/test-run.service';

describe('TestRunService', () => {
  let service: TestRunService;
  let prisma: any;

  const mockPrismaService = {
    testRun: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    test: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestRunService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TestRunService>(TestRunService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a test run successfully', async () => {
      const createDto: CreateTestRunDto = {
        name: 'Test Run 1',
        triggeredBy: 'CI/CD Pipeline',
        status: 'passed',
        duration: 120,
        commit: 'abc123',
        branch: 'main',
        framework: 'Playwright',
        browser: 'Chrome',
        browserVersion: '96.0',
        platform: 'Windows',
      };

      const createdTestRun = { id: randomUUID(), ...createDto, tests: [] };

      prisma.testRun.create.mockResolvedValue(createdTestRun);

      const result = await service.create(createDto);

      expect(prisma.testRun.create).toHaveBeenCalledWith({
        data: createDto,
        include: { tests: true },
      });

      expect(result).toEqual(createdTestRun);
    });

    it('should throw an error if Prisma create fails', async () => {
      const createDto: CreateTestRunDto = {
        name: 'Test Run 2',
        triggeredBy: 'Manual Trigger',
        status: 'failed',
        duration: 180,
        commit: 'xyz123',
        branch: 'develop',
        framework: 'Jest',
        browser: 'Firefox',
        browserVersion: '89.0',
        platform: 'Linux',
      };

      prisma.testRun.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow('Database error');
      expect(prisma.testRun.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should retrieve all test runs', async () => {
      const query: TestRunQueryDto = {};

      const mockData = [
        { id: randomUUID(), name: 'Run 1', tests: [] },
        { id: randomUUID(), name: 'Run 2', tests: [] },
      ];
      const mockTotal = 2;

      prisma.testRun.findMany.mockResolvedValue(mockData);
      prisma.testRun.count.mockResolvedValue(mockTotal);

      const result = await service.findAll(query);

      expect(prisma.testRun.findMany).toHaveBeenCalled();
      expect(result).toEqual({ data: mockData, total: mockTotal });
    });

    it('should throw an error if Prisma findMany fails', async () => {
      prisma.testRun.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll({})).rejects.toThrow('Database error');
      expect(prisma.testRun.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should retrieve a test run by ID', async () => {
      const id = randomUUID();
      const mockTestRun = {
        id,
        name: 'Run 1',
        tests: [{ id: randomUUID(), name: 'Test 1', previousRun: null }],
      };

      prisma.testRun.findUnique.mockResolvedValue(mockTestRun);

      const result = await service.findOne(id);

      expect(prisma.testRun.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { tests: { include: { previousRun: true } } },
      });

      expect(result).toEqual(mockTestRun);
    });

    it('should throw NotFoundException if test run does not exist', async () => {
      const id = randomUUID();
      prisma.testRun.findUnique.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a test run', async () => {
      const id = randomUUID();
      const updateDto: UpdateTestRunDto = {
        name: 'Updated Run 1',
        status: 'failed',
      };

      const updatedTestRun = {
        id,
        ...updateDto,
      };

      prisma.testRun.update.mockResolvedValue(updatedTestRun);

      const result = await service.update(id, updateDto);

      expect(prisma.testRun.update).toHaveBeenCalledWith({
        where: { id },
        data: updateDto,
      });

      expect(result).toEqual(updatedTestRun);
    });

    it('should throw an error if Prisma update fails', async () => {
      const id = randomUUID();
      const updateDto: UpdateTestRunDto = {
        name: 'Run 3',
        status: 'passed',
      };

      prisma.testRun.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update(id, updateDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('remove', () => {
    it('should delete a test run successfully', async () => {
      const id = randomUUID();

      prisma.testRun.delete.mockResolvedValue({ id });

      await service.remove(id);

      expect(prisma.testRun.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException if test run does not exist', async () => {
      const id = randomUUID();

      prisma.testRun.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.remove(id)).rejects.toThrow(
        `TestRun with ID ${id} not found`,
      );
    });

    it('should throw an error if Prisma delete fails with other errors', async () => {
      const id = randomUUID();

      prisma.testRun.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(id)).rejects.toThrow('Database error');
    });
  });
});
