import { AppModule } from '@/app.module';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Test Pulse API')
    .setDescription('API documentation for Test Pulse backend')
    .setVersion('1.0')
    .addBearerAuth() // Enable Bearer token authentication
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Swagger UI at /api/docs

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // ✅ Use NestJS Logger instead of console.log
  logger.log(`🚀 Application is running on: http://localhost:${port}/api/docs`);
}

bootstrap();
