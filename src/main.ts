import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service to read environment values
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3000;

  // CORS, global pipes, etc., can be configured here if needed
  await app.listen(port);
  console.log(`TestPulse backend is running on http://localhost:${port}`);
}
bootstrap();
