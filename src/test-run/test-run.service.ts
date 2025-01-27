import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestRun } from './test-run.entity';
import { Test } from './test.entity';
import { CreateTestRunDto } from './dto/create-test-run.dto';
import { UpdateTestRunDto } from './dto/update-test-run.dto';
import { TestRunQueryDto } from './dto/test-run-query.dto';

@Injectable()
export class TestRunService {
  constructor(
    @InjectRepository(TestRun) private readonly testRunRepository: Repository<TestRun>,
    @InjectRepository(Test) private readonly testRepository: Repository<Test>,
  ) {}

  async create(createTestRunDto: CreateTestRunDto): Promise<TestRun> {
    const { tests, ...testRunData } = createTestRunDto;
    const testRun = this.testRunRepository.create(testRunData);

    if (tests && tests.length > 0) {
      testRun.tests = tests.map((test) => this.testRepository.create(test));
    }

    return this.testRunRepository.save(testRun);
  }

  async findAll(query?: TestRunQueryDto): Promise<{ data: TestRun[]; total: number }> {
    const {
      status,
      framework,
      browser,
      platform,
      sortBy = 'createdAt',
      order = 'DESC',
      page = 1,
      limit = 10,
    } = query || {};

    const offset = (page - 1) * limit;

    const qb = this.testRunRepository.createQueryBuilder('testRun');

    // Filtering
    if (status) qb.andWhere('testRun.status = :status', { status });
    if (framework) qb.andWhere('testRun.framework = :framework', { framework });
    if (browser) qb.andWhere('testRun.browser = :browser', { browser });
    if (platform) qb.andWhere('testRun.platform = :platform', { platform });

    // Sorting
    qb.orderBy(`testRun.${sortBy}`, order);

    // Pagination
    qb.skip(offset).take(limit);

    // Execute query
    const [data, total] = await qb.getManyAndCount();

    return { data, total };
  }

  async findOne(id: number): Promise<TestRun> {
    const testRun = await this.testRunRepository.findOne({
      where: { id },
      relations: ['tests'],
    });

    if (!testRun) {
      throw new NotFoundException(`TestRun with ID ${id} not found`);
    }

    return testRun;
  }

  async update(id: number, updateTestRunDto: UpdateTestRunDto): Promise<TestRun> {
    const testRun = await this.testRunRepository.preload({
      id,
      ...updateTestRunDto,
    });

    if (!testRun) {
      throw new NotFoundException(`TestRun with ID ${id} not found`);
    }

    return this.testRunRepository.save(testRun);
  }

  async remove(id: number): Promise<void> {
    const result = await this.testRunRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`TestRun with ID ${id} not found`);
    }
  }
}
