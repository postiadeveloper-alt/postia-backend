import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { UploadController } from './upload.controller';
import { Post } from './entities/post.entity';
import { InstagramModule } from '../instagram/instagram.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    InstagramModule,
    StorageModule,
  ],
  controllers: [CalendarController, UploadController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
