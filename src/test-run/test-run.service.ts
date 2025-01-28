import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { TestRunQueryDto } from './dto/test-run-query.dto';

@Injectable()
export class TestRunService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTestRunDto: CreateTestRunDto): Promise<any> {
    const { tests, ...testRunData } = createTestRunDto;

    return this.prisma.testRun.create({
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
  }

  async findAll(query: TestRunQueryDto): Promise<{ data: any[]; total: number }> {
    const {
      status,
      framework,
      browser,
      platform,
      sortBy = 'createdAt',
      order = 'desc', // Default to 'desc'
      page = 1,
      limit = 10,
    } = query || {};
  
    const skip = (Number(page) - 1) * Number(limit); // Ensure skip is a number
    const take = Number(limit); // Ensure take is a number
  
    const where: any = {};
    if (status) where.status = status;
    if (framework) where.framework = framework;
    if (browser) where.browser = browser;
    if (platform) where.platform = platform;
  
    const [data, total] = await Promise.all([
      this.prisma.testRun.findMany({
        where,
        orderBy: {
          [sortBy]: order.toLowerCase() as 'asc' | 'desc',
        },
        skip,
        take, // Pass take as a number
        include: { tests: true },
      }),
      this.prisma.testRun.count({ where }),
    ]);
  
    return { data, total };
  }  

  async findOne(id: number): Promise<any> {
    const testRun = await this.prisma.testRun.findUnique({
      where: { id },
      include: { tests: { include: { previousRun: true } } },
    });

    if (!testRun) {
      throw new NotFoundException(`TestRun with ID ${id} not found`);
    }

    return testRun;
  }

  async update(id: number, updateTestRunDto: UpdateTestRunDto): Promise<any> {
    const { tests, ...testRunData } = updateTestRunDto;
  
    if (tests) {
      await Promise.all(
        tests.map(async (test) => {
          if (test.id) {
            // Update existing test
            await this.prisma.test.update({
              where: { id: test.id },
              data: { ...test },
            });
          } else {
            // Create new test
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
  
    return this.prisma.testRun.update({
      where: { id },
      data: testRunData,
    });
  }  

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.testRun.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`TestRun with ID ${id} not found`);
    }
  }
}
