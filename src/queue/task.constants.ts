export const TASK_QUEUE_NAME = 'task-execution';
export const TASK_JOB_EXECUTE = 'execute';

import { TaskRecord } from '../supabase/task.types';

export interface TaskJobPayload {
  taskId: string;
  task: TaskRecord;
}
