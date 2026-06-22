import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskPollerService } from './task-poller.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, QueueModule],
  providers: [TaskPollerService],
})
export class SchedulerModule {}
