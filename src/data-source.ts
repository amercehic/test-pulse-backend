import 'dotenv/config';
import { DataSource } from 'typeorm';
import { TestRun } from './test-run/test-run.entity';
import { Test } from './test-run/test.entity';
import { TestHistory } from './test-run/test-history.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'your_db_user',
  password: process.env.DB_PASSWORD || 'your_db_password',
  database: process.env.DB_NAME || 'test_pulse',
  entities: [TestRun, Test, TestHistory], // Ensure TestHistory is included
  migrations: ['./dist/migrations/*.js'],
  synchronize: false,
  logging: true,
});

export default dataSource;
