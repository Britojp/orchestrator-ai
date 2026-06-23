import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { ConfigModule } from './config/config.module';
import { GitModule } from './git/git.module';
import { GithubModule } from './github/github.module';
import { QueueModule } from './queue/queue.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PrismaModule } from './prisma/prisma.module';
import { TaskModule } from './task/task.module';
import { ConversationContextModule } from './conversation-context/conversation-context.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    TaskModule,
    ConversationContextModule,
    GitModule,
    AgentModule,
    GithubModule,
    QueueModule,
    SchedulerModule,
  ],
})
export class AppModule {}
