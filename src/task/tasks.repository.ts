import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskRecord } from './task.types';

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TaskRecord | null> {
    return this.prisma.task.findUnique({ where: { id } }) as Promise<TaskRecord | null>;
  }

  async claimNext(): Promise<TaskRecord | null> {
    // For MVP, just find first pending
    const tasks = await this.prisma.$queryRaw<TaskRecord[]>`
      UPDATE tasks
      SET status = 'in_progress',
          claimed_at = NOW(),
          updated_at = NOW()
      WHERE id = (
        SELECT id FROM tasks
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `;
    return tasks[0] || null;
  }

  async markStarted(id: string, runId: string, agentId: string): Promise<void> {
    await this.prisma.task.update({
      where: { id },
      data: {
        started_at: new Date(),
        agent_run_id: runId,
        agent_agent_id: agentId,
      },
    });
  }

  async markDone(id: string, info: any): Promise<void> {
    await this.prisma.task.update({
      where: { id },
      data: {
        status: 'done',
        completed_at: new Date(),
        pr_url: info.prUrl,
        pr_number: info.prNumber,
        branch_name: info.branchName,
        agent_run_id: info.agentRunId,
        agent_agent_id: info.agentAgentId,
      },
    });
  }

  async markFailed(id: string, message: string, opts: any): Promise<void> {
    await this.prisma.task.update({
      where: { id },
      data: {
        status: opts.definitive ? 'failed' : 'pending',
        error_message: message,
        failed_at: opts.definitive ? new Date() : null,
        retry_count: opts.incrementRetry ? { increment: 1 } : undefined,
      },
    });
  }

  async saveBranchName(id: string, branchName: string): Promise<void> {
    await this.prisma.task.update({
      where: { id },
      data: { branch_name: branchName },
    });
  }

  async createSubTasks(parentId: string, featureBranch: string, subtasks: any[], priority: number): Promise<TaskRecord[]> {
    // Basic mock implementation for types
    return [];
  }

  async markWaitingSubtasks(id: string, featureBranch: string): Promise<void> {
    await this.prisma.task.update({
      where: { id },
      data: { status: 'waiting_subtasks' },
    });
  }

  async unblockReadySubtasks(id: string): Promise<TaskRecord[]> {
    return [];
  }

  async allSubtasksDone(parentId: string): Promise<boolean> {
    return true;
  }

  async releaseInProgressClaim(id: string, reason: string): Promise<void> {
    await this.prisma.task.update({
      where: { id },
      data: {
        status: 'pending',
        claimed_by: null,
        claimed_at: null,
        error_message: reason,
      },
    });
  }

  async reclaimStaleLocks(): Promise<number> {
    return 0;
  }
}
