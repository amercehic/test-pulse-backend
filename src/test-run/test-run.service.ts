import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { TestRunQueryDto } from './dto/test-run-query.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';

@Injectable()
export class TestRunService {
  constructor(private readonly prisma: PrismaService) {}

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
