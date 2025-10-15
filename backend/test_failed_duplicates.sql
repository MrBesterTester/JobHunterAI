-- Test Data for Failed and Duplicates Email Tabs
-- This script creates test data to verify the endpoints return correct results

-- First, ensure we have a job_source
INSERT INTO job_sources (source_id, source_name, source_type)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Test Gmail', 'gmail')
ON CONFLICT DO NOTHING;

-- Create test emails:
-- 1. Failed email (processing_errors set)
INSERT INTO email_jobs (email_job_id, message_id, subject, sender_email, received_date, processed, processing_errors)
VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'msg-failed-1', 'Failed Job 1', 'recruiter1@example.com', NOW() - INTERVAL '1 day', false, '{"error": "Failed to create job"}'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'msg-failed-2', 'Failed Job 2', 'recruiter2@example.com', NOW() - INTERVAL '2 days', false, '{"error": "Database error"}');

-- 2. Failed email (extraction failed - processed=false, extraction_confidence=NULL)
INSERT INTO email_jobs (email_job_id, message_id, subject, sender_email, received_date, processed, extraction_confidence)
VALUES
  ('10000000-0000-0000-0000-000000000003'::uuid, 'msg-failed-3', 'Failed Job 3', 'recruiter3@example.com', NOW() - INTERVAL '3 days', false, NULL),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'msg-failed-4', 'Failed Job 4', 'recruiter4@example.com', NOW() - INTERVAL '4 days', false, NULL),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'msg-failed-5', 'Failed Job 5', 'recruiter5@example.com', NOW() - INTERVAL '5 days', false, NULL),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'msg-failed-6', 'Failed Job 6', 'recruiter6@example.com', NOW() - INTERVAL '6 days', false, NULL);

-- 3. Duplicate email (processed=true, job_id=NULL, extraction_confidence >= 0.3, no errors)
INSERT INTO email_jobs (email_job_id, message_id, subject, sender_email, received_date, processed, job_id, extraction_confidence, processing_errors)
VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, 'msg-dup-1', 'Duplicate Job 1', 'recruiter7@example.com', NOW() - INTERVAL '7 days', true, NULL, 0.95, NULL);

-- 4. Filtered emails (processed=true, job_id=NULL, extraction_confidence < 0.3) - should NOT appear in duplicates
INSERT INTO email_jobs (email_job_id, message_id, subject, sender_email, received_date, processed, job_id, extraction_confidence, processing_errors)
VALUES
  ('30000000-0000-0000-0000-000000000001'::uuid, 'msg-filtered-1', 'Not a Job 1', 'spam@example.com', NOW() - INTERVAL '8 days', true, NULL, 0.15, NULL),
  ('30000000-0000-0000-0000-000000000002'::uuid, 'msg-filtered-2', 'Not a Job 2', 'spam2@example.com', NOW() - INTERVAL '9 days', true, NULL, 0.20, NULL);

-- 5. Successfully processed email (processed=true, job_id set) - should NOT appear in either tab
INSERT INTO jobs (job_id, title, company, source)
VALUES ('40000000-0000-0000-0000-000000000001'::uuid, 'Software Engineer', 'Google', 'gmail');

INSERT INTO email_jobs (email_job_id, message_id, subject, sender_email, received_date, processed, job_id, extraction_confidence, processing_errors)
VALUES
  ('40000000-0000-0000-0000-000000000001'::uuid, 'msg-success-1', 'Software Engineer at Google', 'recruiter8@example.com', NOW() - INTERVAL '10 days', true, '40000000-0000-0000-0000-000000000001'::uuid, 0.98, NULL);

-- Update intake logs to reflect these counts
INSERT INTO job_intake_logs (log_id, source_id, sync_started_at, sync_completed_at, jobs_discovered, jobs_failed_processing, jobs_filtered_out, jobs_duplicated, jobs_created, sync_status)
VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000001'::uuid,
   NOW() - INTERVAL '1 hour',
   NOW() - INTERVAL '59 minutes',
   50,  -- discovered (for dashboard)
   6,   -- failed
   15,  -- filtered_out (not job emails)
   1,   -- duplicated
   28,  -- created (successful)
   'completed');

-- Verify test data
SELECT 'Test Data Summary:' as info;
SELECT COUNT(*) as failed_emails FROM email_jobs WHERE processing_errors IS NOT NULL OR (processed = false AND extraction_confidence IS NULL);
SELECT COUNT(*) as duplicate_emails FROM email_jobs WHERE processed = true AND job_id IS NULL AND processing_errors IS NULL AND extraction_confidence >= 0.3;
SELECT COUNT(*) as filtered_emails FROM email_jobs WHERE processed = true AND job_id IS NULL AND processing_errors IS NULL AND extraction_confidence < 0.3;
SELECT COUNT(*) as success_emails FROM email_jobs WHERE processed = true AND job_id IS NOT NULL;
