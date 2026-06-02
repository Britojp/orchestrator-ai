ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'waiting_subtasks';

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES tasks(id),
  ADD COLUMN IF NOT EXISTS feature_branch text;
