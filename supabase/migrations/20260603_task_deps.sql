ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'blocked';

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS depends_on uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS tasks_blocked_deps_idx ON tasks USING GIN (depends_on)
  WHERE status = 'blocked';

-- Updated claim: skips tasks whose deps are not all done
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
    status     = 'in_progress',
    claimed_by = p_worker_id,
    claimed_at = now(),
    updated_at = now()
  WHERE id = (
    SELECT t.id
    FROM tasks t
    WHERE t.status = 'pending'
      AND (
        cardinality(t.depends_on) = 0
        OR NOT EXISTS (
          SELECT 1 FROM tasks d
          WHERE d.id = ANY(t.depends_on)
            AND d.status <> 'done'
        )
      )
    ORDER BY t.priority DESC, t.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Unblocks subtasks whose last unmet dep just completed.
-- Call after marking a task as done; returns newly unblocked rows.
CREATE OR REPLACE FUNCTION get_unblocked_subtasks(p_completed_task_id uuid)
RETURNS SETOF tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE tasks
  SET status = 'pending', updated_at = now()
  WHERE status = 'blocked'
    AND p_completed_task_id = ANY(depends_on)
    AND NOT EXISTS (
      SELECT 1 FROM tasks d
      WHERE d.id = ANY(tasks.depends_on)
        AND d.status <> 'done'
    )
  RETURNING *;
END;
$$;
