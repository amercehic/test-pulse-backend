import { PrismaService } from '@db/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RetryTestsDto } from '@/test-run/dto/retry-tests.dto';
import { TestExecutionService } from '@/test-run/services/test-execution.service';

describe('TestExecutionService', () => {
  let service: TestExecutionService;
  let prisma: any;

  const mockPrismaService = {
    testExecution: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn(),
    },
    testRun: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestExecutionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TestExecutionService>(TestExecutionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTestExecution', () => {
    it('should return a test execution when found', async () => {
      const fakeExecution = { id: 'exec1', name: 'Test 1' };
      prisma.testExecution.findUnique.mockResolvedValue(fakeExecution);

      const result = await service.getTestExecution('exec1');

      expect(result).toEqual(fakeExecution);
      expect(prisma.testExecution.findUnique).toHaveBeenCalledWith({
        where: { id: 'exec1' },
      });
    });

    it('should throw NotFoundException when the test execution is not found', async () => {
      prisma.testExecution.findUnique.mockResolvedValue(null);

      await expect(service.getTestExecution('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.testExecution.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
    });
  });

  describe('getAttempt', () => {
    it('should return a test execution for the given run and attempt', async () => {
      const fakeExecution = { id: 'exec1', testRunId: 'run1', attempt: 1 };
      prisma.testExecution.findFirst.mockResolvedValue(fakeExecution);

      const result = await service.getAttempt('run1', 1);

      expect(result).toEqual(fakeExecution);
      expect(prisma.testExecution.findFirst).toHaveBeenCalledWith({
        where: { testRunId: 'run1', attempt: 1 },
      });
    });

    it('should throw NotFoundException if no execution is found for the given attempt', async () => {
      prisma.testExecution.findFirst.mockResolvedValue(null);

      await expect(service.getAttempt('run1', 2)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.testExecution.findFirst).toHaveBeenCalledWith({
        where: { testRunId: 'run1', attempt: 2 },
      });
    });
  });

  describe('retryTests', () => {
    it('should throw NotFoundException if the test run does not exist', async () => {
      const dto: RetryTestsDto = {
        testRunId: 'run1',
        testExecutionIds: ['exec1'],
      };

      prisma.testRun.findUnique.mockResolvedValue(null);

      await expect(service.retryTests(dto)).rejects.toThrow(NotFoundException);
      expect(prisma.testRun.findUnique).toHaveBeenCalledWith({
        where: { id: 'run1' },
      });
    });

    it('should throw NotFoundException if some provided testExecutionIds do not exist in the test run', async () => {
      const dto: RetryTestsDto = {
        testRunId: 'run1',
        testExecutionIds: ['exec1', 'exec2'],
      };
      const fakeTestRun = { id: 'run1' };

      prisma.testRun.findUnique.mockResolvedValueOnce(fakeTestRun);
      prisma.testExecution.findMany.mockResolvedValueOnce([
        {
          id: 'exec1',
          testRunId: 'run1',
          name: 'Test',
          suite: null,
          description: null,
          attempt: 1,
        },
      ]);

      await expect(service.retryTests(dto)).rejects.toThrow(NotFoundException);
      expect(prisma.testRun.findUnique).toHaveBeenCalledWith({
        where: { id: 'run1' },
      });
      expect(prisma.testExecution.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['exec1', 'exec2'] }, testRunId: 'run1' },
      });
    });

    it('should retry tests successfully', async () => {
      const dto: RetryTestsDto = {
        testRunId: 'run1',
        testExecutionIds: ['exec1', 'exec2'],
      };
      const fakeTestRun = { id: 'run1' };
      const oldExecutions = [
        {
          id: 'exec1',
          testRunId: 'run1',
          name: 'Test 1',
          suite: 'Suite1',
          description: 'Desc1',
          attempt: 1,
        },
        {
          id: 'exec2',
          testRunId: 'run1',
          name: 'Test 2',
          suite: 'Suite2',
          description: 'Desc2',
          attempt: 2,
        },
      ];
      const newExecutionsData = [
        {
          testRunId: 'run1',
          name: 'Test 1',
          suite: 'Suite1',
          description: 'Desc1',
          attempt: 2,
          status: 'queued',
          duration: 0,
          logs: null,
          errorMessage: null,
          stackTrace: null,
          screenshotUrl: null,
          videoUrl: null,
          startedAt: null,
          completedAt: null,
        },
        {
          testRunId: 'run1',
          name: 'Test 2',
          suite: 'Suite2',
          description: 'Desc2',
          attempt: 3,
          status: 'queued',
          duration: 0,
          logs: null,
          errorMessage: null,
          stackTrace: null,
          screenshotUrl: null,
          videoUrl: null,
          startedAt: null,
          completedAt: null,
        },
      ];
      const updatedTestRunWithExecutions = {
        id: 'run1',
        testExecutions: [
          { ...newExecutionsData[0], id: 'newExec1' },
          { ...newExecutionsData[1], id: 'newExec2' },
        ],
      };

      prisma.testRun.findUnique.mockResolvedValueOnce(fakeTestRun);
      prisma.testExecution.findMany.mockResolvedValueOnce(oldExecutions);
      prisma.testExecution.createMany.mockResolvedValueOnce({
        count: newExecutionsData.length,
      });
      prisma.testRun.findUnique.mockResolvedValueOnce(
        updatedTestRunWithExecutions,
      );

      const result = await service.retryTests(dto);

      expect(prisma.testRun.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: 'run1' },
      });
      expect(prisma.testExecution.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['exec1', 'exec2'] }, testRunId: 'run1' },
      });
      expect(prisma.testExecution.createMany).toHaveBeenCalledWith({
        data: newExecutionsData,
      });
      expect(prisma.testRun.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: 'run1' },
        include: { testExecutions: true },
      });
      expect(result).toEqual(updatedTestRunWithExecutions);
    });

    it('should rethrow an error if createMany fails', async () => {
      const dto: RetryTestsDto = {
        testRunId: 'run1',
        testExecutionIds: ['exec1'],
      };
      const fakeTestRun = { id: 'run1' };

      prisma.testRun.findUnique.mockResolvedValueOnce(fakeTestRun);
      prisma.testExecution.findMany.mockResolvedValueOnce([
        {
          id: 'exec1',
          testRunId: 'run1',
          name: 'Test 1',
          suite: null,
          description: null,
          attempt: 1,
        },
      ]);
      prisma.testExecution.createMany.mockRejectedValueOnce(
        new Error('CreateMany failed'),
      );

      await expect(service.retryTests(dto)).rejects.toThrow(
        'CreateMany failed',
      );
    });
  });

  describe('remove', () => {
    it('should remove a test execution successfully', async () => {
      const fakeExecution = { id: 'exec1', testRunId: 'run1', name: 'Test 1' };

      prisma.testExecution.findUnique.mockResolvedValueOnce(fakeExecution);
      prisma.testExecution.delete.mockResolvedValueOnce(fakeExecution);

      const result = await service.remove('exec1');

      expect(prisma.testExecution.findUnique).toHaveBeenCalledWith({
        where: { id: 'exec1' },
      });
      expect(prisma.testExecution.delete).toHaveBeenCalledWith({
        where: { id: 'exec1' },
      });
      expect(result).toEqual({
        message: 'TestExecution exec1 deleted successfully',
      });
    });

    it('should throw NotFoundException if the test execution is not found', async () => {
      prisma.testExecution.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.testExecution.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
      });
      expect(prisma.testExecution.delete).not.toHaveBeenCalled();
    });
  });
});
