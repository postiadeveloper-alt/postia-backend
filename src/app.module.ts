import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstagramModule } from './instagram/instagram.module';
import { CalendarModule } from './calendar/calendar.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TrendingModule } from './trending/trending.module';
import { BusinessProfileModule } from './business-profile/business-profile.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StorageModule } from './storage/storage.module';
import { ImageProcessingModule } from './image-processing/image-processing.module';
import { ContentStrategyModule } from './content-strategy/content-strategy.module';
import { CloudTasksModule } from './cloud-tasks/cloud-tasks.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        console.log('🔍 Database Configuration Check:');
        console.log('  DATABASE_URL configured:', !!databaseUrl);
        console.log('  DATABASE_URL length:', databaseUrl?.length);
        console.log('  DATABASE_URL preview:', databaseUrl?.substring(0, 50) + '...');
        console.log('  NODE_ENV:', process.env.NODE_ENV);
        console.log('  DB_SSL:', process.env.DB_SSL);

        if (!databaseUrl) {
          console.error('❌ DATABASE_URL is not configured!');
          throw new Error('DATABASE_URL environment variable is required');
        }

        // Validate DATABASE_URL format
        if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
          console.error('❌ DATABASE_URL has invalid format:', databaseUrl.substring(0, 20));
          throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
        }

        console.log('✅ Using DATABASE_URL for database connection');
        const config = {
          type: 'postgres' as const,
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV === 'development',
          ssl: {
            rejectUnauthorized: false,
          },
          connectTimeoutMS: 20000,
          retryAttempts: 5,
          retryDelay: 5000,
          logging: ['error', 'warn'] as ('query' | 'error' | 'schema' | 'warn' | 'info' | 'log')[],
        };
        console.log('✅ TypeORM configuration created');
        return config;
      },
    }),
    AuthModule,
    UsersModule,
    InstagramModule,
    CalendarModule,
    AnalyticsModule,
    TrendingModule,
    BusinessProfileModule,
    SchedulerModule,
    StorageModule,
    ImageProcessingModule,
    ContentStrategyModule,
    CloudTasksModule,
  ],
})
export class AppModule { }

