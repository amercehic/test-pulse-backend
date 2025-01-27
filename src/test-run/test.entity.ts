import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';
import { TestHistory } from './test-history.entity';

@Entity()
export class Test {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  status: 'passed' | 'failed';

  @Column('float')
  duration: number;

  @Column('text')
  logs: string;

  @ManyToOne(() => TestRun, (testRun) => testRun.tests, { onDelete: 'CASCADE' })
  testRun: TestRun;

  @OneToOne(() => TestHistory, { cascade: true, nullable: true })
  @JoinColumn()
  previousRun: TestHistory; // Ensure this is correct
}
