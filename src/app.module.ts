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
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => typeOrmConfig,
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
