export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  status: TaskStatus;
  priority: number;
  branch_base: string | null;
  branch_name: string | null;
  pr_url: string | null;
  pr_number: number | null;
  agent_run_id: string | null;
  agent_agent_id: string | null;
  error_message: string | null;
  retry_count: number;
  claimed_by: string | null;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}
