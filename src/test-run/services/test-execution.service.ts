import { PrismaService } from '@db/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

import { RetryTestsDto } from '@/test-run/dto/retry-tests.dto';
import { SubmitTestExecutionResultDto } from '@/test-run/dto/submit-test-execution-result.dto';
import { TestExecutionStatus } from '@/test-run/enums/test-status.enum';

/**
 * Service responsible for managing test execution operations.
 */
@Injectable()
export class TestExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submits result(s) for one or more test executions.
   * @param dto - A single result or an array of results containing test execution IDs and result data.
   * @returns The updated test execution(s).
   * @throws NotFoundException if any test execution is not found.
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
          data: {
            ...updateData,
          },
        });
      }),
    );

    return Array.isArray(dto) ? updatedExecutions : updatedExecutions[0];
  }

  /**
   * Retrieves a specific test execution by its ID.
   * @param id - The unique identifier of the test execution
   * @throws {NotFoundException} When the test execution is not found
   * @returns {Promise<TestExecution>} The found test execution
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
   * Retrieves a specific test execution attempt for a given test run.
   * @param testRunId - The ID of the test run
   * @param attempt - The attempt number to retrieve
   * @throws {NotFoundException} When the test execution attempt is not found
   * @returns {Promise<TestExecution>} The found test execution attempt
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
   * Retries specific tests within a test run by creating new test executions.
   * @param dto - Data transfer object containing testRunId and testExecutionIds
   * @throws {NotFoundException} When the test run or test executions are not found
   * @throws {Error} When an error occurs during the retry process
   * @returns {Promise<TestRun & { testExecutions: TestExecution[] }>} The updated test run with all test executions
   */
  async retryTests(dto: RetryTestsDto) {
    const { testRunId, testExecutionIds } = dto;

    try {
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
        attempt: old.attempt + 1,
        status: TestExecutionStatus.QUEUED,
        duration: 0,
        logs: null,
        errorMessage: null,
        stackTrace: null,
        screenshotUrl: null,
        videoUrl: null,
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Removes a test execution from the database.
   * @param id - The unique identifier of the test execution to remove
   * @throws {NotFoundException} When the test execution is not found
   * @returns {Promise<{ message: string }>} Success message confirming deletion
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
