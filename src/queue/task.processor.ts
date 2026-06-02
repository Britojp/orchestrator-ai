import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { AgentService } from '../agent/agent.service';
import { GitService } from '../git/git.service';
import { GithubService } from '../github/github.service';
import { TasksRepository } from '../supabase/tasks.repository';
import {
  TASK_JOB_EXECUTE,
  TASK_QUEUE_NAME,
  TaskJobPayload,
} from './task.constants';

@Processor(TASK_QUEUE_NAME, {
  concurrency: 1,
  lockDuration: 120_000,
  lockRenewTime: 30_000,
  stalledInterval: 30_000,
  maxStalledCount: 2,
})
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly gitService: GitService,
    private readonly agentService: AgentService,
    private readonly githubService: GithubService,
  ) {
    super();
  }

  async process(job: Job<TaskJobPayload>): Promise<void> {
    const { taskId } = job.data;
    const started = Date.now();

    this.logEvent(taskId, 'started', started);

    const task =
      job.data.task ?? (await this.tasksRepository.findById(taskId));
    if (!task) {
      throw new UnrecoverableError(
        `Tarefa não encontrada: ${taskId}. Verifique SUPABASE_SERVICE_ROLE_KEY (deve ser service_role, não publishable) e RLS. Remova jobs órfãos no Bull Board.`,
      );
    }

    if (task.status === 'done' && task.pr_url) {
      this.logEvent(taskId, 'skipped_already_done', started);
      return;
    }

    try {
      const branchName = await this.gitService.prepareBranch(taskId);
      await this.tasksRepository.saveBranchName(taskId, branchName);

      const agentResult = await this.agentService.runTask(task, branchName);
      await this.tasksRepository.markStarted(
        taskId,
        agentResult.runId,
        agentResult.agentId,
      );

      let hasCommits = await this.gitService.hasCommitsAheadOfBase(branchName);
      if (!hasCommits) {
        const committed = await this.gitService.commitPendingChanges(
          taskId,
          agentResult.summary,
        );
        if (committed) {
          this.logger.log(
            `Commit automático aplicado para tarefa ${taskId} na branch ${branchName}`,
          );
          hasCommits = await this.gitService.hasCommitsAheadOfBase(branchName);
        }
      }
      if (!hasCommits) {
        throw new Error('Agente não produziu commits na branch');
      }

      await this.gitService.push(branchName);

      const pr = await this.githubService.createPullRequest(
        task,
        branchName,
        agentResult.summary,
      );

      await this.tasksRepository.markDone(taskId, {
        prUrl: pr.prUrl,
        prNumber: pr.prNumber,
        branchName,
        agentRunId: agentResult.runId,
        agentAgentId: agentResult.agentId,
      });

      this.logEvent(taskId, 'completed', started, { prUrl: pr.prUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha na tarefa ${taskId}: ${message}`);

      const attemptsMade = job.attemptsMade;
      const isLastAttempt = attemptsMade >= job.opts.attempts! - 1;

      await this.tasksRepository.markFailed(taskId, message, {
        definitive: isLastAttempt,
        incrementRetry: true,
      });

      this.logEvent(taskId, 'failed', started, { error: message });
      throw error;
    }
  }

  private logEvent(
    taskId: string,
    event: string,
    startedAt: number,
    extra?: Record<string, unknown>,
  ): void {
    this.logger.log(
      JSON.stringify({
        taskId,
        event,
        durationMs: Date.now() - startedAt,
        ...extra,
      }),
    );
  }
}
