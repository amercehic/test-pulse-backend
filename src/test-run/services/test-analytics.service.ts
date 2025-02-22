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
}
