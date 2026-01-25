import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { InstagramModule } from '../instagram/instagram.module';
import { Post } from '../calendar/entities/post.entity';

@Module({
  imports: [
    HttpModule,
    InstagramModule,
    TypeOrmModule.forFeature([Post]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
