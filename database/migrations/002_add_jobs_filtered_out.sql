-- Migration: Add jobs_filtered_out column for Phase 5.3.3
-- This column tracks emails that were classified as non-job opportunities (confidence < 0.3)
-- These emails are left unread in Gmail for manual review

-- Add the new column
ALTER TABLE job_intake_logs
  ADD COLUMN jobs_filtered_out INTEGER DEFAULT 0;

-- Add comment to explain the field
COMMENT ON COLUMN job_intake_logs.jobs_filtered_out IS 'Emails with confidence < 0.3 (not real job opportunities) - left unread in Gmail';

-- Update existing records to set filtered_out to 0 (they don't have this data)
UPDATE job_intake_logs
SET jobs_filtered_out = 0
WHERE jobs_filtered_out IS NULL;
