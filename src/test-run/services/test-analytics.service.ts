import { PrismaService } from '@db/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TestAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves test trends for a given organization within a specified timeframe
   * @param organizationId - The ID of the organization
   * @param timeframe - The time grouping period ('day', 'week', 'month')
   * @param startDate - Optional start date filter (ISO string)
   * @param endDate - Optional end date filter (ISO string)
   * @returns Object containing various test analytics including summary, status breakdown, and timeline
   */
  async getTestTrends(
    organizationId: string,
    timeframe = 'week',
    startDate?: string,
    endDate?: string,
  ) {
    const where = {
      organizationId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const [testRuns, testExecutions] = await Promise.all([
      this.prisma.testRun.findMany({
        where,
        include: {
          testExecutions: {
            select: {
              status: true,
              duration: true,
              identifier: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.testExecution.findMany({
        where: {
          testRun: where,
        },
        include: {
          testRun: {
            select: {
              createdAt: true,
              framework: true,
              browser: true,
            },
          },
        },
      }),
    ]);

    const trends = {
      summary: this.calculateSummary(testRuns),
      statusBreakdown: this.calculateStatusBreakdown(testExecutions),
      frameworkStats: this.calculateFrameworkStats(testExecutions),
      browserStats: this.calculateBrowserStats(testExecutions),
      timeline: this.calculateTimeline(testRuns, timeframe),
      duration: this.calculateDurationStats(testExecutions),
    };

    return trends;
  }

  /**
   * Retrieves flaky tests for a given organization within a date range
   * @param organizationId - The ID of the organization
   * @param startDate - Optional start date filter (ISO string)
   * @param endDate - Optional end date filter (ISO string)
   * @returns Array of flaky tests sorted by flakiness score
   */
  async getFlakyTests(
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const testExecutions = await this.prisma.testExecution.findMany({
      where: {
        testRun: {
          organizationId,
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
      },
      include: {
        testRun: {
          select: {
            createdAt: true,
          },
        },
      },
      orderBy: {
        testRun: {
          createdAt: 'desc',
        },
      },
    });

    return this.analyzeFlakyTests(testExecutions);
  }

  /**
   * Calculates summary statistics for test runs
   * @param testRuns - Array of test run objects
   * @returns Summary statistics including total runs, success rate, failure rate, and average duration
   * @private
   */
  private calculateSummary(testRuns: any[]) {
    const total = testRuns.length;
    const successful = testRuns.filter(
      (run) => run.status === 'completed',
    ).length;
    const failed = testRuns.filter((run) => run.status === 'failed').length;
    const avgDuration =
      testRuns.reduce((acc, run) => acc + (run.duration || 0), 0) / total;

    return {
      totalRuns: total,
      successRate: total ? (successful / total) * 100 : 0,
      failureRate: total ? (failed / total) * 100 : 0,
      averageDuration: avgDuration || 0,
    };
  }

  /**
   * Calculates the breakdown of test execution statuses
   * @param testExecutions - Array of test execution objects
   * @returns Object containing counts for each status type
   * @private
   */
  private calculateStatusBreakdown(testExecutions: any[]) {
    return testExecutions.reduce((acc, exec) => {
      const status = exec.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Calculates statistics grouped by test framework
   * @param testExecutions - Array of test execution objects
   * @returns Array of framework statistics with success rates
   * @private
   */
  private calculateFrameworkStats(testExecutions: any[]) {
    const stats = testExecutions.reduce((acc, exec) => {
      const framework = exec.testRun.framework;
      if (!acc[framework]) {
        acc[framework] = {
          total: 0,
          passed: 0,
          failed: 0,
        };
      }
      acc[framework].total++;
      if (exec.status === 'passed') {
        acc[framework].passed++;
      }
      if (exec.status === 'failed') {
        acc[framework].failed++;
      }
      return acc;
    }, {});

    return Object.entries(stats).map(([framework, data]: [string, any]) => ({
      framework,
      ...data,
      successRate: (data.passed / data.total) * 100,
    }));
  }

  /**
   * Calculates statistics grouped by browser
   * @param testExecutions - Array of test execution objects
   * @returns Array of browser statistics with success rates
   * @private
   */
  private calculateBrowserStats(testExecutions: any[]) {
    const stats = testExecutions.reduce((acc, exec) => {
      const browser = exec.testRun.browser;
      if (!acc[browser]) {
        acc[browser] = {
          total: 0,
          passed: 0,
          failed: 0,
        };
      }
      acc[browser].total++;
      if (exec.status === 'passed') {
        acc[browser].passed++;
      }
      if (exec.status === 'failed') {
        acc[browser].failed++;
      }
      return acc;
    }, {});

    return Object.entries(stats).map(([browser, data]: [string, any]) => ({
      browser,
      ...data,
      successRate: (data.passed / data.total) * 100,
    }));
  }

  /**
   * Calculates timeline-based statistics for test runs
   * @param testRuns - Array of test run objects
   * @param timeframe - Time grouping period ('day', 'week', 'month')
   * @returns Array of timeline entries with aggregated statistics
   * @private
   */
  private calculateTimeline(testRuns: any[], timeframe: string) {
    const groupedRuns = testRuns.reduce((acc, run) => {
      const date = this.formatDate(run.createdAt, timeframe);
      if (!acc[date]) {
        acc[date] = {
          total: 0,
          passed: 0,
          failed: 0,
          duration: 0,
        };
      }

      acc[date].total++;
      acc[date].duration += run.duration || 0;

      const passedTests = run.testExecutions.filter(
        (exec: any) => exec.status === 'passed',
      ).length;
      const totalTests = run.testExecutions.length;

      if (passedTests === totalTests) {
        acc[date].passed++;
      } else {
        acc[date].failed++;
      }

      return acc;
    }, {});

    return Object.entries(groupedRuns).map(([date, data]: [string, any]) => ({
      date,
      ...data,
      successRate: (data.passed / data.total) * 100,
      averageDuration: data.duration / data.total,
    }));
  }

  /**
   * Calculates duration statistics for test executions
   * @param testExecutions - Array of test execution objects
   * @returns Object containing min, max, average, and 95th percentile durations
   * @private
   */
  private calculateDurationStats(testExecutions: any[]) {
    const durations = testExecutions
      .map((exec) => exec.duration)
      .filter((duration) => duration !== null && duration !== undefined);

    if (durations.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        p95: 0,
      };
    }

    durations.sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      min: durations[0],
      max: durations[durations.length - 1],
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95: durations[p95Index],
    };
  }

  /**
   * Analyzes test executions to identify flaky tests
   * @param testExecutions - Array of test execution objects
   * @returns Array of flaky tests with their statistics
   * @private
   */
  private analyzeFlakyTests(testExecutions: any[]) {
    const testHistory = testExecutions.reduce((acc, exec) => {
      if (!acc[exec.identifier]) {
        acc[exec.identifier] = {
          name: exec.name,
          suite: exec.suite,
          executions: [],
          totalRuns: 0,
          failures: 0,
          lastStatus: null,
          statusChanges: 0,
        };
      }

      const test = acc[exec.identifier];
      test.executions.push({
        status: exec.status,
        date: exec.testRun.createdAt,
      });
      test.totalRuns++;

      if (exec.status === 'failed') {
        test.failures++;
      }

      if (test.lastStatus && test.lastStatus !== exec.status) {
        test.statusChanges++;
      }
      test.lastStatus = exec.status;

      return acc;
    }, {});

    return Object.entries(testHistory)
      .map(([identifier, data]: [string, any]) => ({
        identifier,
        name: data.name,
        suite: data.suite,
        totalRuns: data.totalRuns,
        failureRate: (data.failures / data.totalRuns) * 100,
        flakinessScore: (data.statusChanges / (data.totalRuns - 1)) * 100,
        recentExecutions: data.executions.slice(0, 5),
      }))
      .filter((test) => test.flakinessScore > 0)
      .sort((a, b) => b.flakinessScore - a.flakinessScore);
  }

  /**
   * Formats a date according to the specified timeframe
   * @param date - Date to format
   * @param timeframe - Time grouping period ('day', 'week', 'month')
   * @returns Formatted date string
   * @private
   */
  private formatDate(date: Date, timeframe: string): string {
    const d = new Date(date);
    switch (timeframe) {
      case 'day':
        return d.toISOString().split('T')[0];
      case 'week':
        const week = Math.ceil((d.getDate() + d.getDay()) / 7);
        return `${d.getFullYear()}-W${week}`;
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      default:
        return d.toISOString().split('T')[0];
    }
  }

  /**
   * Retrieves detailed test trends with filtering options
   * @param organizationId - The ID of the organization
   * @param timeframe - Time grouping period ('day', 'week', 'month')
   * @param startDate - Optional start date filter (ISO string)
   * @param endDate - Optional end date filter (ISO string)
   * @param filters - Optional filters for framework and browser
   * @returns Detailed trends including timeline, duration, distribution, and environment stats
   */
  async getDetailedTrends(
    organizationId: string,
    timeframe: 'day' | 'week' | 'month' = 'week',
    startDate?: string,
    endDate?: string,
    filters: { framework?: string; browser?: string } = {},
  ) {
    const where: any = {
      organizationId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
      ...(filters.framework && { framework: filters.framework }),
      ...(filters.browser && { browser: filters.browser }),
    };

    const testRuns = await this.prisma.testRun.findMany({
      where,
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      timelineTrends: this.calculateTimelineTrends(testRuns, timeframe),
      durationTrends: this.calculateDurationTrends(testRuns, timeframe),
      testDistribution: this.calculateTestDistribution(testRuns),
      environmentStats: this.calculateEnvironmentStats(testRuns),
    };
  }

  /**
   * Calculates timeline trends for test runs
   * @param testRuns - Array of test run objects
   * @param timeframe - Time grouping period ('day', 'week', 'month')
   * @returns Array of timeline entries with success rates and durations
   * @private
   */
  private calculateTimelineTrends(
    testRuns: any[],
    timeframe: 'day' | 'week' | 'month',
  ) {
    const grouped = testRuns.reduce<Record<string, any>>((acc, run) => {
      const date = this.formatDate(run.createdAt, timeframe);
      if (!acc[date]) {
        acc[date] = {
          totalRuns: 0,
          passed: 0,
          failed: 0,
          flaky: 0,
          totalDuration: 0,
        };
      }

      acc[date].totalRuns++;
      acc[date].totalDuration += run.duration || 0;

      const passedTests = run.testExecutions.filter(
        (exec: any) => exec.status === 'passed',
      ).length;
      const totalTests = run.testExecutions.length;

      if (passedTests === totalTests) {
        acc[date].passed++;
      } else {
        acc[date].failed++;
      }

      return acc;
    }, {});

    return Object.entries(grouped).map(([date, data]: [string, any]) => ({
      date,
      ...data,
      avgDuration: data.totalDuration / data.totalRuns,
      successRate: (data.passed / data.totalRuns) * 100,
    }));
  }

  /**
   * Calculates duration trends over time
   * @param testRuns - Array of test run objects
   * @param timeframe - Time grouping period ('day', 'week', 'month')
   * @returns Object containing duration statistics grouped by date
   * @private
   */
  private calculateDurationTrends(
    testRuns: any[],
    timeframe: 'day' | 'week' | 'month',
  ) {
    const durations = testRuns.map((run) => ({
      date: this.formatDate(run.createdAt, timeframe),
      duration: run.duration || 0,
    }));

    return durations.reduce<Record<string, any>>((acc, { date, duration }) => {
      if (!acc[date]) {
        acc[date] = {
          total: 0,
          count: 0,
          min: duration,
          max: duration,
        };
      }

      acc[date].total += duration;
      acc[date].count++;
      acc[date].min = Math.min(acc[date].min, duration);
      acc[date].max = Math.max(acc[date].max, duration);
      acc[date].avg = acc[date].total / acc[date].count;

      return acc;
    }, {});
  }

  /**
   * Calculates test distribution statistics
   * @param testRuns - Array of test run objects
   * @returns Array of test statistics grouped by test name
   * @private
   */
  private calculateTestDistribution(testRuns: any[]) {
    const distribution = new Map<
      string,
      {
        totalRuns: number;
        passed: number;
        failed: number;
        avgDuration: number;
      }
    >();

    testRuns.forEach((run) => {
      run.testExecutions.forEach((exec: any) => {
        const key = `${exec.suite || 'No Suite'}:${exec.name}`;
        const current = distribution.get(key) || {
          totalRuns: 0,
          passed: 0,
          failed: 0,
          avgDuration: 0,
        };

        current.totalRuns++;
        if (exec.status === 'passed') {
          current.passed++;
        } else {
          current.failed++;
        }
        current.avgDuration =
          (current.avgDuration * (current.totalRuns - 1) +
            (exec.duration || 0)) /
          current.totalRuns;

        distribution.set(key, current);
      });
    });

    return Array.from(distribution.entries()).map(([key, stats]) => ({
      test: key,
      ...stats,
      successRate: (stats.passed / stats.totalRuns) * 100,
    }));
  }

  /**
   * Calculates statistics about test environments
   * @param testRuns - Array of test run objects
   * @returns Object containing statistics about frameworks, browsers, and platforms
   * @private
   */
  private calculateEnvironmentStats(testRuns: any[]) {
    const stats = {
      frameworks: new Map<string, number>(),
      browsers: new Map<string, number>(),
      platforms: new Map<string, number>(),
    };

    testRuns.forEach((run) => {
      stats.frameworks.set(
        run.framework,
        (stats.frameworks.get(run.framework) || 0) + 1,
      );
      stats.browsers.set(
        run.browser,
        (stats.browsers.get(run.browser) || 0) + 1,
      );
      stats.platforms.set(
        run.platform,
        (stats.platforms.get(run.platform) || 0) + 1,
      );
    });

    return {
      frameworks: Object.fromEntries(stats.frameworks),
      browsers: Object.fromEntries(stats.browsers),
      platforms: Object.fromEntries(stats.platforms),
    };
  }

  /**
   * Retrieves advanced flaky test analysis with pattern detection and impact metrics
   * @param organizationId - The ID of the organization
   * @param options - Analysis options including date range, thresholds, and sorting
   * @returns Array of flaky tests with advanced metrics and pattern detection
   */
  async getAdvancedFlakyTests(
    organizationId: string,
    options: {
      startDate?: string;
      endDate?: string;
      minFlakinessScore?: number;
      minExecutions?: number;
      sortBy?: 'flakinessScore' | 'impact' | 'failureRate';
      timeWindow?: number;
    },
  ) {
    const {
      startDate,
      endDate,
      minFlakinessScore = 1,
      minExecutions = 2,
      sortBy = 'flakinessScore',
      timeWindow,
    } = options;

    // Calculate dynamic date range if timeWindow is provided
    let effectiveStartDate = startDate;
    if (timeWindow && !startDate) {
      const date = new Date();
      date.setDate(date.getDate() - timeWindow);
      effectiveStartDate = date.toISOString();
    }

    // Fetch test executions
    const testExecutions = await this.prisma.testExecution.findMany({
      where: {
        testRun: {
          organizationId,
          ...(effectiveStartDate || endDate
            ? {
                createdAt: {
                  ...(effectiveStartDate && {
                    gte: new Date(effectiveStartDate),
                  }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
      },
      include: {
        testRun: {
          select: {
            createdAt: true,
            framework: true,
            browser: true,
            platform: true,
            branch: true,
          },
        },
      },
      orderBy: {
        testRun: {
          createdAt: 'desc',
        },
      },
    });

    // If no executions, return empty array early
    if (testExecutions.length === 0) {
      return [];
    }

    // Analyze flaky tests with advanced metrics
    const flakyTests = this.analyzeAdvancedFlakyTests(testExecutions, {
      minFlakinessScore,
      minExecutions,
    });

    // If no flaky tests, return empty array early
    if (flakyTests.length === 0) {
      return [];
    }

    // Calculate impact scores
    const testsWithImpact = this.calculateImpactScores(
      flakyTests,
      testExecutions,
    );

    // Sort results based on the specified metric
    const sortedTests = this.sortFlakyTests(testsWithImpact, sortBy);

    return sortedTests;
  }

  /**
   * Analyzes test executions to identify flaky tests with advanced metrics
   * @param testExecutions - Array of test execution objects
   * @param options - Analysis options including thresholds
   * @returns Array of flaky tests with advanced metrics
   * @private
   */
  private analyzeAdvancedFlakyTests(
    testExecutions: any[],
    options: {
      minFlakinessScore: number;
      minExecutions: number;
    },
  ) {
    const { minFlakinessScore, minExecutions } = options;

    // Group executions by test identifier
    const testHistory = testExecutions.reduce((acc, exec) => {
      if (!acc[exec.identifier]) {
        acc[exec.identifier] = {
          name: exec.name,
          suite: exec.suite,
          executions: [],
          totalRuns: 0,
          failures: 0,
          lastStatus: null,
          statusChanges: 0,
          environmentData: [],
          statusSequence: [],
        };
      }

      const test = acc[exec.identifier];

      // Store execution details
      test.executions.push({
        status: exec.status,
        date: exec.testRun.createdAt,
        environment: {
          browser: exec.testRun.browser,
          framework: exec.testRun.framework,
          platform: exec.testRun.platform,
          branch: exec.testRun.branch,
        },
      });

      test.totalRuns++;
      test.statusSequence.push(exec.status);

      // Track environment data for correlation analysis
      test.environmentData.push({
        browser: exec.testRun.browser,
        framework: exec.testRun.framework,
        platform: exec.testRun.platform,
        branch: exec.testRun.branch,
        status: exec.status,
      });

      if (exec.status === 'failed') {
        test.failures++;
      }

      if (test.lastStatus && test.lastStatus !== exec.status) {
        test.statusChanges++;
      }
      test.lastStatus = exec.status;

      return acc;
    }, {});

    // Process each test to calculate advanced metrics
    return Object.entries(testHistory)
      .map(([identifier, data]: [string, any]) => {
        // Skip tests with insufficient executions
        if (data.totalRuns < minExecutions) {
          return null;
        }

        const failureRate = (data.failures / data.totalRuns) * 100;
        const flakinessScore =
          (data.statusChanges / (data.totalRuns - 1)) * 100;

        // Skip tests with flakiness score below threshold
        if (flakinessScore < minFlakinessScore) {
          return null;
        }

        // Detect flakiness patterns
        const patterns = this.detectFlakinessPatterns(data);

        // Calculate trend (improving/worsening)
        const trend = this.calculateFlakinessTrend(data.executions);

        // Calculate confidence level based on number of executions
        const confidenceLevel = this.calculateConfidenceLevel(data.totalRuns);

        return {
          identifier,
          name: data.name,
          suite: data.suite,
          totalRuns: data.totalRuns,
          failureRate,
          flakinessScore,
          patterns,
          trend,
          confidenceLevel,
          recentExecutions: data.executions.slice(0, 5),
          environmentCorrelations: this.analyzeEnvironmentCorrelations(
            data.environmentData,
          ),
        };
      })
      .filter(Boolean);
  }

  /**
   * Detects patterns in flaky test behavior
   * @param testData - Test history data
   * @returns Object containing detected patterns
   * @private
   */
  private detectFlakinessPatterns(testData: any) {
    const patterns = {
      isRandom: false,
      isAlternating: false,
      isTimeBased: false,
      isEnvironmentSpecific: false,
      details: '',
    };

    const statusSequence = testData.statusSequence;
    let alternatingCount = 0;
    for (let i = 1; i < statusSequence.length; i++) {
      if (statusSequence[i] !== statusSequence[i - 1]) {
        alternatingCount++;
      }
    }

    if (alternatingCount > statusSequence.length * 0.7) {
      patterns.isAlternating = true;
      patterns.details += 'Shows alternating pass/fail pattern. ';
    }

    const timeBasedFailures = this.detectTimeBasedPatterns(testData.executions);
    if (timeBasedFailures) {
      patterns.isTimeBased = true;
      patterns.details += timeBasedFailures;
    }

    const environmentCorrelations = this.analyzeEnvironmentCorrelations(
      testData.environmentData,
    );
    const significantCorrelations = Object.entries(
      environmentCorrelations,
    ).filter(([_, correlation]) => Math.abs(correlation as number) > 0.5);

    if (significantCorrelations.length > 0) {
      patterns.isEnvironmentSpecific = true;
      patterns.details += 'Failures correlate with specific environments: ';
      patterns.details += significantCorrelations
        .map(([factor, value]) => `${factor} (${(value as number).toFixed(2)})`)
        .join(', ');
      patterns.details += '. ';
    }

    // If no specific pattern is detected, mark as random
    if (
      !patterns.isAlternating &&
      !patterns.isTimeBased &&
      !patterns.isEnvironmentSpecific
    ) {
      patterns.isRandom = true;
      patterns.details += 'No clear pattern detected, appears to be random. ';
    }

    return patterns;
  }

  /**
   * Detects time-based patterns in test failures
   * @param executions - Array of test executions
   * @returns Description of time-based pattern or null if none detected
   * @private
   */
  private detectTimeBasedPatterns(executions: any[]) {
    // Group failures by day of week
    const dayFailures = [0, 0, 0, 0, 0, 0, 0];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];

    // Group failures by hour of day
    const hourFailures = Array(24).fill(0);
    const hourTotals = Array(24).fill(0);

    executions.forEach((exec) => {
      const date = new Date(exec.date);
      const day = date.getDay();
      const hour = date.getHours();

      dayTotals[day]++;
      hourTotals[hour]++;

      if (exec.status === 'failed') {
        dayFailures[day]++;
        hourFailures[hour]++;
      }
    });

    // Calculate failure rates
    const dayFailureRates = dayTotals.map((total, i) =>
      total > 0 ? (dayFailures[i] / total) * 100 : 0,
    );

    const hourFailureRates = hourTotals.map((total, i) =>
      total > 0 ? (hourFailures[i] / total) * 100 : 0,
    );

    // Check for significant variations
    const dayAvg = dayFailureRates.reduce((sum, rate) => sum + rate, 0) / 7;
    const hourAvg = hourFailureRates.reduce((sum, rate) => sum + rate, 0) / 24;

    let pattern = '';

    // Check for day of week patterns
    const highFailureDays = dayFailureRates
      .map((rate, day) => ({ day, rate }))
      .filter(({ rate }) => rate > dayAvg * 1.5 && rate > 30);

    if (highFailureDays.length > 0) {
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      pattern +=
        'Fails more often on: ' +
        highFailureDays
          .map(({ day, rate }) => `${dayNames[day]} (${rate.toFixed(0)}%)`)
          .join(', ') +
        '. ';
    }

    // Check for time of day patterns
    const highFailureHours = hourFailureRates
      .map((rate, hour) => ({ hour, rate }))
      .filter(({ rate }) => rate > hourAvg * 1.5 && rate > 30);

    if (highFailureHours.length > 0) {
      pattern +=
        'Fails more often during hours: ' +
        highFailureHours
          .map(({ hour, rate }) => `${hour}:00 (${rate.toFixed(0)}%)`)
          .join(', ') +
        '. ';
    }

    return pattern || null;
  }

  /**
   * Analyzes correlations between test failures and environment factors
   * @param environmentData - Array of test execution environment data
   * @returns Object mapping environment factors to correlation coefficients
   * @private
   */
  private analyzeEnvironmentCorrelations(environmentData: any[]) {
    const correlations: Record<string, number> = {};

    // Skip if not enough data
    if (environmentData.length < 5) {
      return correlations;
    }

    // Analyze each environment factor
    const factors = ['browser', 'framework', 'platform', 'branch'];

    factors.forEach((factor) => {
      // Get unique values for this factor
      const uniqueValues = [
        ...new Set(environmentData.map((data) => data[factor])),
      ];

      // Skip if only one value exists
      if (uniqueValues.length <= 1) {
        return;
      }

      // Calculate correlation for each value
      uniqueValues.forEach((value) => {
        const execsWithValue = environmentData.filter(
          (data) => data[factor] === value,
        );
        const failuresWithValue = execsWithValue.filter(
          (data) => data.status === 'failed',
        ).length;
        const failureRateWithValue =
          execsWithValue.length > 0
            ? (failuresWithValue / execsWithValue.length) * 100
            : 0;

        const execsWithoutValue = environmentData.filter(
          (data) => data[factor] !== value,
        );
        const failuresWithoutValue = execsWithoutValue.filter(
          (data) => data.status === 'failed',
        ).length;
        const failureRateWithoutValue =
          execsWithoutValue.length > 0
            ? (failuresWithoutValue / execsWithoutValue.length) * 100
            : 0;

        // Calculate correlation coefficient (simplified as difference in failure rates)
        const correlation = failureRateWithValue - failureRateWithoutValue;

        // Only include significant correlations
        if (Math.abs(correlation) > 20 && execsWithValue.length >= 3) {
          correlations[`${factor}:${value}`] = correlation;
        }
      });
    });

    return correlations;
  }

  /**
   * Calculates the trend of flakiness (improving or worsening)
   * @param executions - Array of test executions
   * @returns Object containing trend direction and rate
   * @private
   */
  private calculateFlakinessTrend(executions: any[]) {
    // Need at least 6 executions to calculate a meaningful trend
    if (executions.length < 6) {
      return { direction: 'stable', rate: 0 };
    }

    // Sort executions by date (oldest first)
    const sortedExecutions = [...executions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Split into first half and second half
    const midpoint = Math.floor(sortedExecutions.length / 2);
    const firstHalf = sortedExecutions.slice(0, midpoint);
    const secondHalf = sortedExecutions.slice(midpoint);

    // Calculate status changes in each half
    const firstHalfChanges = this.countStatusChanges(firstHalf);
    const secondHalfChanges = this.countStatusChanges(secondHalf);

    // Calculate change rates
    const firstHalfRate = firstHalfChanges / (firstHalf.length - 1);
    const secondHalfRate = secondHalfChanges / (secondHalf.length - 1);

    // Calculate trend
    const trendRate = ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100;

    let direction = 'stable';
    if (trendRate > 10) {
      direction = 'worsening';
    } else if (trendRate < -10) {
      direction = 'improving';
    }

    return { direction, rate: Math.abs(trendRate) };
  }

  /**
   * Counts status changes in a sequence of executions
   * @param executions - Array of test executions
   * @returns Number of status changes
   * @private
   */
  private countStatusChanges(executions: any[]) {
    let changes = 0;
    for (let i = 1; i < executions.length; i++) {
      if (executions[i].status !== executions[i - 1].status) {
        changes++;
      }
    }
    return changes;
  }

  /**
   * Calculates confidence level based on number of executions
   * @param executionCount - Number of test executions
   * @returns Confidence level as a percentage
   * @private
   */
  private calculateConfidenceLevel(executionCount: number) {
    // Simple model: confidence increases with more executions but plateaus
    if (executionCount < 5) {
      return 20; // Low confidence with few executions
    } else if (executionCount < 10) {
      return 40 + (executionCount - 5) * 6; // 40-70% for 5-9 executions
    } else if (executionCount < 20) {
      return 70 + (executionCount - 10) * 2; // 70-90% for 10-19 executions
    } else {
      return 90 + Math.min(executionCount - 20, 10) * 1; // 90-100% for 20+ executions
    }
  }

  /**
   * Calculates impact scores for flaky tests
   * @param flakyTests - Array of flaky test objects
   * @param allExecutions - Array of all test executions
   * @returns Array of flaky tests with impact scores
   * @private
   */
  private calculateImpactScores(flakyTests: any[], allExecutions: any[]) {
    // Group executions by test run
    const testRunMap = allExecutions.reduce((acc, exec) => {
      const runId = exec.testRunId;
      if (!acc[runId]) {
        acc[runId] = [];
      }
      acc[runId].push(exec);
      return acc;
    }, {});

    // Calculate total test runs and failed runs
    const totalRuns = Object.keys(testRunMap).length;

    return flakyTests.map((test) => {
      // Count runs where this test failed
      const runsWithThisTestFailing = Object.values(testRunMap).filter(
        (execs) =>
          Array.isArray(execs) &&
          execs.some(
            (exec) =>
              exec.identifier === test.identifier && exec.status === 'failed',
          ),
      ).length;

      // Calculate percentage of runs affected by this test
      const impactPercentage = (runsWithThisTestFailing / totalRuns) * 100;

      // Calculate weighted impact score (combines flakiness and impact)
      const impactScore = test.flakinessScore * 0.6 + impactPercentage * 0.4;

      return {
        ...test,
        impact: {
          runsAffected: runsWithThisTestFailing,
          totalRuns,
          percentage: impactPercentage,
          score: impactScore,
        },
      };
    });
  }

  /**
   * Sorts flaky tests based on specified metric
   * @param tests - Array of flaky test objects
   * @param sortBy - Metric to sort by
   * @returns Sorted array of flaky tests
   * @private
   */
  private sortFlakyTests(
    tests: any[],
    sortBy: 'flakinessScore' | 'impact' | 'failureRate',
  ) {
    return [...tests].sort((a, b) => {
      if (sortBy === 'impact') {
        return b.impact.score - a.impact.score;
      } else if (sortBy === 'failureRate') {
        return b.failureRate - a.failureRate;
      } else {
        return b.flakinessScore - a.flakinessScore;
      }
    });
  }

  /**
   * Retrieves historical timeline of test flakiness evolution
   * @param organizationId - The ID of the organization
   * @param options - Timeline options including test identifier, date range, and grouping
   * @returns Timeline data showing flakiness evolution over time
   */
  async getFlakyTestsTimeline(
    organizationId: string,
    options: {
      identifier?: string;
      startDate?: string;
      endDate?: string;
      groupBy: 'day' | 'week' | 'month';
      aggregation: 'count' | 'percentage';
    },
  ) {
    const { identifier, startDate, endDate, groupBy, aggregation } = options;

    // Fetch test executions
    const testExecutions = await this.prisma.testExecution.findMany({
      where: {
        ...(identifier ? { identifier } : {}),
        testRun: {
          organizationId,
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate && { gte: new Date(startDate) }),
                  ...(endDate && { lte: new Date(endDate) }),
                },
              }
            : {}),
        },
      },
      include: {
        testRun: {
          select: {
            createdAt: true,
          },
        },
      },
      orderBy: {
        testRun: {
          createdAt: 'asc',
        },
      },
    });

    // If no executions, return empty result
    if (testExecutions.length === 0) {
      return {
        timeline: [],
        summary: {
          totalTests: 0,
          totalFlakyTests: 0,
          averageFlakinessScore: 0,
        },
      };
    }

    // Generate timeline data
    const timeline = this.generateFlakinessTimeline(
      testExecutions,
      groupBy,
      aggregation,
      identifier,
    );

    // Calculate summary statistics
    const summary = this.calculateFlakinessTimelineSummary(timeline);

    return {
      timeline,
      summary,
    };
  }

  /**
   * Generates timeline data for flakiness evolution
   * @param testExecutions - Array of test execution objects
   * @param groupBy - Time grouping (day, week, month)
   * @param aggregation - How to aggregate data (count, percentage)
   * @param identifier - Optional test identifier to focus on
   * @returns Array of timeline entries with flakiness metrics
   * @private
   */
  private generateFlakinessTimeline(
    testExecutions: any[],
    groupBy: 'day' | 'week' | 'month',
    aggregation: 'count' | 'percentage',
    identifier?: string,
  ) {
    // Group executions by time period
    const groupedByTime = testExecutions.reduce((acc, exec) => {
      const date = this.formatDate(exec.testRun.createdAt, groupBy);

      if (!acc[date]) {
        acc[date] = {
          date,
          totalTests: 0,
          flakyTests: 0,
          statusChanges: 0,
          executions: {},
        };
      }

      const period = acc[date];

      // Track executions by test identifier
      if (!period.executions[exec.identifier]) {
        period.executions[exec.identifier] = {
          statuses: [],
          statusChanges: 0,
          lastStatus: null,
        };
        period.totalTests++;
      }

      const testData = period.executions[exec.identifier];
      testData.statuses.push(exec.status);

      // Count status changes
      if (testData.lastStatus && testData.lastStatus !== exec.status) {
        testData.statusChanges++;
        period.statusChanges++;
      }
      testData.lastStatus = exec.status;

      return acc;
    }, {});

    // Process each time period to calculate flakiness
    return Object.values(groupedByTime)
      .map((period: any) => {
        // For each test in this period, determine if it's flaky
        Object.values(period.executions).forEach((test: any) => {
          if (test.statusChanges > 0) {
            period.flakyTests++;
          }
        });

        // Calculate metrics based on aggregation type
        const result: any = {
          date: period.date,
          totalTests: period.totalTests,
          flakyTests: period.flakyTests,
          statusChanges: period.statusChanges,
        };

        if (aggregation === 'percentage') {
          result.flakinessRate =
            period.totalTests > 0
              ? (period.flakyTests / period.totalTests) * 100
              : 0;
          result.averageStatusChangeRate =
            period.totalTests > 0
              ? period.statusChanges / period.totalTests
              : 0;
        }

        return result;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Calculates summary statistics for flakiness timeline
   * @param timeline - Array of timeline entries
   * @returns Summary statistics
   * @private
   */
  private calculateFlakinessTimelineSummary(timeline: any[]) {
    if (timeline.length === 0) {
      return {
        totalTests: 0,
        totalFlakyTests: 0,
        averageFlakinessScore: 0,
      };
    }

    // Calculate averages across all time periods
    const totalTests = Math.max(...timeline.map((t) => t.totalTests));
    const totalFlakyTests = Math.max(...timeline.map((t) => t.flakyTests));

    // Calculate average flakiness rate
    const totalFlakinessRate = timeline.reduce(
      (sum, t) => sum + (t.flakinessRate || 0),
      0,
    );
    const averageFlakinessScore = totalFlakinessRate / timeline.length;

    return {
      totalTests,
      totalFlakyTests,
      averageFlakinessScore,
    };
  }
}
