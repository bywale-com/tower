-- recompute-scores queries surfaces WHERE topic_id = topicId
-- classify-and-create-surfaces needs somewhere to write the topic FK
ALTER TABLE surfaces ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS surfaces_topic_id_idx ON surfaces(topic_id) WHERE topic_id IS NOT NULL;
