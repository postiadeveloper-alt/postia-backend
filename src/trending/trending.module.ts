import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrendingService } from './trending.service';
import { TrendingController } from './trending.controller';
import { InstagramModule } from '../instagram/instagram.module';

@Module({
  imports: [HttpModule, InstagramModule],
  controllers: [TrendingController],
  providers: [TrendingService],
  exports: [TrendingService],
})
export class TrendingModule {}
