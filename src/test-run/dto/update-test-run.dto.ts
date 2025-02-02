import { PartialType } from '@nestjs/mapped-types';
import { CreateTestRunDto } from '@/test-run/dto/create-test-run.dto';

export class UpdateTestRunDto extends PartialType(CreateTestRunDto) {}
