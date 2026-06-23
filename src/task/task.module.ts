import { Global, Module } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';

@Global()
@Module({
  providers: [TasksRepository],
  exports: [TasksRepository],
})
export class TaskModule {}
