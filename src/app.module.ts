import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstagramModule } from './instagram/instagram.module';
import { CalendarModule } from './calendar/calendar.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TrendingModule } from './trending/trending.module';
import { BusinessProfileModule } from './business-profile/business-profile.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StorageModule } from './storage/storage.module';

@Module({
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
        console.log('  NODE_ENV:', process.env.NODE_ENV);
        console.log('  DB_SSL:', process.env.DB_SSL);
        
        if (!databaseUrl) {
          console.error('❌ DATABASE_URL is not configured!');
          throw new Error('DATABASE_URL environment variable is required');
        }
        
        console.log('✅ Using DATABASE_URL for database connection');
        const config = {
          type: 'postgres' as const,
          url: databaseUrl,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV === 'development',
          ssl: true,
          extra: {
            ssl: { rejectUnauthorized: false },
          },
          connectTimeoutMS: 10000,
          retryAttempts: 3,
          retryDelay: 3000,
          logging: false,
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
  ],
})
export class AppModule {}
