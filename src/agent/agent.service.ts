import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { TaskRecord } from '../supabase/task.types';
import { AgentRunResult, IAgentProvider } from './agent-provider.interface';
import { AGENT_PROVIDER } from './agent.tokens';

@Injectable()
export class AgentService implements OnModuleInit {
  constructor(
    @Inject(AGENT_PROVIDER) private readonly provider: IAgentProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.provider.init) {
      await this.provider.init();
    }
  }

  runTask(task: TaskRecord, branchName: string, workDir: string): Promise<AgentRunResult> {
    return this.provider.runTask(task, branchName, workDir);
  }
}
