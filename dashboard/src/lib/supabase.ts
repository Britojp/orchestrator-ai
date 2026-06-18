import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Dashboard will not function correctly.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type for the tasks table based on the backend specification
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
