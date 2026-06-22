export interface TaskRecord {
  id: string;
  project_id?: string | null;
  title: string;
  description: string;
  acceptance_criteria: string;
  status: string;
  priority: number;
  branch_base?: string | null;
  branch_name?: string | null;
  pr_url?: string | null;
  pr_number?: number | null;
  agent_run_id?: string | null;
  agent_agent_id?: string | null;
  error_message?: string | null;
  retry_count: number;
  claimed_by?: string | null;
  claimed_at?: Date | null;
  started_at?: Date | null;
  completed_at?: Date | null;
  failed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  parent_task_id?: string | null;
  feature_branch?: string | null;
}
