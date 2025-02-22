import { PrismaService } from '@db/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

import { TestAnalyticsService } from '../services/test-analytics.service';

describe('TestAnalyticsService', () => {
  let service: TestAnalyticsService;
  let prisma: any;

  const mockPrismaService = {
    testRun: {
      findMany: jest.fn(),
    },
    testExecution: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TestAnalyticsService>(TestAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTestTrends', () => {
    it('should return trends for the given organization with default timeframe', async () => {
      const mockTestRuns = [
        {
          id: '1',
          status: 'completed',
          duration: 100,
          createdAt: new Date('2023-01-01T00:00:00Z'),
          organizationId: 'org-1',
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
          testExecutions: [
            { status: 'passed', duration: 50, identifier: 't1' },
          ],
        },
        {
          id: '2',
          status: 'failed',
          duration: 200,
          createdAt: new Date('2023-01-02T00:00:00Z'),
          organizationId: 'org-1',
          framework: 'Playwright',
          browser: 'Firefox',
          platform: 'Linux',
          testExecutions: [
            { status: 'failed', duration: 200, identifier: 't2' },
          ],
        },
      ];

      const mockTestExecutions = [
        {
          id: 'e1',
          status: 'passed',
          duration: 50,
          identifier: 't1',
          testRun: {
            createdAt: new Date('2023-01-01T00:00:00Z'),
            framework: 'Jest',
            browser: 'Chrome',
          },
        },
        {
          id: 'e2',
          status: 'failed',
          duration: 200,
          identifier: 't2',
          testRun: {
            createdAt: new Date('2023-01-02T00:00:00Z'),
            framework: 'Playwright',
            browser: 'Firefox',
          },
        },
      ];

      prisma.testRun.findMany.mockResolvedValueOnce(mockTestRuns);
      prisma.testExecution.findMany.mockResolvedValueOnce(mockTestExecutions);

      const result = await service.getTestTrends('org-1');

      expect(prisma.testRun.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        include: {
          testExecutions: {
            select: { status: true, duration: true, identifier: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(prisma.testExecution.findMany).toHaveBeenCalledWith({
        where: { testRun: { organizationId: 'org-1' } },
        include: {
          testRun: {
            select: { createdAt: true, framework: true, browser: true },
          },
        },
      });

      // Check that the result has the expected structure
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('statusBreakdown');
      expect(result).toHaveProperty('frameworkStats');
      expect(result).toHaveProperty('browserStats');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('duration');
    });

    it('should apply date filters when provided', async () => {
      const mockTestRuns = [
        {
          id: '1',
          status: 'completed',
          duration: 100,
          createdAt: new Date('2023-01-01T00:00:00Z'),
          organizationId: 'org-1',
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
          testExecutions: [
            { status: 'passed', duration: 50, identifier: 't1' },
          ],
        },
      ];

      const mockTestExecutions = [
        {
          id: 'e1',
          status: 'passed',
          duration: 50,
          identifier: 't1',
          testRun: {
            createdAt: new Date('2023-01-01T00:00:00Z'),
            framework: 'Jest',
            browser: 'Chrome',
          },
        },
      ];

      prisma.testRun.findMany.mockResolvedValueOnce(mockTestRuns);
      prisma.testExecution.findMany.mockResolvedValueOnce(mockTestExecutions);

      const startDate = '2023-01-01T00:00:00Z';
      const endDate = '2023-01-31T23:59:59Z';

      await service.getTestTrends('org-1', 'week', startDate, endDate);

      expect(prisma.testRun.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        include: {
          testExecutions: {
            select: { status: true, duration: true, identifier: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      expect(prisma.testExecution.findMany).toHaveBeenCalledWith({
        where: {
          testRun: {
            organizationId: 'org-1',
            createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
          },
        },
        include: {
          testRun: {
            select: { createdAt: true, framework: true, browser: true },
          },
        },
      });
    });
  });

  describe('getFlakyTests', () => {
    it('should return a list of flaky tests with proper ordering', async () => {
      const mockTestExecutions = [
        {
          id: 'e1',
          status: 'passed',
          duration: 50,
          identifier: 't1',
          name: 'Test 1',
          suite: 'Suite 1',
          testRun: { createdAt: new Date('2023-01-01T00:00:00Z') },
        },
        {
          id: 'e2',
          status: 'failed',
          duration: 200,
          identifier: 't1',
          name: 'Test 1',
          suite: 'Suite 1',
          testRun: { createdAt: new Date('2023-01-02T00:00:00Z') },
        },
      ];

      prisma.testExecution.findMany.mockResolvedValueOnce(mockTestExecutions);

      const result = await service.getFlakyTests('org-1');

      expect(prisma.testExecution.findMany).toHaveBeenCalledWith({
        where: { testRun: { organizationId: 'org-1' } },
        include: { testRun: { select: { createdAt: true } } },
        orderBy: { testRun: { createdAt: 'desc' } },
      });

      // Verify that the result is an array with expected properties
      expect(Array.isArray(result)).toBe(true);
      result.forEach((flakyTest: any) => {
        expect(flakyTest).toHaveProperty('identifier');
        expect(flakyTest).toHaveProperty('failureRate');
        expect(flakyTest).toHaveProperty('flakinessScore');
      });
    });

    it('should apply date filters when provided', async () => {
      const mockTestExecutions = [
        {
          id: 'e1',
          status: 'passed',
          duration: 50,
          identifier: 't1',
          name: 'Test 1',
          suite: 'Suite 1',
          testRun: { createdAt: new Date('2023-01-01T00:00:00Z') },
        },
        {
          id: 'e2',
          status: 'failed',
          duration: 200,
          identifier: 't1',
          name: 'Test 1',
          suite: 'Suite 1',
          testRun: { createdAt: new Date('2023-01-02T00:00:00Z') },
        },
      ];

      prisma.testExecution.findMany.mockResolvedValueOnce(mockTestExecutions);

      const startDate = '2023-01-01T00:00:00Z';
      const endDate = '2023-01-31T23:59:59Z';

      await service.getFlakyTests('org-1', startDate, endDate);

      expect(prisma.testExecution.findMany).toHaveBeenCalledWith({
        where: {
          testRun: {
            organizationId: 'org-1',
            createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
          },
        },
        include: { testRun: { select: { createdAt: true } } },
        orderBy: { testRun: { createdAt: 'desc' } },
      });
    });
  });

  describe('getDetailedTrends', () => {
    it('should return detailed trends with the default timeframe', async () => {
      const mockTestRuns = [
        {
          id: '1',
          status: 'completed',
          duration: 100,
          createdAt: new Date('2023-01-01T00:00:00Z'),
          organizationId: 'org-1',
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
          testExecutions: [
            {
              status: 'passed',
              duration: 50,
              identifier: 't1',
              name: 'Test 1',
              suite: 'Suite 1',
            },
          ],
        },
        {
          id: '2',
          status: 'failed',
          duration: 200,
          createdAt: new Date('2023-01-02T00:00:00Z'),
          organizationId: 'org-1',
          framework: 'Playwright',
          browser: 'Firefox',
          platform: 'Linux',
          testExecutions: [
            {
              status: 'failed',
              duration: 200,
              identifier: 't2',
              name: 'Test 2',
              suite: 'Suite 2',
            },
          ],
        },
      ];

      prisma.testRun.findMany.mockResolvedValueOnce(mockTestRuns);

      const result = await service.getDetailedTrends('org-1');

      expect(prisma.testRun.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        include: {
          testExecutions: {
            select: {
              status: true,
              duration: true,
              identifier: true,
              name: true,
              suite: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(result).toHaveProperty('timelineTrends');
      expect(result).toHaveProperty('durationTrends');
      expect(result).toHaveProperty('testDistribution');
      expect(result).toHaveProperty('environmentStats');
    });

    it('should apply optional filters (framework/browser) when provided', async () => {
      const mockTestRuns = [
        {
          id: '1',
          status: 'completed',
          duration: 100,
          createdAt: new Date('2023-01-01T00:00:00Z'),
          organizationId: 'org-1',
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
          testExecutions: [
            {
              status: 'passed',
              duration: 50,
              identifier: 't1',
              name: 'Test 1',
              suite: 'Suite 1',
            },
          ],
        },
      ];

      prisma.testRun.findMany.mockResolvedValueOnce(mockTestRuns);
      const filters = { framework: 'Jest', browser: 'Chrome' };

      await service.getDetailedTrends(
        'org-1',
        'day',
        '2023-01-01',
        '2023-01-31',
        filters,
      );
      expect(prisma.testRun.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          createdAt: {
            gte: new Date('2023-01-01'),
            lte: new Date('2023-01-31'),
          },
          framework: 'Jest',
          browser: 'Chrome',
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should handle empty test runs', async () => {
      prisma.testRun.findMany.mockResolvedValueOnce([]);

      const result = await service.getDetailedTrends('org-1');

      expect(result).toEqual({
        timelineTrends: [],
        durationTrends: {},
        testDistribution: [],
        environmentStats: {
          frameworks: {},
          browsers: {},
          platforms: {},
        },
      });
    });

    it('should calculate test distribution correctly', async () => {
      const mockTestRuns = [
        {
          id: '1',
          status: 'completed',
          duration: 100,
          createdAt: new Date('2023-01-01T00:00:00Z'),
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
          testExecutions: [
            {
              status: 'passed',
              duration: 50,
              identifier: 't1',
              name: 'Login Test',
              suite: 'Auth Suite',
            },
            {
              status: 'failed',
              duration: 30,
              identifier: 't2',
              name: 'Login Test',
              suite: 'Auth Suite',
            },
          ],
        },
      ];

      prisma.testRun.findMany.mockResolvedValueOnce(mockTestRuns);

      const result = await service.getDetailedTrends('org-1');

      expect(result.testDistribution).toContainEqual({
        test: 'Auth Suite:Login Test',
        totalRuns: 2,
        passed: 1,
        failed: 1,
        avgDuration: 40,
        successRate: 50,
      });
    });

    it('should handle tests without suite names', async () => {
      const mockTestRuns = [
        {
          id: '1',
          status: 'completed',
          duration: 100,
          createdAt: new Date('2023-01-01T00:00:00Z'),
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
          testExecutions: [
            {
              status: 'passed',
              duration: 50,
              identifier: 't1',
              name: 'Test without suite',
              suite: null,
            },
          ],
        },
      ];

      prisma.testRun.findMany.mockResolvedValueOnce(mockTestRuns);

      const result = await service.getDetailedTrends('org-1');

      expect(result.testDistribution).toContainEqual({
        test: 'No Suite:Test without suite',
        totalRuns: 1,
        passed: 1,
        failed: 0,
        avgDuration: 50,
        successRate: 100,
      });
    });

    it('should calculate environment stats correctly', async () => {
      const mockTestRuns = [
        {
          id: '1',
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
          testExecutions: [],
        },
        {
          id: '2',
          framework: 'Jest',
          browser: 'Firefox',
          platform: 'Linux',
          testExecutions: [],
        },
        {
          id: '3',
          framework: 'Playwright',
          browser: 'Chrome',
          platform: 'Windows',
          testExecutions: [],
        },
      ];

      prisma.testRun.findMany.mockResolvedValueOnce(mockTestRuns);

      const result = await service.getDetailedTrends('org-1');

      expect(result.environmentStats).toEqual({
        frameworks: {
          Jest: 2,
          Playwright: 1,
        },
        browsers: {
          Chrome: 2,
          Firefox: 1,
        },
        platforms: {
          Windows: 2,
          Linux: 1,
        },
      });
    });
  });

  describe('calculateDurationStats', () => {
    it('should calculate duration statistics correctly', async () => {
      const mockTestExecutions = [
        {
          duration: 100,
          status: 'passed',
          identifier: 'test1',
          testRun: { createdAt: new Date('2023-01-01') },
        },
        {
          duration: 200,
          status: 'failed',
          identifier: 'test1',
          testRun: { createdAt: new Date('2023-01-02') },
        },
        {
          duration: 300,
          status: 'passed',
          identifier: 'test2',
          testRun: { createdAt: new Date('2023-01-03') },
        },
        {
          duration: 400,
          status: 'failed',
          identifier: 'test2',
          testRun: { createdAt: new Date('2023-01-04') },
        },
        {
          duration: 500,
          status: 'passed',
          identifier: 'test3',
          testRun: { createdAt: new Date('2023-01-05') },
        },
      ];

      prisma.testExecution.findMany.mockResolvedValueOnce(mockTestExecutions);

      const result = await service.getFlakyTests('org-1');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('identifier');
      expect(result[0]).toHaveProperty('flakinessScore');
    });

    it('should handle empty test executions', async () => {
      prisma.testExecution.findMany.mockResolvedValueOnce([]);

      const result = await service.getFlakyTests('org-1');
      expect(result).toEqual([]);
    });
  });

  describe('formatDate', () => {
    it('should format dates correctly for different timeframes', async () => {
      const testDate = new Date('2023-01-15T12:00:00Z');
      const mockTestRuns = [
        {
          id: '1',
          createdAt: testDate,
          testExecutions: [{ status: 'passed', duration: 100 }],
          duration: 100,
          framework: 'Jest',
          browser: 'Chrome',
          platform: 'Windows',
        },
      ];

      // Test day format
      prisma.testRun.findMany.mockResolvedValueOnce([...mockTestRuns]);
      const dayResult = await service.getDetailedTrends('org-1', 'day');
      expect(dayResult.timelineTrends[0].date).toBe('2023-01-15');

      // Test week format
      prisma.testRun.findMany.mockResolvedValueOnce([...mockTestRuns]);
      const weekResult = await service.getDetailedTrends('org-1', 'week');
      expect(weekResult.timelineTrends[0].date).toBe('2023-W3');

      // Test month format
      prisma.testRun.findMany.mockResolvedValueOnce([...mockTestRuns]);
      const monthResult = await service.getDetailedTrends('org-1', 'month');
      expect(monthResult.timelineTrends[0].date).toBe('2023-01');
    });
  });

  describe('calculateTimeline', () => {
    it('should group test runs by timeframe correctly', async () => {
      const mockTestRuns = [
        {
          id: '1',
          createdAt: new Date('2023-01-01T00:00:00Z'),
          duration: 100,
          testExecutions: [{ status: 'passed' }, { status: 'passed' }],
        },
        {
          id: '2',
          createdAt: new Date('2023-01-01T12:00:00Z'),
          duration: 200,
          testExecutions: [{ status: 'failed' }, { status: 'passed' }],
        },
      ];

      prisma.testRun.findMany.mockResolvedValueOnce(mockTestRuns);

      const result = await service.getDetailedTrends('org-1', 'day');
      expect(result.timelineTrends).toHaveLength(1);
      expect(result.timelineTrends[0]).toHaveProperty('date', '2023-01-01');
      expect(result.timelineTrends[0]).toHaveProperty('totalRuns', 2);
    });
  });
});
