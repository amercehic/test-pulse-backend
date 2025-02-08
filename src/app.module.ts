import { PrismaService } from '@db/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '@/auth/auth.module';
import { InvitationModule } from '@/invitation/invitation.module';
import { StorageModule } from '@/storage/storage.module';
import { TestRunModule } from '@/test-run/test-run.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
    }),
    TestRunModule,
    AuthModule,
    InvitationModule,
    StorageModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
