import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@db/prisma.service';
import { TestRunModule } from '@/test-run/test-run.module';
import { AuthModule } from '@/auth/auth.module';
import { InvitationModule } from '@/invitation/invitation.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
    }),
    TestRunModule,
    AuthModule,
    InvitationModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
