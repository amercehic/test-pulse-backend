import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TestRunService } from '@/test-run/services/test-run.service';
import { PrismaService } from '@db/prisma.service';
import { CreateTestRunDto } from '@/test-run/dto/create-test-run.dto';
import { UpdateTestRunDto } from '@/test-run/dto/update-test-run.dto';
import { TestRunQueryDto } from '@/test-run/dto/test-run-query.dto';

describe('TestRunService', () => {
  let service: TestRunService;
  let prisma: any; // Cast as any to bypass TypeScript issues

  // Mock PrismaService
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
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TestRunService>(TestRunService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a test run without tests', async () => {
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
        // No tests
      };

      const createdTestRun = {
        id: 1,
        ...createDto,
        tests: [],
      };

      prisma.testRun.create.mockResolvedValue(createdTestRun);

      const result = await service.create(createDto);

      expect(prisma.testRun.create).toHaveBeenCalledWith({
        data: {
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
        },
        include: { tests: true },
      });

      expect(result).toEqual(createdTestRun);
    });

    it('should create a test run with tests and link previous runs', async () => {
      const createDto: CreateTestRunDto = {
        name: 'Test Run 2',
        triggeredBy: 'Manual Trigger',
        status: 'failed',
        duration: 200,
        commit: 'def456',
        branch: 'develop',
        framework: 'Mocha',
        browser: 'Firefox',
        browserVersion: '89.0',
        platform: 'Linux',
        tests: [
          { name: 'Test 1', status: 'passed', duration: 10, logs: '' },
          { name: 'Test 2', status: 'failed', duration: 10, logs: '' },
        ],
      };

      const previousTest = { id: 10, name: 'Test 1' };

      prisma.test.findFirst
        .mockResolvedValueOnce(previousTest) // For 'Test 1'
        .mockResolvedValueOnce(null); // For 'Test 2'

      const createdTestRun = {
        id: 2,
        ...createDto,
        tests: [
          {
            name: 'Test 1',
            status: 'passed',
            duration: 10,
            logs: '',
            previousRunId: 10,
          },
          {
            name: 'Test 2',
            status: 'failed',
            duration: 10,
            logs: '',
            previousRunId: null,
          },
        ],
      };

      prisma.testRun.create.mockResolvedValue(createdTestRun);

      const result = await service.create(createDto);

      expect(prisma.test.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.test.findFirst).toHaveBeenNthCalledWith(1, {
        where: { name: 'Test 1' },
        orderBy: { id: 'desc' },
      });
      expect(prisma.test.findFirst).toHaveBeenNthCalledWith(2, {
        where: { name: 'Test 2' },
        orderBy: { id: 'desc' },
      });

      expect(prisma.testRun.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Run 2',
          triggeredBy: 'Manual Trigger',
          status: 'failed',
          duration: 200,
          commit: 'def456',
          branch: 'develop',
          framework: 'Mocha',
          browser: 'Firefox',
          browserVersion: '89.0',
          platform: 'Linux',
          tests: {
            create: [
              {
                name: 'Test 1',
                status: 'passed',
                duration: 10,
                logs: '',
                previousRunId: 10,
              },
              {
                name: 'Test 2',
                status: 'failed',
                duration: 10,
                logs: '',
                previousRunId: null,
              },
            ],
          },
        },
        include: { tests: true },
      });

      expect(result).toEqual(createdTestRun);
    });

    it('should throw an error if Prisma create fails', async () => {
      const createDto: CreateTestRunDto = {
        name: 'Test Run 3',
        triggeredBy: 'CI/CD Pipeline',
        status: 'passed',
        duration: 150,
        commit: 'ghi789',
        branch: 'feature',
        framework: 'Jest',
        browser: 'Safari',
        browserVersion: '14.0',
        platform: 'macOS',
      };

      prisma.testRun.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createDto)).rejects.toThrow('Database error');
      expect(prisma.testRun.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should retrieve all test runs with default pagination', async () => {
      const query: TestRunQueryDto = {};

      const mockData = [
        { id: 1, name: 'Run 1', tests: [] },
        { id: 2, name: 'Run 2', tests: [] },
      ];
      const mockTotal = 2;

      prisma.testRun.findMany.mockResolvedValue(mockData);
      prisma.testRun.count.mockResolvedValue(mockTotal);

      const result = await service.findAll(query);

      expect(prisma.testRun.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: { tests: true },
      });

      expect(prisma.testRun.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({ data: mockData, total: mockTotal });
    });

    it('should retrieve test runs with specific query parameters', async () => {
      const query: TestRunQueryDto = {
        status: 'passed',
        framework: 'Jest',
        browser: 'Chrome',
        platform: 'Windows',
        sortBy: 'name',
        order: 'asc',
        page: 2,
        limit: 5,
      };

      const mockData = [
        { id: 6, name: 'Run 6', tests: [] },
        { id: 7, name: 'Run 7', tests: [] },
      ];
      const mockTotal = 7;

      prisma.testRun.findMany.mockResolvedValue(mockData);
      prisma.testRun.count.mockResolvedValue(mockTotal);

      const result = await service.findAll(query);

      expect(prisma.testRun.findMany).toHaveBeenCalledWith({
        where: {
          status: 'passed',
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
        },
        orderBy: { name: 'asc' },
        skip: 5,
        take: 5,
        include: { tests: true },
      });

      expect(prisma.testRun.count).toHaveBeenCalledWith({
        where: {
          status: 'passed',
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
        },
      });

      expect(result).toEqual({ data: mockData, total: mockTotal });
    });

    it('should throw an error if Prisma findMany fails', async () => {
      const query: TestRunQueryDto = {};

      prisma.testRun.findMany.mockRejectedValue(new Error('Database error'));
      prisma.testRun.count.mockResolvedValue(0);

      await expect(service.findAll(query)).rejects.toThrow('Database error');
      expect(prisma.testRun.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should retrieve a test run by ID', async () => {
      const id = 1;
      const mockTestRun = {
        id: 1,
        name: 'Run 1',
        tests: [{ id: 100, name: 'Test 1', previousRun: null }],
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
      const id = 999;
      prisma.testRun.findUnique.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      expect(prisma.testRun.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { tests: { include: { previousRun: true } } },
      });
    });

    it('should throw an error if Prisma findUnique fails', async () => {
      const id = 2;
      prisma.testRun.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(id)).rejects.toThrow('Database error');
      expect(prisma.testRun.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { tests: { include: { previousRun: true } } },
      });
    });
  });

  describe('update', () => {
    it('should update a test run without modifying tests', async () => {
      const id = 1;
      const updateDto: UpdateTestRunDto = {
        name: 'Updated Run 1',
        status: 'failed',
        triggeredBy: 'Manual Trigger',
        duration: 180,
        commit: 'xyz123',
        branch: 'release',
        framework: 'Cypress',
        browser: 'Edge',
        browserVersion: '91.0',
        platform: 'Windows',
      };

      const updatedTestRun = {
        id,
        ...updateDto,
      };

      prisma.testRun.update.mockResolvedValue(updatedTestRun);

      const result = await service.update(id, updateDto);

      expect(prisma.testRun.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          name: 'Updated Run 1',
          status: 'failed',
          triggeredBy: 'Manual Trigger',
          duration: 180,
          commit: 'xyz123',
          branch: 'release',
          framework: 'Cypress',
          browser: 'Edge',
          browserVersion: '91.0',
          platform: 'Windows',
        },
      });

      expect(result).toEqual(updatedTestRun);
    });

    it('should update existing tests and create new tests', async () => {
      const id = 2;
      const updateDto: UpdateTestRunDto = {
        name: 'Updated Run 2',
        status: 'passed',
        triggeredBy: 'Scheduled Trigger',
        duration: 250,
        commit: 'lmn456',
        branch: 'hotfix',
        framework: 'Jest',
        browser: 'Firefox',
        browserVersion: '88.0',
        platform: 'Linux',
        tests: [
          {
            id: 101,
            name: 'Test 1 Updated',
            status: 'passed',
            duration: 10,
            logs: '',
          },
          { name: 'Test 3', status: 'failed', duration: 10, logs: '' },
        ],
      };

      prisma.test.update.mockResolvedValue({
        id: 101,
        name: 'Test 1 Updated',
        status: 'passed',
      });

      prisma.test.create.mockResolvedValue({
        id: 102,
        name: 'Test 3',
        status: 'failed',
        duration: 10,
        logs: '',
        testRunId: id,
      });

      const updatedTestRun = {
        id,
        ...updateDto,
      };

      prisma.testRun.update.mockResolvedValue(updatedTestRun);

      const result = await service.update(id, updateDto);

      expect(prisma.test.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: {
          id: 101,
          name: 'Test 1 Updated',
          status: 'passed',
          duration: 10,
          logs: '',
        },
      });

      expect(prisma.test.create).toHaveBeenCalledWith({
        data: {
          name: 'Test 3',
          status: 'failed',
          duration: 10,
          logs: '',
          testRunId: id,
        },
      });

      expect(prisma.testRun.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          name: 'Updated Run 2',
          status: 'passed',
          triggeredBy: 'Scheduled Trigger',
          duration: 250,
          commit: 'lmn456',
          branch: 'hotfix',
          framework: 'Jest',
          browser: 'Firefox',
          browserVersion: '88.0',
          platform: 'Linux',
        },
      });

      expect(result).toEqual(updatedTestRun);
    });

    it('should throw an error if Prisma update fails', async () => {
      const id = 3;
      const updateDto: UpdateTestRunDto = {
        name: 'Run 3',
        status: 'passed',
        triggeredBy: 'Manual Trigger',
        duration: 300,
        commit: 'opq789',
        branch: 'develop',
        framework: 'Mocha',
        browser: 'Chrome',
        browserVersion: '93.0',
        platform: 'macOS',
      };

      prisma.testRun.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update(id, updateDto)).rejects.toThrow(
        'Database error',
      );

      expect(prisma.testRun.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          name: 'Run 3',
          status: 'passed',
          triggeredBy: 'Manual Trigger',
          duration: 300,
          commit: 'opq789',
          branch: 'develop',
          framework: 'Mocha',
          browser: 'Chrome',
          browserVersion: '93.0',
          platform: 'macOS',
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete a test run successfully', async () => {
      const id = 1;

      prisma.testRun.delete.mockResolvedValue({ id });

      await service.remove(id);

      expect(prisma.testRun.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw NotFoundException if test run does not exist', async () => {
      const id = 2;

      prisma.testRun.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.remove(id)).rejects.toThrow(
        `TestRun with ID ${id} not found`,
      );
      expect(prisma.testRun.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw an error if Prisma delete fails with other errors', async () => {
      const id = 2;

      // Mock a non-P2025 error so the service can re-throw it
      const error = new Error('Database error');
      // Optionally add a code that's not P2025, e.g. 'P2026'
      // (error as any).code = 'P2026';

      prisma.testRun.delete.mockRejectedValue(error);

      await expect(service.remove(id)).rejects.toThrow('Database error');
      expect(prisma.testRun.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });
});
