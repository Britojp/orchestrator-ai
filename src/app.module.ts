import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { ConfigModule } from './config/config.module';
import { GitModule } from './git/git.module';
import { GithubModule } from './github/github.module';
import { QueueModule } from './queue/queue.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    GitModule,
    AgentModule,
    GithubModule,
    QueueModule,
    SchedulerModule,
  ],
})
export class AppModule {}
