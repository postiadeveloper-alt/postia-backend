import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ContentStrategyController } from './content-strategy.controller';
import { ContentStrategyService } from './content-strategy.service';
import { ContentStrategy } from './entities/content-strategy.entity';
import { BusinessProfileModule } from '../business-profile/business-profile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentStrategy]),
    ConfigModule,
    BusinessProfileModule,
  ],
  controllers: [ContentStrategyController],
  providers: [ContentStrategyService],
  exports: [ContentStrategyService],
})
export class ContentStrategyModule {}
