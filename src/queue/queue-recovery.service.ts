import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { TasksRepository } from '../supabase/tasks.repository';
import { TASK_QUEUE_NAME, TaskJobPayload } from './task.constants';

@Injectable()
export class QueueRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(QueueRecoveryService.name);

  constructor(
    @InjectQueue(TASK_QUEUE_NAME)
    private readonly queue: Queue<TaskJobPayload>,
    private readonly tasksRepository: TasksRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const released = await this.releaseOrphanedActiveJobs();
    if (released > 0) {
      this.logger.warn(
        `${released} job(s) ativo(s) órfão(s) liberado(s). A tarefa voltou para pending no Supabase.`,
      );
    }
  }

  async releaseOrphanedActiveJobs(): Promise<number> {
    const activeJobs = await this.queue.getJobs(['active']);
    if (!activeJobs.length) {
      return 0;
    }

    let released = 0;
    for (const job of activeJobs) {
      const taskId = job.data?.taskId ?? String(job.id);
      await this.removeStuckJob(job);
      await this.tasksRepository.releaseInProgressClaim(
        taskId,
        'Job interrompido (worker reiniciado ou travado na fila)',
      );
      this.logger.warn(`Job ativo órfão liberado: ${taskId}`);
      released += 1;
    }

    return released;
  }

  private async removeStuckJob(job: Job<TaskJobPayload>): Promise<void> {
    try {
      if (job.token) {
        await job.moveToFailed(
          new Error('Orquestrador reiniciou com job ainda ativo na fila'),
          job.token,
        );
        return;
      }
      await job.remove();
    } catch {
      const redis = (await this.queue.client) as unknown as {
        del: (key: string) => Promise<number>;
        lrem: (key: string, count: number, value: string) => Promise<number>;
      };
      const prefix = `bull:${TASK_QUEUE_NAME}`;
      const jobId = String(job.id);
      await redis.del(`${prefix}:${jobId}:lock`);
      await redis.lrem(`${prefix}:active`, 0, jobId);
      await job.remove();
    }
  }
}
