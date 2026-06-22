import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { AgentService } from '../agent/agent.service';
import { DecomposerService } from '../decomposer/decomposer.service';
import { GitService } from '../git/git.service';
import { GithubService } from '../github/github.service';
import { TasksRepository } from '../task/tasks.repository';
import { TaskRecord } from '../task/task.types';
import {
  TASK_JOB_EXECUTE,
  TASK_QUEUE_NAME,
  TaskJobPayload,
} from './task.constants';
import { TaskProducer } from './task.producer';

@Processor(TASK_QUEUE_NAME, {
  concurrency: parseInt(process.env.AGENT_CONCURRENCY ?? '3', 10),
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
    private readonly decomposerService: DecomposerService,
    private readonly taskProducer: TaskProducer,
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
  ) {
    super();
  }

  async process(job: Job<TaskJobPayload>): Promise<void> {
    const { taskId } = job.data;
    const started = Date.now();

    this.logEvent(taskId, 'started', started);

    const task = job.data.task ?? (await this.tasksRepository.findById(taskId));
    if (!task) {
      throw new UnrecoverableError(
        `Tarefa não encontrada: ${taskId}. Verifique SUPABASE_SERVICE_ROLE_KEY e RLS.`,
      );
    }

    if (task.status === 'done' && task.pr_url) {
      this.logEvent(taskId, 'skipped_already_done', started);
      return;
    }

    if (task.status === 'waiting_subtasks') {
      this.logEvent(taskId, 'skipped_waiting_subtasks', started);
      return;
    }

    if (task.status === 'blocked') {
      this.logEvent(taskId, 'skipped_blocked', started);
      return;
    }

    try {
      if (task.parent_task_id) {
        await this.processSubTask(task, job, started);
      } else {
        await this.processTask(task, job, started);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha na tarefa ${taskId}: ${message}`);

      const isLastAttempt = job.attemptsMade >= job.opts.attempts! - 1;
      await this.tasksRepository.markFailed(taskId, message, {
        definitive: isLastAttempt,
        incrementRetry: true,
      });

      this.logEvent(taskId, 'failed', started, { error: message });
      throw error;
    }
  }

  private async processTask(
    task: TaskRecord,
    job: Job<TaskJobPayload>,
    started: number,
  ): Promise<void> {
    const taskId = task.id;

    const decomposition = await this.decomposerService.decompose(task);

    if (decomposition.shouldDecompose) {
      this.logEvent(taskId, 'decomposing', started, {
        subtaskCount: decomposition.subtasks.length,
      });

      const featureBranch = await this.gitService.prepareFeatureBranch(taskId);
      await this.gitService.push(featureBranch);

      const subtasks = await this.tasksRepository.createSubTasks(
        taskId,
        featureBranch,
        decomposition.subtasks,
        task.priority,
      );
      await this.tasksRepository.markWaitingSubtasks(taskId, featureBranch);

      // Only enqueue subtasks that are immediately runnable (no blocked deps)
      const ready = subtasks.filter((s) => s.status === 'pending');
      for (const sub of ready) {
        await this.taskProducer.enqueueIfAbsent(sub);
      }

      this.logEvent(taskId, 'decomposed', started, {
        featureBranch,
        total: subtasks.length,
        readyNow: ready.length,
        blocked: subtasks.length - ready.length,
        subtaskIds: subtasks.map((s) => s.id),
      });
      return;
    }

    await this.runAgentAndCreatePr(task, undefined, started);
  }

  private async processSubTask(
    task: TaskRecord,
    _job: Job<TaskJobPayload>,
    started: number,
  ): Promise<void> {
    const featureBranch = task.feature_branch!;
    await this.runAgentAndCreatePr(task, featureBranch, started);

    // Unblock siblings that were waiting on this task
    const unblocked = await this.tasksRepository.unblockReadySubtasks(task.id);
    for (const sub of unblocked) {
      await this.taskProducer.enqueueIfAbsent(sub);
      this.logEvent(task.id, 'unblocked_sibling', started, { siblingId: sub.id, siblingTitle: sub.title });
    }

    const allDone = await this.tasksRepository.allSubtasksDone(task.parent_task_id!);
    if (allDone) {
      await this.finalizeParent(task.parent_task_id!, featureBranch, started);
    }
  }

  private async runAgentAndCreatePr(
    task: TaskRecord,
    featureBranch: string | undefined,
    started: number,
  ): Promise<void> {
    const taskId = task.id;
    const prBase = featureBranch ?? this.env.BRANCH_BASE;
    const branchName = this.gitService.buildBranchName(taskId);

    const worktreePath = await this.gitService.prepareWorktree(taskId, branchName, prBase);
    await this.tasksRepository.saveBranchName(taskId, branchName);

    try {
      const agentResult = await this.agentService.runTask(task, branchName, worktreePath);
      await this.tasksRepository.markStarted(taskId, agentResult.runId, agentResult.agentId);

      let hasCommits = await this.gitService.hasCommitsAheadOfBase(branchName, prBase);
      if (!hasCommits) {
        const committed = await this.gitService.commitPendingChanges(taskId, agentResult.summary, worktreePath);
        if (committed) {
          hasCommits = await this.gitService.hasCommitsAheadOfBase(branchName, prBase);
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
        prBase,
      );

      await this.tasksRepository.markDone(taskId, {
        prUrl: pr.prUrl,
        prNumber: pr.prNumber,
        branchName,
        agentRunId: agentResult.runId,
        agentAgentId: agentResult.agentId,
      });

      this.logEvent(taskId, 'completed', started, { prUrl: pr.prUrl });
    } finally {
      await this.gitService.removeWorktree(taskId);
    }
  }

  private async finalizeParent(
    parentId: string,
    featureBranch: string,
    started: number,
  ): Promise<void> {
    this.logger.log(`Todas as sub-tasks concluídas para ${parentId}. Abrindo PR da feature branch.`);

    const parent = await this.tasksRepository.findById(parentId);
    if (!parent || parent.status === 'done') {
      return;
    }

    const pr = await this.githubService.createPullRequest(
      parent,
      featureBranch,
      `Feature branch com ${featureBranch} — sub-tasks concluídas. Ver PRs individuais para detalhes.`,
      this.env.BRANCH_BASE,
    );

    await this.tasksRepository.markDone(parentId, {
      prUrl: pr.prUrl,
      prNumber: pr.prNumber,
      branchName: featureBranch,
      agentRunId: null,
      agentAgentId: null,
    });

    this.logEvent(parentId, 'parent_completed', started, { prUrl: pr.prUrl, featureBranch });
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
