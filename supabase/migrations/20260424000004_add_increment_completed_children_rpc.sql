-- Atomic increment for fan-out completion tracking
-- Called by enrich-topic orchestrator after each child task finishes
CREATE OR REPLACE FUNCTION increment_completed_children(job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE jobs
  SET completed_children = completed_children + 1
  WHERE id = job_id;
END;
$$;
