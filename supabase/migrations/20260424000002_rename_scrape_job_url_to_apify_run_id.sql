-- surfaces: rename scrape_job_url → apify_run_id (was misused to store Apify run IDs)
ALTER TABLE surfaces RENAME COLUMN scrape_job_url TO apify_run_id;

-- posts: same column exists there too
ALTER TABLE posts RENAME COLUMN scrape_job_url TO apify_run_id;
