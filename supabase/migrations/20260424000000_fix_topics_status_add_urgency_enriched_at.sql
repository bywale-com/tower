-- Fix status check to include 'pending' (enrich route inserts pending topics)
ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_status_check;
ALTER TABLE topics ADD CONSTRAINT topics_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'pending'::text, 'paused'::text, 'archived'::text]));

-- Add urgency_score (recompute-scores task writes this)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS urgency_score numeric DEFAULT 0;

-- Add enriched_at (set when pipeline completes)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
