import { PrismaService } from '@db/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';

import { CreateTestRunDto } from '@/test-run/dto/create-test-run.dto';
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
    testExecution: {
      createMany: jest.fn(),
      findMany: jest.fn(),
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
    it('should create a test run successfully (no tests array)', async () => {
      const createDto: CreateTestRunDto = {
        name: 'Test Run 1',
        triggeredBy: 'CI/CD Pipeline',
        commit: 'abc123',
        branch: 'main',
        framework: 'Playwright',
        browser: 'Chrome',
        browserVersion: '96.0',
        platform: 'Windows',
      };

      const createdTestRun = {
        id: randomUUID(),
        ...createDto,
        status: 'queued',
        duration: 0,
      };

      prisma.testRun.create.mockResolvedValue(createdTestRun);

      const testRunWithExecutions = {
        ...createdTestRun,
        testExecutions: [],
      };
      prisma.testRun.findUnique.mockResolvedValue(testRunWithExecutions);

      const dummyOrgId = 'dummy-org-id';
      const result = await service.create(createDto, dummyOrgId);

      expect(prisma.testRun.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          status: 'queued',
          duration: 0,
          organization: { connect: { id: dummyOrgId } },
        },
      });
      expect(prisma.testExecution.createMany).not.toHaveBeenCalled();
      expect(result).toEqual(testRunWithExecutions);
    });

    it('should create a test run and also create ephemeral tests if provided', async () => {
      const createDto: CreateTestRunDto = {
        name: 'Test Run 2',
        triggeredBy: 'CI/CD Pipeline',
        commit: 'xyz123',
        branch: 'develop',
        framework: 'Jest',
        browser: 'Firefox',
        browserVersion: '89.0',
        platform: 'Linux',
        tests: [
          { name: 'Login works' },
          { name: 'Logout works', suite: 'Authentication' },
        ],
      };

      const createdTestRun = {
        id: randomUUID(),
        ...createDto,
        tests: undefined,
        status: 'queued',
        duration: 0,
      };

      prisma.testRun.create.mockResolvedValue(createdTestRun);

      const testRunWithExecutions = {
        ...createdTestRun,
        testExecutions: [
          {
            id: randomUUID(),
            testRunId: createdTestRun.id,
            name: 'Login works',
            suite: null,
            description: null,
            attempt: 1,
            status: 'queued',
          },
          {
            id: randomUUID(),
            testRunId: createdTestRun.id,
            name: 'Logout works',
            suite: 'Authentication',
            description: null,
            attempt: 1,
            status: 'queued',
          },
        ],
      };

      prisma.testRun.findUnique.mockResolvedValue(testRunWithExecutions);
      prisma.testExecution.createMany.mockResolvedValue({ count: 2 });

      const dummyOrgId = 'dummy-org-id';
      const result = await service.create(createDto, dummyOrgId);

      expect(prisma.testRun.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          tests: undefined,
          status: 'queued',
          duration: 0,
          organization: { connect: { id: dummyOrgId } },
        },
      });

      expect(prisma.testExecution.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            testRunId: createdTestRun.id,
            name: 'Login works',
            suite: undefined,
            description: undefined,
            status: 'queued',
            attempt: 1,
          }),
          expect.objectContaining({
            testRunId: createdTestRun.id,
            name: 'Logout works',
            suite: 'Authentication',
            description: undefined,
            status: 'queued',
            attempt: 1,
          }),
        ]),
      });

      expect(prisma.testRun.findUnique).toHaveBeenCalledWith({
        where: { id: createdTestRun.id },
        include: { testExecutions: true },
      });
      expect(result).toEqual(testRunWithExecutions);
    });

    it('should throw an error if Prisma create fails', async () => {
      const createDto: CreateTestRunDto = {
        name: 'Test Run X',
        triggeredBy: 'Manual Trigger',
        commit: 'abc',
        branch: 'main',
        framework: 'Jest',
        browser: 'Chrome',
        browserVersion: '100.0',
        platform: 'MacOS',
      };

      prisma.testRun.create.mockRejectedValue(new Error('Database error'));

      const dummyOrgId = 'dummy-org-id';
      await expect(service.create(createDto, dummyOrgId)).rejects.toThrow(
        'Database error',
      );
      expect(prisma.testRun.create).toHaveBeenCalled();
    });
  });
});
