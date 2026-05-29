import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from '../queue/queue.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { TaskPollerService } from './task-poller.service';

@Module({
  imports: [ScheduleModule.forRoot(), SupabaseModule, QueueModule],
  providers: [TaskPollerService],
})
export class SchedulerModule {}
