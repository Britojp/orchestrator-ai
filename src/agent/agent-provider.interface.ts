import { TaskRecord } from '../task/task.types';

export interface AgentRunResult {
  summary: string;
  runId: string;
  agentId: string;
}

export interface IAgentProvider {
  init?(): Promise<void>;
  runTask(task: TaskRecord, branchName: string, workDir: string): Promise<AgentRunResult>;
}
