import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Test } from './test.entity';

@Entity()
export class TestRun {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  name: string;

  @Column()
  triggeredBy: string;

  @Column()
  status: 'passed' | 'failed';

  @Column('float')
  duration: number; // Duration in seconds

  @Column()
  commit: string;

  @Column()
  branch: string;

  @Column()
  framework: string;

  @Column()
  browser: string;

  @Column()
  browserVersion: string;

  @Column()
  platform: string;

  @OneToMany(() => Test, (test) => test.testRun, { cascade: true })
  tests: Test[];
}
