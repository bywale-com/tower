-- Job type to distinguish orchestrator from child tasks
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'enrich-topic';

-- Self-referential FK for fan-out tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS parent_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;

-- Fan-out progress counters
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_children integer DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_children integer DEFAULT 0;

-- Index for quickly finding children of a parent job
CREATE INDEX IF NOT EXISTS jobs_parent_job_id_idx ON jobs(parent_job_id) WHERE parent_job_id IS NOT NULL;

-- Index for polling by status (orchestrator needs this)
CREATE INDEX IF NOT EXISTS jobs_status_stage_idx ON jobs(status, stage);
