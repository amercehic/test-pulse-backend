import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { EitherAuthGuard } from '@/common/guards/either-auth.guard';

import { TestAnalyticsController } from '../controllers/test-analytics.controller';
import { TestAnalyticsService } from '../services/test-analytics.service';

describe('TestAnalyticsController (e2e)', () => {
  let app: INestApplication;
  // Create a mock service with jest.fn() for each method
  const mockTestAnalyticsService = {
    getTestTrends: jest.fn(),
    getDetailedTrends: jest.fn(),
    getFlakyTests: jest.fn(),
    getAdvancedFlakyTests: jest.fn(),
    getFlakyTestsTimeline: jest.fn(),
  };

  // A fake guard that attaches an organizationId to the request.
  // By default it sets req.organizationId = 'org-1'
  const fakeAuthGuard = {
    canActivate: (context: any) => {
      const req = context.switchToHttp().getRequest();
      // Use organizationId from req.user if provided; otherwise default to 'org-1'
      req.organizationId = req.user?.organizationId || 'org-1';
      return true;
    },
  };

  // Silence error logs during tests to avoid cluttering output
  const originalConsoleError = console.error;
  beforeAll(async () => {
    console.error = () => {}; // suppress error logs
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestAnalyticsController],
      providers: [
        { provide: TestAnalyticsService, useValue: mockTestAnalyticsService },
      ],
    })
      .overrideGuard(EitherAuthGuard)
      .useValue(fakeAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    await app.init();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    console.error = originalConsoleError;
  });

  // --- Overview Endpoint Tests ---
  describe('GET /test-analytics/overview', () => {
    it('should return test trends overview with default timeframe when not provided', async () => {
      const mockOverview = { summary: { totalRuns: 5 }, trends: [] };
      mockTestAnalyticsService.getTestTrends.mockResolvedValueOnce(
        mockOverview,
      );

      const response = await request(app.getHttpServer())
        .get('/test-analytics/overview')
        .query({ startDate: '2023-01-01', endDate: '2023-01-31' }) // timeframe not provided
        .expect(200);

      // Default timeframe should be 'week'
      expect(mockTestAnalyticsService.getTestTrends).toHaveBeenCalledWith(
        'org-1',
        'week',
        '2023-01-01',
        '2023-01-31',
      );
      expect(response.body).toEqual(mockOverview);
    });

    it('should return test trends overview with req.user.organizationId if available', async () => {
      const mockOverview = { summary: { totalRuns: 10 }, trends: [] };
      mockTestAnalyticsService.getTestTrends.mockResolvedValueOnce(
        mockOverview,
      );

      // Override the guard for this test to set req.user.organizationId
      const moduleFixture = await Test.createTestingModule({
        controllers: [TestAnalyticsController],
        providers: [
          { provide: TestAnalyticsService, useValue: mockTestAnalyticsService },
        ],
      })
        .overrideGuard(EitherAuthGuard)
        .useValue({
          canActivate: (context: any) => {
            const req = context.switchToHttp().getRequest();
            req.user = { organizationId: 'org-from-user' };
            return true;
          },
        })
        .compile();

      const tempApp = moduleFixture.createNestApplication();
      tempApp.useLogger(false);
      await tempApp.init();

      const response = await request(tempApp.getHttpServer())
        .get('/test-analytics/overview')
        .query({
          timeframe: 'day',
          startDate: '2023-02-01',
          endDate: '2023-02-28',
        })
        .expect(200);

      expect(mockTestAnalyticsService.getTestTrends).toHaveBeenCalledWith(
        'org-from-user',
        'day',
        '2023-02-01',
        '2023-02-28',
      );
      expect(response.body).toEqual(mockOverview);
      await tempApp.close();
    });

    it('should throw UnauthorizedException when organizationId is missing', async () => {
      const moduleFixture = await Test.createTestingModule({
        controllers: [TestAnalyticsController],
        providers: [
          { provide: TestAnalyticsService, useValue: mockTestAnalyticsService },
        ],
      })
        .overrideGuard(EitherAuthGuard)
        .useValue({
          canActivate: (context: any) => {
            const req = context.switchToHttp().getRequest();
            // Neither req.organizationId nor req.user.organizationId is set
            req.organizationId = null;
            return true;
          },
        })
        .compile();

      const tempApp = moduleFixture.createNestApplication();
      tempApp.useLogger(false);
      await tempApp.init();

      const res = await request(tempApp.getHttpServer())
        .get('/test-analytics/overview')
        .expect(401);
      expect(res.body.message).toEqual('Organization ID not found');
      await tempApp.close();
    });

    it('should return 500 if service throws an error', async () => {
      mockTestAnalyticsService.getTestTrends.mockRejectedValueOnce(
        new Error('Service error'),
      );

      const res = await request(app.getHttpServer())
        .get('/test-analytics/overview')
        .query({ timeframe: 'week' })
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.body.message).toEqual('Internal server error');
    });
  });

  // --- Trends Endpoint Tests ---
  describe('GET /test-analytics/trends', () => {
    it('should return detailed trends', async () => {
      const mockDetailed = {
        timelineTrends: [],
        durationTrends: [],
        testDistribution: [],
        environmentStats: {},
      };
      mockTestAnalyticsService.getDetailedTrends.mockResolvedValueOnce(
        mockDetailed,
      );

      const response = await request(app.getHttpServer())
        .get('/test-analytics/trends')
        .query({
          timeframe: 'day',
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          framework: 'Jest',
          browser: 'Chrome',
        })
        .expect(200);

      expect(response.body).toEqual(mockDetailed);
      expect(mockTestAnalyticsService.getDetailedTrends).toHaveBeenCalledWith(
        'org-1',
        'day',
        '2023-01-01',
        '2023-01-31',
        { framework: 'Jest', browser: 'Chrome' },
      );
    });

    it('should use default timeframe if not provided', async () => {
      const mockDetailed = {
        timelineTrends: [{ date: '2023-01-01', totalRuns: 1 }],
        durationTrends: {},
        testDistribution: [],
        environmentStats: {},
      };
      mockTestAnalyticsService.getDetailedTrends.mockResolvedValueOnce(
        mockDetailed,
      );

      const response = await request(app.getHttpServer())
        .get('/test-analytics/trends')
        .query({ startDate: '2023-01-01', endDate: '2023-01-31' })
        .expect(200);

      // Default timeframe is 'week'
      expect(mockTestAnalyticsService.getDetailedTrends).toHaveBeenCalledWith(
        'org-1',
        'week',
        '2023-01-01',
        '2023-01-31',
        { framework: undefined, browser: undefined },
      );
      expect(response.body).toEqual(mockDetailed);
    });

    it('should throw UnauthorizedException when organizationId is missing', async () => {
      const moduleFixture = await Test.createTestingModule({
        controllers: [TestAnalyticsController],
        providers: [
          { provide: TestAnalyticsService, useValue: mockTestAnalyticsService },
        ],
      })
        .overrideGuard(EitherAuthGuard)
        .useValue({
          canActivate: (context: any) => {
            const req = context.switchToHttp().getRequest();
            req.organizationId = undefined;
            return true;
          },
        })
        .compile();

      const tempApp = moduleFixture.createNestApplication();
      tempApp.useLogger(false);
      await tempApp.init();

      const res = await request(tempApp.getHttpServer())
        .get('/test-analytics/trends')
        .expect(401);
      expect(res.body.message).toEqual('Organization ID not found');
      await tempApp.close();
    });

    it('should return 500 if detailed trends service fails', async () => {
      mockTestAnalyticsService.getDetailedTrends.mockRejectedValueOnce(
        new Error('Detailed trends error'),
      );

      const res = await request(app.getHttpServer())
        .get('/test-analytics/trends')
        .query({ timeframe: 'day' })
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.body.message).toEqual('Internal server error');
    });
  });

  // --- Flaky Tests Endpoint Tests ---
  describe('GET /test-analytics/flaky-tests', () => {
    it('should return flaky tests list', async () => {
      const mockFlaky = [
        { identifier: 'test1', failureRate: 50, flakinessScore: 30 },
      ];
      mockTestAnalyticsService.getFlakyTests.mockResolvedValueOnce(mockFlaky);

      const response = await request(app.getHttpServer())
        .get('/test-analytics/flaky-tests')
        .query({ startDate: '2023-01-01', endDate: '2023-01-31' })
        .expect(200);

      expect(response.body).toEqual(mockFlaky);
      expect(mockTestAnalyticsService.getFlakyTests).toHaveBeenCalledWith(
        'org-1',
        '2023-01-01',
        '2023-01-31',
      );
    });

    it('should work if query parameters are omitted', async () => {
      const mockFlaky = [
        { identifier: 'test1', failureRate: 50, flakinessScore: 30 },
      ];
      mockTestAnalyticsService.getFlakyTests.mockResolvedValueOnce(mockFlaky);

      const response = await request(app.getHttpServer())
        .get('/test-analytics/flaky-tests')
        .expect(200);

      expect(mockTestAnalyticsService.getFlakyTests).toHaveBeenCalledWith(
        'org-1',
        undefined,
        undefined,
      );
      expect(response.body).toEqual(mockFlaky);
    });

    it('should throw UnauthorizedException when organizationId is missing', async () => {
      const moduleFixture = await Test.createTestingModule({
        controllers: [TestAnalyticsController],
        providers: [
          { provide: TestAnalyticsService, useValue: mockTestAnalyticsService },
        ],
      })
        .overrideGuard(EitherAuthGuard)
        .useValue({
          canActivate: (context: any) => {
            const req = context.switchToHttp().getRequest();
            req.organizationId = null;
            return true;
          },
        })
        .compile();

      const tempApp = moduleFixture.createNestApplication();
      tempApp.useLogger(false);
      await tempApp.init();

      const res = await request(tempApp.getHttpServer())
        .get('/test-analytics/flaky-tests')
        .expect(401);
      expect(res.body.message).toEqual('Organization ID not found');
      await tempApp.close();
    });

    it('should return 500 if flaky tests service fails', async () => {
      mockTestAnalyticsService.getFlakyTests.mockRejectedValueOnce(
        new Error('Flaky tests error'),
      );

      const res = await request(app.getHttpServer())
        .get('/test-analytics/flaky-tests')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.body.message).toEqual('Internal server error');
    });
  });

  describe('GET /test-analytics/flaky-tests/advanced', () => {
    it('should return advanced flaky tests analysis', async () => {
      const mockAdvancedFlaky = [
        {
          identifier: 'test1',
          failureRate: 50,
          flakinessScore: 30,
          patterns: {
            isRandom: false,
            isAlternating: true,
            isTimeBased: false,
            isEnvironmentSpecific: false,
            details: 'Shows alternating pass/fail pattern.',
          },
          trend: { direction: 'improving', rate: 15 },
          confidenceLevel: 75,
          impact: {
            runsAffected: 5,
            totalRuns: 10,
            percentage: 50,
            score: 38,
          },
        },
      ];

      mockTestAnalyticsService.getAdvancedFlakyTests.mockResolvedValueOnce(
        mockAdvancedFlaky,
      );

      const response = await request(app.getHttpServer())
        .get('/test-analytics/flaky-tests/advanced')
        .query({
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          minFlakinessScore: 10,
          minExecutions: 5,
          sortBy: 'impact',
        })
        .expect(200);

      expect(response.body).toEqual(mockAdvancedFlaky);
      expect(
        mockTestAnalyticsService.getAdvancedFlakyTests,
      ).toHaveBeenCalledWith('org-1', {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        minFlakinessScore: '10',
        minExecutions: '5',
        sortBy: 'impact',
        timeWindow: undefined,
      });
    });
  });

  describe('GET /test-analytics/flaky-tests/timeline', () => {
    it('should return flaky tests timeline', async () => {
      const mockTimeline = {
        timeline: [
          {
            date: '2023-01-01',
            totalTests: 10,
            flakyTests: 2,
            statusChanges: 5,
            flakinessRate: 20,
            averageStatusChangeRate: 0.5,
          },
          {
            date: '2023-01-08',
            totalTests: 12,
            flakyTests: 3,
            statusChanges: 7,
            flakinessRate: 25,
            averageStatusChangeRate: 0.58,
          },
        ],
        summary: {
          totalTests: 12,
          totalFlakyTests: 3,
          averageFlakinessScore: 22.5,
        },
      };

      mockTestAnalyticsService.getFlakyTestsTimeline.mockResolvedValueOnce(
        mockTimeline,
      );

      const response = await request(app.getHttpServer())
        .get('/test-analytics/flaky-tests/timeline')
        .query({
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          groupBy: 'week',
          aggregation: 'percentage',
        })
        .expect(200);

      expect(response.body).toEqual(mockTimeline);
      expect(
        mockTestAnalyticsService.getFlakyTestsTimeline,
      ).toHaveBeenCalledWith('org-1', {
        identifier: undefined,
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        groupBy: 'week',
        aggregation: 'percentage',
      });
    });

    it('should handle specific test identifier', async () => {
      const mockTimeline = {
        timeline: [
          {
            date: '2023-01-01',
            totalTests: 1,
            flakyTests: 1,
            statusChanges: 3,
            flakinessRate: 100,
            averageStatusChangeRate: 3,
          },
        ],
        summary: {
          totalTests: 1,
          totalFlakyTests: 1,
          averageFlakinessScore: 100,
        },
      };

      mockTestAnalyticsService.getFlakyTestsTimeline.mockResolvedValueOnce(
        mockTimeline,
      );

      const response = await request(app.getHttpServer())
        .get('/test-analytics/flaky-tests/timeline')
        .query({
          identifier: 'test1',
          groupBy: 'week',
        })
        .expect(200);

      expect(
        mockTestAnalyticsService.getFlakyTestsTimeline,
      ).toHaveBeenCalledWith('org-1', {
        identifier: 'test1',
        startDate: undefined,
        endDate: undefined,
        groupBy: 'week',
        aggregation: 'percentage',
      });
    });
  });
});
