import { NestFactory } from '@nestjs/core';
// Triggering restart for image processing routes
import { ValidationPipe } from '@nestjs/common';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('='.repeat(50));
  console.log('🚀 Starting Postia Backend');
  console.log('='.repeat(50));
  console.log('Environment Variables Check:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  PORT:', process.env.PORT);
  console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('  GCP_PROJECT_ID:', process.env.GCP_PROJECT_ID);
  console.log('  GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME);
  console.log('='.repeat(50));

  console.log('Creating NestJS application...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  console.log('✅ NestJS application created successfully');

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['auth/callback'],
  });

  // CORS
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:19006'];

      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      // Check if origin matches any allowed pattern
      const isAllowed = allowedOrigins.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(origin);
        }
        return pattern === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Postia API')
    .setDescription('Content planning and scheduler API for marketing agencies')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('instagram', 'Instagram account management')
    .addTag('calendar', 'Content calendar management')
    .addTag('upload', 'File upload endpoints')
    .addTag('analytics', 'Instagram analytics')
    .addTag('trending', 'Trending topics')
    .addTag('business-profile', 'Business profile management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  console.log('='.repeat(50));
  console.log(`🌐 Starting HTTP server on port ${port}...`);
  await app.listen(port, '0.0.0.0');
  console.log('='.repeat(50));
  console.log('✅ APPLICATION SUCCESSFULLY STARTED');
  console.log(`📍 Server listening on: http://0.0.0.0:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔗 Health check: http://localhost:${port}/api`);
  console.log('='.repeat(50));
}

bootstrap().catch(err => {
  console.error('='.repeat(50));
  console.error('❌ FATAL ERROR - Failed to start application');
  console.error('='.repeat(50));
  console.error('Error details:', err);
  console.error('Stack trace:', err.stack);
  console.error('='.repeat(50));
  process.exit(1);
});
