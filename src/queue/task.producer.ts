import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { TaskRecord } from '../supabase/task.types';
import {
  TASK_JOB_EXECUTE,
  TASK_QUEUE_NAME,
  TaskJobPayload,
} from './task.constants';

@Injectable()
export class TaskProducer {
  private readonly logger = new Logger(TaskProducer.name);

  constructor(
    @InjectQueue(TASK_QUEUE_NAME) private readonly queue: Queue<TaskJobPayload>,
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
  ) {}

  async enqueueIfAbsent(task: TaskRecord): Promise<boolean> {
    const existing = await this.queue.getJob(task.id);
    if (existing) {
      const state = await existing.getState();
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return false;
      }
    }

    await this.queue.add(
      TASK_JOB_EXECUTE,
      { taskId: task.id, task },
      {
        jobId: task.id,
        attempts: this.env.MAX_RETRIES + 1,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Job enfileirado: ${task.id}`);
    return true;
  }
}
