import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { Post } from './entities/post.entity';
import { InstagramModule } from '../instagram/instagram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    InstagramModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
