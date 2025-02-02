import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@db/prisma.service';
import { CreateTestRunDto } from '@/test-run/dto/create-test-run.dto';
import { TestRunQueryDto } from '@/test-run/dto/test-run-query.dto';
import { UpdateTestRunDto } from '@/test-run/dto/update-test-run.dto';

@Injectable()
export class TestRunService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new TestRun along with its associated tests.
   * @param createTestRunDto - Data transfer object containing TestRun details and associated tests.
   * @returns The created TestRun object, including its associated tests.
   * @throws Error if the creation process fails.
   */
  async create(createTestRunDto: CreateTestRunDto): Promise<any> {
    const { tests, ...testRunData } = createTestRunDto;

    try {
      return await this.prisma.testRun.create({
        data: {
          ...testRunData,
          tests: tests?.length
            ? {
                create: await Promise.all(
                  tests.map(async (test) => {
                    const previousTest = await this.prisma.test.findFirst({
                      where: { name: test.name },
                      orderBy: { id: 'desc' },
                    });
                    return {
                      ...test,
                      previousRunId: previousTest?.id || null,
                    };
                  }),
                ),
              }
            : undefined,
        },
        include: { tests: true },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while creating TestRun');
    }
  }

  /**
   * Retrieves a paginated list of TestRuns based on query parameters.
   * @param query - Query parameters for filtering, sorting, and pagination.
   * @returns An object containing the list of TestRuns and the total count.
   * @throws Error if the fetch process fails.
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
    } = query || {};

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (framework) where.framework = framework;
    if (browser) where.browser = browser;
    if (platform) where.platform = platform;

    try {
      const [data, total] = await Promise.all([
        this.prisma.testRun.findMany({
          where,
          orderBy: { [sortBy]: order.toLowerCase() as 'asc' | 'desc' },
          skip,
          take,
          include: { tests: true },
        }),
        this.prisma.testRun.count({ where }),
      ]);

      return { data, total };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while fetching TestRuns');
    }
  }

  /**
   * Retrieves a single TestRun by its ID, including its associated tests and their previous runs.
   * @param id - The ID of the TestRun to retrieve.
   * @returns The TestRun object with associated tests and their previous runs.
   * @throws NotFoundException if the TestRun is not found.
   * @throws Error if the fetch process fails.
   */
  async findOne(id: number): Promise<any> {
    try {
      const testRun = await this.prisma.testRun.findUnique({
        where: { id },
        include: { tests: { include: { previousRun: true } } },
      });
      if (!testRun) {
        throw new NotFoundException(`TestRun with ID ${id} not found`);
      }
      return testRun;
    } catch (error: unknown) {
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
   * Updates an existing TestRun and its associated tests.
   * @param id - The ID of the TestRun to update.
   * @param updateTestRunDto - Data transfer object containing updated TestRun details and tests.
   * @returns The updated TestRun object.
   * @throws Error if the update process fails.
   */
  async update(id: number, updateTestRunDto: UpdateTestRunDto): Promise<any> {
    const { tests, ...testRunData } = updateTestRunDto;

    if (tests) {
      await Promise.all(
        tests.map(async (test) => {
          if (test.id) {
            await this.prisma.test.update({
              where: { id: test.id },
              data: { ...test },
            });
          } else {
            await this.prisma.test.create({
              data: {
                ...test,
                testRunId: id,
              },
            });
          }
        }),
      );
    }

    try {
      return await this.prisma.testRun.update({
        where: { id },
        data: { ...testRunData },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while updating TestRun');
    }
  }

  /**
   * Deletes a TestRun by its ID.
   * @param id - The ID of the TestRun to delete.
   * @throws NotFoundException if the TestRun is not found.
   * @throws Error if the deletion process fails.
   */
  async remove(id: number): Promise<void> {
    try {
      await this.prisma.testRun.delete({
        where: { id },
      });
    } catch (error: unknown) {
      if (
        error instanceof Object &&
        'code' in error &&
        (error as any).code === 'P2025'
      ) {
        throw new NotFoundException(`TestRun with ID ${id} not found`);
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error occurred while deleting TestRun');
    }
  }
}
