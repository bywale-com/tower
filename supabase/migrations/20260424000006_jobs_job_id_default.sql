-- job_id was a NOT NULL text column with no default — a legacy n8n execution ID.
-- The enrich route never supplies it, causing every job insert to fail.
-- Give it a default so new rows don't need to provide a value.
ALTER TABLE jobs ALTER COLUMN job_id SET DEFAULT gen_random_uuid()::text;
