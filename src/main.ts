import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '@/app.module';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Set global prefix for API
  app.setGlobalPrefix('api/v1');

  // Register the global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Build the Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Test Pulse API')
    .setDescription('API documentation for Test Pulse backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // Create the Swagger document
  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI at /api/v1/docs
  SwaggerModule.setup('api/docs', app, document);

  // Serve the raw JSON documentation at /api/v1/api-json
  app.getHttpAdapter().get('/api/docs/api-json', (req, res) => {
    res.json(document);
  });

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  const appUrl = process.env.APP_URL || `http://localhost:${port}`;

  logger.log(`🚀 Application is running at: ${appUrl}/api/v1`);
  logger.log(`📄 Swagger documentation at: ${appUrl}/api/docs`);
}

bootstrap();
