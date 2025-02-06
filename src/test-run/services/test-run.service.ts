import { PrismaService } from '@db/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateTestRunDto } from '@/test-run/dto/create-test-run.dto';
import { TestRunQueryDto } from '@/test-run/dto/test-run-query.dto';
import { UpdateTestRunDto } from '@/test-run/dto/update-test-run.dto';

/**
 * Service responsible for managing test runs in the application.
 * Handles CRUD operations and advanced queries for test run entities.
 */
@Injectable()
export class TestRunService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new test run with initial status and duration.
   * @param createTestRunDto - The DTO containing test run creation data
   * @returns {Promise<any>} The created test run object
   * @throws {Error} If creation fails
   */
  async create(createTestRunDto: CreateTestRunDto): Promise<any> {
    try {
      return await this.prisma.testRun.create({
        data: {
          ...createTestRunDto,
          status: 'queued', // Default status
          duration: 0, // Duration calculated dynamically
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while creating TestRun');
    }
  }

  /**
   * Retrieves all test runs with filtering, pagination, and sorting capabilities.
   * @param query - The query parameters for filtering and pagination
   * @param {string} query.status - Filter by test run status
   * @param {string} query.framework - Filter by testing framework
   * @param {string} query.browser - Filter by browser type
   * @param {string} query.platform - Filter by platform
   * @param {string} query.sortBy - Field to sort by (default: 'createdAt')
   * @param {string} query.order - Sort order ('asc' or 'desc', default: 'desc')
   * @param {number} query.page - Page number (default: 1)
   * @param {number} query.limit - Items per page (default: 10)
   * @returns {Promise<{data: any[], total: number}>} Paginated test runs and total count
   * @throws {Error} If fetching fails
   */
  async findAll(
    query: TestRunQueryDto,
  ): Promise<{ data: any[]; total: number }> {
    const {
      status,
      framework,
      browser,
      platform,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (framework) {
      where.framework = framework;
    }
    if (browser) {
      where.browser = browser;
    }
    if (platform) {
      where.platform = platform;
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.testRun.findMany({
          where,
          orderBy: { [sortBy]: order.toLowerCase() as 'asc' | 'desc' },
          skip,
          take,
          include: {
            testExecutions: {
              include: { test: true },
            },
          },
        }),
        this.prisma.testRun.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while fetching TestRuns');
    }
  }

  /**
   * Retrieves a single test run by ID with related test executions and their history.
   * @param {string} id - The ID of the test run to retrieve
   * @returns {Promise<any>} The test run with its executions and history
   * @throws {NotFoundException} If the test run is not found
   * @throws {Error} If fetching fails
   */
  async findOne(id: string): Promise<any> {
    try {
      const testRun = await this.prisma.testRun.findUnique({
        where: { id },
        include: {
          testExecutions: {
            include: { test: true },
          },
        },
      });

      if (!testRun) {
        throw new NotFoundException(`TestRun with ID ${id} not found`);
      }

      const testExecutionsWithHistory = await Promise.all(
        testRun.testExecutions.map(async (execution) => {
          const previousExecutions = await this.prisma.testExecution.findMany({
            where: {
              testId: execution.testId,
              testRunId: { not: id },
            },
            orderBy: { startedAt: 'desc' },
          });

          return {
            ...execution,
            previousExecutions,
          };
        }),
      );

      return {
        ...testRun,
        testExecutions: testExecutionsWithHistory,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while fetching a TestRun');
    }
  }

  /**
   * Updates an existing test run.
   * @param {string} id - The ID of the test run to update
   * @param {UpdateTestRunDto} updateTestRunDto - The update data
   * @returns {Promise<any>} The updated test run
   * @throws {NotFoundException} If the test run is not found
   * @throws {Error} If the status is invalid or update fails
   */
  async update(id: string, updateTestRunDto: UpdateTestRunDto): Promise<any> {
    try {
      // Ensure the test run exists before updating
      const existingTestRun = await this.prisma.testRun.findUnique({
        where: { id },
      });

      if (!existingTestRun) {
        throw new NotFoundException(`TestRun with ID ${id} not found`);
      }

      // ✅ Ensure valid status update
      if (
        updateTestRunDto.status &&
        !['queued', 'running', 'completed', 'cancelled', 'failed'].includes(
          updateTestRunDto.status,
        )
      ) {
        throw new Error('Invalid status value');
      }

      return await this.prisma.testRun.update({
        where: { id },
        data: updateTestRunDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while updating a TestRun');
    }
  }

  /**
   * Deletes a test run by ID.
   * @param {string} id - The ID of the test run to delete
   * @returns {Promise<void>}
   * @throws {NotFoundException} If the test run is not found
   * @throws {Error} If deletion fails
   */
  async remove(id: string): Promise<void> {
    try {
      const existingTestRun = await this.prisma.testRun.findUnique({
        where: { id },
      });

      if (!existingTestRun) {
        throw new NotFoundException(`TestRun with ID ${id} not found`);
      }

      await this.prisma.testRun.delete({ where: { id } });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while deleting a TestRun');
    }
  }
}
