-- Migration: Add improved tracking fields to job_intake_logs
-- Date: 2025-10-13
-- Description: Adds mutually exclusive and collectively exhaustive tracking fields

-- Add new tracking fields
ALTER TABLE job_intake_logs
ADD COLUMN IF NOT EXISTS jobs_failed_processing INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jobs_duplicated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS jobs_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_error TEXT;

-- Add comments to clarify field usage
COMMENT ON COLUMN job_intake_logs.jobs_discovered IS 'Total emails/items discovered in sync';
COMMENT ON COLUMN job_intake_logs.jobs_failed_processing IS 'Failed extraction or below confidence threshold';
COMMENT ON COLUMN job_intake_logs.jobs_duplicated IS 'Processed but matched existing jobs (deduped)';
COMMENT ON COLUMN job_intake_logs.jobs_created IS 'New unique jobs actually created';
COMMENT ON COLUMN job_intake_logs.validation_error IS 'Error message if counters do not sum correctly';

-- Migrate existing data: jobs_approved becomes jobs_created for completed syncs
UPDATE job_intake_logs
SET jobs_created = jobs_approved
WHERE sync_status = 'completed' AND jobs_created = 0;

COMMENT ON TABLE job_intake_logs IS 'Invariant: jobs_discovered = jobs_failed_processing + jobs_duplicated + jobs_created';
