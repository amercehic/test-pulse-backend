import { Injectable } from '@nestjs/common';
import { CreateTestResultDto } from './dto/create-test-result.dto';

interface TestResult {
  id: number;
  framework: string;
  status: string;
  logs?: string[];
  createdAt: Date;
}

@Injectable()
export class TestResultsService {
  private testResults: TestResult[] = []; // Explicitly define the type of testResults

  create(dto: CreateTestResultDto): TestResult {
    const newResult: TestResult = {
      id: this.testResults.length + 1,
      ...dto,
      createdAt: new Date(),
    };
    this.testResults.push(newResult);
    return newResult;
  }

  findAll(): TestResult[] {
    return this.testResults;
  }
}
