import { Module } from '@nestjs/common';
import { SchedulerController } from './scheduler.controller';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [CalendarModule],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
