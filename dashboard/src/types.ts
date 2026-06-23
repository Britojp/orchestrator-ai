export interface Task {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';
  priority: number;
  branch_base?: string;
  branch_name?: string;
  pr_url?: string;
  pr_number?: number;
  agent_run_id?: string;
  agent_agent_id?: string;
  error_message?: string;
  retry_count: number;
  claimed_by?: string;
  claimed_at?: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  created_at: string;
  updated_at: string;
}
