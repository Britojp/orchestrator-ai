import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { AgentModule } from '../agent/agent.module';
import { GitModule } from '../git/git.module';
import { GithubModule } from '../github/github.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { TASK_QUEUE_NAME } from './task.constants';
import { QueueRecoveryService } from './queue-recovery.service';
import { TaskProcessor } from './task.processor';
import { TaskProducer } from './task.producer';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ENV_CONFIG],
      useFactory: (env: EnvConfig) => ({
        connection: { url: env.REDIS_URL },
      }),
    }),
    BullModule.registerQueue({ name: TASK_QUEUE_NAME }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: TASK_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    SupabaseModule,
    GitModule,
    AgentModule,
    GithubModule,
  ],
  providers: [QueueRecoveryService, TaskProducer, TaskProcessor],
  exports: [TaskProducer],
})
export class QueueModule {}
