import { PrismaService } from '@db/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateTestRunDto, EphemeralTestDto } from '../dto/create-test-run.dto';
import { TestRunQueryDto } from '../dto/test-run-query.dto';
import { UpdateTestRunDto } from '../dto/update-test-run.dto';

/**
 * Service for managing test runs and their executions.
 *
 * Note: The organizationId is not provided in the DTO. Instead, the caller (e.g. a controller)
 * must determine the correct organization based on the authentication method (Bearer or API key)
 * and pass it as a separate parameter.
 */
@Injectable()
export class TestRunService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new test run with optional test executions.
   * @param dto - The data transfer object containing test run and test execution details
   * @param organizationId - The ID of the organization to which the test run belongs
   * @returns The created test run with its associated test executions
   * @throws Error if creation fails
   */
  async create(dto: CreateTestRunDto, organizationId: string) {
    const { tests, ...runData } = dto;

    try {
      const createdRun = await this.prisma.testRun.create({
        data: {
          ...runData,
          status: 'queued',
          duration: 0,
          organization: { connect: { id: organizationId } },
        },
      });

      if (tests && tests.length > 0) {
        const executionData = tests.map((test: EphemeralTestDto) => ({
          testRunId: createdRun.id,
          name: test.name,
          suite: test.suite,
          description: test.description,
          attempt: 1,
          status: 'queued',
        }));

        await this.prisma.testExecution.createMany({ data: executionData });
      }

      return this.prisma.testRun.findUnique({
        where: { id: createdRun.id },
        include: { testExecutions: true },
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  /**
   * Retrieves all test runs with pagination and filtering options.
   * @param query - Query parameters for filtering and pagination.
   * @returns Object containing test runs data and total count.
   * @throws Error if query fails.
   */
  async findAll(query: TestRunQueryDto) {
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
          include: { testExecutions: true },
        }),
        this.prisma.testRun.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  /**
   * Retrieves a single test run by ID.
   * @param id - The ID of the test run to find.
   * @returns The test run with its associated test executions.
   * @throws NotFoundException if test run is not found.
   * @throws Error if query fails.
   */
  async findOne(id: string) {
    try {
      const run = await this.prisma.testRun.findUnique({
        where: { id },
        include: { testExecutions: true },
      });

      if (!run) {
        throw new NotFoundException(`TestRun with ID ${id} not found`);
      }
      return run;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  /**
   * Updates a test run by ID.
   * @param id - The ID of the test run to update.
   * @param dto - The data transfer object containing update data.
   * @returns The updated test run.
   * @throws NotFoundException if test run is not found.
   * @throws Error if update fails or status is invalid.
   */
  async update(id: string, dto: UpdateTestRunDto) {
    try {
      const existing = await this.prisma.testRun.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`TestRun with ID ${id} not found`);
      }

      const result = await this.prisma.testRun.update({
        where: { id },
        data: dto,
      });

      if (
        result.status &&
        !['queued', 'running', 'completed', 'cancelled', 'failed'].includes(
          result.status,
        )
      ) {
        throw new Error('Invalid status value');
      }

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  /**
   * Removes a test run by ID.
   * @param id - The ID of the test run to remove.
   * @throws NotFoundException if test run is not found.
   * @throws Error if deletion fails.
   */
  async remove(id: string) {
    try {
      const existing = await this.prisma.testRun.findUnique({ where: { id } });
      if (!existing) {
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
      throw error;
    }
  }
}
