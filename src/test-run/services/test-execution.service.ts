import { PrismaService } from '@db/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

import { RetryTestsDto } from '@/test-run/dto/retry-tests.dto';
import { SubmitTestExecutionResultDto } from '@/test-run/dto/submit-test-execution-result.dto';
import { TestExecutionStatus } from '@/test-run/enums/test-status.enum';

/**
 * Interface representing test comparison metrics
 */
interface TestComparison {
  name: string;
  suite: string | null;
  totalRuns: number;
  successRate: number;
  averageDuration: number;
  lastExecutions: any[];
  statusBreakdown: Record<string, number>;
}

/**
 * Service responsible for managing test execution operations
 * including test history, comparisons, and result submissions
 */
@Injectable()
export class TestExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves historical test executions for a specific test
   * @param identifier - Unique identifier of the test
   * @param startDate - Optional start date for filtering results (ISO string)
   * @param endDate - Optional end date for filtering results (ISO string)
   * @returns Array of test executions with their associated test runs
   */
  async getTestHistory(
    identifier: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      identifier: {
        equals: identifier,
      },
    };

    if (startDate || endDate) {
      where.testRun = {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    const executions = await this.prisma.testExecution.findMany({
      where,
      include: {
        testRun: true,
      },
      orderBy: {
        testRun: {
          createdAt: 'desc',
        },
      },
    });

    const totals = executions.length;

    return {
      data: executions,
      totals,
    };
  }

  /**
   * Compares multiple tests based on their execution history
   * @param identifiers - Array of test identifiers to compare
   * @param startDate - Optional start date for filtering results (ISO string)
   * @param endDate - Optional end date for filtering results (ISO string)
   * @returns Record of test comparisons indexed by test identifier
   */
  async compareTests(
    identifiers: string[],
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      identifier: {
        in: identifiers,
      },
    };

    if (startDate || endDate) {
      where.testRun = {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    const executions = await this.prisma.testExecution.findMany({
      where,
      include: {
        testRun: {
          select: {
            createdAt: true,
            commit: true,
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

    const comparison = identifiers.reduce<Record<string, TestComparison>>(
      (acc, identifier) => {
        const testExecutions = executions.filter(
          (e) => e.identifier === identifier,
        );

        acc[identifier] = {
          name: testExecutions[0]?.name || 'Unknown',
          suite: testExecutions[0]?.suite || null,
          totalRuns: testExecutions.length,
          successRate: this.calculateSuccessRate(testExecutions),
          averageDuration: this.calculateAverageDuration(testExecutions),
          lastExecutions: testExecutions.slice(0, 5),
          statusBreakdown: this.calculateStatusBreakdown(testExecutions),
        };

        return acc;
      },
      {},
    );

    return comparison;
  }

  /**
   * Analyzes test duration trends over time
   * @param identifier - Optional test identifier to filter results
   * @param startDate - Optional start date for filtering results (ISO string)
   * @param endDate - Optional end date for filtering results (ISO string)
   * @param groupBy - Time unit for grouping results ('day' | 'week' | 'month')
   * @returns Array of grouped test duration statistics
   */
  async getDurationTrend(
    identifier?: string,
    startDate?: string,
    endDate?: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const where: any = {};

    if (identifier) {
      where.identifier = identifier;
    }

    if (startDate || endDate) {
      where.testRun = {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    const executions = await this.prisma.testExecution.findMany({
      where,
      select: {
        identifier: true,
        name: true,
        suite: true,
        duration: true,
        status: true,
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

    return this.processDurationTrend(executions, groupBy);
  }

  /**
   * Processes raw execution data into duration trends
   * @param executions - Array of test executions to process
   * @param groupBy - Time unit for grouping results
   * @returns Processed duration trend data
   * @private
   */
  private processDurationTrend(
    executions: any[],
    groupBy: 'day' | 'week' | 'month',
  ) {
    type TestStats = {
      name: string;
      suite: string | null;
      executions: Array<{ duration: number; status: string }>;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
    };

    type GroupedData = {
      [date: string]: {
        [identifier: string]: TestStats;
      };
    };

    const grouped = executions.reduce<GroupedData>((acc, execution) => {
      const date = this.formatDate(execution.testRun.createdAt, groupBy);
      const identifier = execution.identifier;

      if (!acc[date]) {
        acc[date] = {};
      }

      if (!acc[date][identifier]) {
        acc[date][identifier] = {
          name: execution.name,
          suite: execution.suite,
          executions: [],
          averageDuration: 0,
          minDuration: Infinity,
          maxDuration: -Infinity,
        };
      }

      const stats = acc[date][identifier];
      const duration = execution.duration || 0;

      stats.executions.push({
        duration,
        status: execution.status,
      });

      stats.minDuration = Math.min(stats.minDuration, duration);
      stats.maxDuration = Math.max(stats.maxDuration, duration);
      stats.averageDuration =
        stats.executions.reduce((sum, e) => sum + e.duration, 0) /
        stats.executions.length;

      return acc;
    }, {});

    return Object.entries(grouped).map(([date, data]) => ({
      date,
      tests: data,
    }));
  }

  /**
   * Calculates the success rate of test executions
   * @param executions - Array of test executions
   * @returns Percentage of successful test executions (0-100)
   * @private
   */
  private calculateSuccessRate(executions: any[]): number {
    if (!executions.length) {
      return 0;
    }
    const successful = executions.filter((e) => e.status === 'passed').length;
    return (successful / executions.length) * 100;
  }

  /**
   * Calculates the average duration of test executions
   * @param executions - Array of test executions
   * @returns Average duration in milliseconds
   * @private
   */
  private calculateAverageDuration(executions: any[]): number {
    if (!executions.length) {
      return 0;
    }
    const totalDuration = executions.reduce(
      (sum, e) => sum + (e.duration || 0),
      0,
    );
    return totalDuration / executions.length;
  }

  /**
   * Calculates the breakdown of test statuses
   * @param executions - Array of test executions
   * @returns Object containing count of each status
   * @private
   */
  private calculateStatusBreakdown(executions: any[]): Record<string, number> {
    return executions.reduce((acc: Record<string, number>, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Formats a date according to the specified grouping
   * @param date - Date to format
   * @param groupBy - Grouping unit ('day' | 'week' | 'month')
   * @returns Formatted date string
   * @private
   */
  private formatDate(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    const d = new Date(date);
    switch (groupBy) {
      case 'day':
        return d.toISOString().split('T')[0];
      case 'week':
        const week = Math.ceil((d.getDate() + d.getDay()) / 7);
        return `${d.getFullYear()}-W${week}`;
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  /**
   * Submits test execution results
   * @param dto - Single or array of test execution results
   * @returns Updated test execution(s)
   * @throws NotFoundException if test execution not found
   */
  async submitResults(
    dto: SubmitTestExecutionResultDto | SubmitTestExecutionResultDto[],
  ) {
    const results = Array.isArray(dto) ? dto : [dto];

    const updatedExecutions = await Promise.all(
      results.map(async (result) => {
        const { id, ...updateData } = result;
        const existing = await this.prisma.testExecution.findUnique({
          where: { id },
        });
        if (!existing) {
          throw new NotFoundException(`TestExecution with ID ${id} not found`);
        }
        return this.prisma.testExecution.update({
          where: { id },
          data: updateData,
        });
      }),
    );

    return Array.isArray(dto) ? updatedExecutions : updatedExecutions[0];
  }

  /**
   * Retrieves a specific test execution by ID
   * @param id - Test execution ID
   * @returns Test execution details
   * @throws NotFoundException if test execution not found
   */
  async getTestExecution(id: string) {
    const exec = await this.prisma.testExecution.findUnique({
      where: { id },
    });
    if (!exec) {
      throw new NotFoundException(`TestExecution with ID ${id} not found`);
    }
    return exec;
  }

  /**
   * Retrieves a specific test execution attempt
   * @param testRunId - ID of the test run
   * @param attempt - Attempt number
   * @returns Test execution details
   * @throws NotFoundException if test execution attempt not found
   */
  async getAttempt(testRunId: string, attempt: number) {
    const exec = await this.prisma.testExecution.findFirst({
      where: {
        testRunId,
        attempt,
      },
    });
    if (!exec) {
      throw new NotFoundException(
        `No test execution found for run=${testRunId}, attempt=${attempt}`,
      );
    }
    return exec;
  }

  /**
   * Retries specified tests within a test run
   * @param dto - Retry tests data transfer object
   * @returns Updated test run with new test executions
   * @throws NotFoundException if test run or executions not found
   */
  async retryTests(dto: RetryTestsDto) {
    const { testRunId, testExecutionIds } = dto;

    const existingRun = await this.prisma.testRun.findUnique({
      where: { id: testRunId },
    });
    if (!existingRun) {
      throw new NotFoundException(`TestRun ${testRunId} not found`);
    }

    const oldExecutions = await this.prisma.testExecution.findMany({
      where: {
        id: { in: testExecutionIds },
        testRunId,
      },
    });

    if (oldExecutions.length !== testExecutionIds.length) {
      throw new NotFoundException(
        'Some provided testExecutionIds do not exist in this test run',
      );
    }

    const newExecutionsData = oldExecutions.map((old) => ({
      testRunId: old.testRunId,
      name: old.name,
      suite: old.suite,
      description: old.description,
      identifier: old.identifier,
      attempt: old.attempt + 1,
      status: TestExecutionStatus.QUEUED,
      duration: 0,
      logs: null,
      errorMessage: null,
      stackTrace: null,
      screenshotKey: null,
      videoKey: null,
      startedAt: null,
      completedAt: null,
    }));

    await this.prisma.testExecution.createMany({
      data: newExecutionsData,
    });

    return this.prisma.testRun.findUnique({
      where: { id: testRunId },
      include: { testExecutions: true },
    });
  }

  /**
   * Removes a test execution
   * @param id - ID of the test execution to remove
   * @returns Success message
   * @throws NotFoundException if test execution not found
   */
  async remove(id: string) {
    const existing = await this.prisma.testExecution.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`TestExecution ${id} not found`);
    }
    await this.prisma.testExecution.delete({
      where: { id },
    });
    return { message: `TestExecution ${id} deleted successfully` };
  }
}
