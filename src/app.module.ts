import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { TestRunModule } from './test-run/test-run.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`], // Load `.env` files based on the environment
    }),
    TestRunModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
