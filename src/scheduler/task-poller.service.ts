import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ENV_CONFIG } from '../config/config.tokens';
import { EnvConfig } from '../config/env.schema';
import { TaskProducer } from '../queue/task.producer';
import { TasksRepository } from '../supabase/tasks.repository';

@Injectable()
export class TaskPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskPollerService.name);
  private intervalRef?: NodeJS.Timeout;

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly taskProducer: TaskProducer,
    @Inject(ENV_CONFIG) private readonly env: EnvConfig,
  ) {}

  onModuleInit(): void {
    void this.pollPendingTasks();
    this.intervalRef = setInterval(
      () => void this.pollPendingTasks(),
      this.env.POLL_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  async pollPendingTasks(): Promise<void> {
    await this.reclaimStaleIfNeeded();

    const task = await this.tasksRepository.claimNext();
    if (!task) {
      return;
    }

    this.logger.log(`Tarefa claimed: ${task.id} — ${task.title}`);
    await this.taskProducer.enqueueIfAbsent(task);
  }

  private async reclaimStaleIfNeeded(): Promise<void> {
    const reclaimed = await this.tasksRepository.reclaimStaleLocks();
    if (reclaimed > 0) {
      this.logger.warn(`Locks stale recuperados: ${reclaimed}`);
    }
  }
}
