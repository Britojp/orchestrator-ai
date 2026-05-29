CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'done',
  'failed',
  'cancelled'
);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  acceptance_criteria text NOT NULL,
  status task_status NOT NULL DEFAULT 'pending',
  priority smallint NOT NULL DEFAULT 0,
  branch_base text,
  branch_name text,
  pr_url text,
  pr_number integer,
  agent_run_id text,
  agent_agent_id text,
  error_message text,
  retry_count smallint NOT NULL DEFAULT 0,
  claimed_by text,
  claimed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_pending_queue_idx ON tasks (priority DESC, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX tasks_stale_lock_idx ON tasks (claimed_at)
  WHERE status = 'in_progress';

CREATE OR REPLACE FUNCTION set_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_tasks_updated_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION claim_next_task(p_worker_id text)
RETURNS SETOF tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE tasks
  SET
    status = 'in_progress',
    claimed_by = p_worker_id,
    claimed_at = now(),
    updated_at = now()
  WHERE id = (
    SELECT t.id
    FROM tasks t
    WHERE t.status = 'pending'
    ORDER BY t.priority DESC, t.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION reclaim_stale_tasks(p_stale_minutes integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE tasks
  SET
    status = 'pending',
    claimed_by = null,
    claimed_at = null,
    updated_at = now()
  WHERE status = 'in_progress'
    AND claimed_at < now() - (p_stale_minutes || ' minutes')::interval;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
