import { AppModule } from '@/app.module';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Build the Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Test Pulse API')
    .setDescription('API documentation for Test Pulse backend')
    .setVersion('1.0')
    .addBearerAuth() // Enable Bearer token authentication
    .build();

  // Create the Swagger document
  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document);

  // Serve the raw JSON documentation at /api-json
  // This uses the Express adapter's 'get' method:
  app.getHttpAdapter().get('/api-json', (req, res) => {
    res.json(document);
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api/docs`);
  logger.log(`📄 Swagger JSON available at: http://localhost:${port}/api-json`);
}

bootstrap();
