import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { TaskRecord } from './task.types';
import { SUPABASE_CLIENT } from './supabase.tokens';

export interface MarkDoneParams {
  prUrl: string;
  prNumber: number | null;
  branchName: string;
  agentRunId: string | null;
  agentAgentId: string | null;
}

@Injectable()
export class TasksRepository implements OnModuleInit {
  private readonly logger = new Logger(TasksRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    this.assertServiceRoleKey();
    await this.verifyTableReadAccess();
  }

  private assertServiceRoleKey(): void {
    const key = this.env.SUPABASE_SERVICE_ROLE_KEY;
    if (key.includes('publishable') || key.startsWith('eyJ') && key.length < 200) {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY parece anon/publishable. Use a chave service_role em Settings → API.',
      );
    }
  }

  private async verifyTableReadAccess(): Promise<void> {
    const { error } = await this.supabase.from('tasks').select('id').limit(1);
    if (error) {
      throw new Error(
        `Supabase sem leitura em tasks: ${error.message}. Aplique a migration e use service_role.`,
      );
    }
    this.logger.log('Supabase tasks: leitura OK');
  }

  async claimNext(): Promise<TaskRecord | null> {
    const { data, error } = await this.supabase.rpc('claim_next_task', {
      p_worker_id: this.env.WORKER_ID,
    });

    if (error) {
      throw new Error(`claim_next_task: ${error.message}`);
    }

    const rows = data as TaskRecord[] | null;
    if (!rows?.length) {
      return null;
    }
    return rows[0];
  }

  async findById(taskId: string): Promise<TaskRecord | null> {
    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (error) {
      throw new Error(`findById: ${error.message}`);
    }
    return data as TaskRecord | null;
  }

  async saveBranchName(taskId: string, branchName: string): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .update({ branch_name: branchName })
      .eq('id', taskId);

    if (error) {
      throw new Error(`saveBranchName: ${error.message}`);
    }
  }

  async markStarted(
    taskId: string,
    agentRunId: string,
    agentAgentId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .update({
        started_at: new Date().toISOString(),
        agent_run_id: agentRunId,
        agent_agent_id: agentAgentId,
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`markStarted: ${error.message}`);
    }
  }

  async markDone(taskId: string, params: MarkDoneParams): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .update({
        status: 'done',
        pr_url: params.prUrl,
        pr_number: params.prNumber,
        branch_name: params.branchName,
        agent_run_id: params.agentRunId,
        agent_agent_id: params.agentAgentId,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`markDone: ${error.message}`);
    }
  }

  async markFailed(
    taskId: string,
    errorMessage: string,
    options: { definitive: boolean; incrementRetry: boolean },
  ): Promise<void> {
    const task = await this.findById(taskId);
    const retryCount = (task?.retry_count ?? 0) + (options.incrementRetry ? 1 : 0);
    const maxRetries = this.env.MAX_RETRIES;
    const backToPending =
      !options.definitive && retryCount <= maxRetries;

    const { error } = await this.supabase
      .from('tasks')
      .update({
        status: backToPending ? 'pending' : 'failed',
        error_message: errorMessage.slice(0, 2000),
        retry_count: retryCount,
        failed_at: backToPending ? null : new Date().toISOString(),
        ...(backToPending
          ? { claimed_by: null, claimed_at: null }
          : {}),
      })
      .eq('id', taskId);

    if (error) {
      throw new Error(`markFailed: ${error.message}`);
    }
  }

  async createSubTasks(
    parentId: string,
    featureBranch: string,
    subtasks: Array<{ title: string; description: string; acceptance_criteria: string; depends_on: number[] }>,
    priority: number,
  ): Promise<TaskRecord[]> {
    // Insert without deps first to obtain real UUIDs
    const rows = subtasks.map((s) => ({
      title: s.title,
      description: s.description,
      acceptance_criteria: s.acceptance_criteria,
      status: 'pending' as const,
      priority,
      parent_task_id: parentId,
      feature_branch: featureBranch,
    }));

    const { data, error } = await this.supabase
      .from('tasks')
      .insert(rows)
      .select('*');

    if (error) {
      throw new Error(`createSubTasks: ${error.message}`);
    }

    const inserted = data as TaskRecord[];
    const ids = inserted.map((r) => r.id);

    // Apply dependency graph: map indices → UUIDs, mark as blocked when needed
    const updatePromises: PromiseLike<any>[] = [];

    for (let i = 0; i < subtasks.length; i++) {
      const depIndices = subtasks[i].depends_on;
      if (!depIndices.length) continue;

      const depIds = depIndices.map((idx) => ids[idx]).filter(Boolean);
      if (!depIds.length) continue;

      // Prepare promise for the update
      const promise = this.supabase
        .from('tasks')
        .update({ depends_on: depIds, status: 'blocked' })
        .eq('id', ids[i])
        .then(({ error: updErr }) => {
          if (updErr) {
            throw new Error(`createSubTasks dep update: ${updErr.message}`);
          }
        });

      updatePromises.push(promise);

      // We still update the returned array in memory synchronously
      inserted[i].depends_on = depIds;
      inserted[i].status = 'blocked';
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    return inserted;
  }

  async markWaitingSubtasks(taskId: string, featureBranch: string): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .update({ status: 'waiting_subtasks', feature_branch: featureBranch })
      .eq('id', taskId);

    if (error) {
      throw new Error(`markWaitingSubtasks: ${error.message}`);
    }
  }

  async allSubtasksDone(parentId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('parent_task_id', parentId)
      .in('status', ['pending', 'in_progress', 'waiting_subtasks', 'blocked']);

    if (error) {
      throw new Error(`allSubtasksDone: ${error.message}`);
    }
    return (count ?? 1) === 0;
  }

  async unblockReadySubtasks(completedTaskId: string): Promise<TaskRecord[]> {
    const { data, error } = await this.supabase.rpc('get_unblocked_subtasks', {
      p_completed_task_id: completedTaskId,
    });

    if (error) {
      throw new Error(`get_unblocked_subtasks: ${error.message}`);
    }
    return (data as TaskRecord[]) ?? [];
  }

  async releaseInProgressClaim(
    taskId: string,
    reason: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('tasks')
      .update({
        status: 'pending',
        claimed_by: null,
        claimed_at: null,
        error_message: reason.slice(0, 2000),
      })
      .eq('id', taskId)
      .eq('status', 'in_progress');

    if (error) {
      throw new Error(`releaseInProgressClaim: ${error.message}`);
    }
  }

  async reclaimStaleLocks(): Promise<number> {
    const { data, error } = await this.supabase.rpc('reclaim_stale_tasks', {
      p_stale_minutes: this.env.STALE_LOCK_MINUTES,
    });

    if (error) {
      throw new Error(`reclaim_stale_tasks: ${error.message}`);
    }
    return (data as number) ?? 0;
  }
}
