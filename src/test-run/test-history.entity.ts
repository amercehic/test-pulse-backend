import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TestHistory {
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
}
