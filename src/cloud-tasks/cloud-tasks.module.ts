import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudTasksService } from './cloud-tasks.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudTasksService],
  exports: [CloudTasksService],
})
export class CloudTasksModule {}
