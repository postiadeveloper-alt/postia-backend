import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrendingService } from './trending.service';
import { TrendingController } from './trending.controller';
import { InstagramModule } from '../instagram/instagram.module';
import { BusinessProfileModule } from '../business-profile/business-profile.module';

@Module({
  imports: [HttpModule, InstagramModule, BusinessProfileModule],
  controllers: [TrendingController],
  providers: [TrendingService],
  exports: [TrendingService],
})
export class TrendingModule { }
