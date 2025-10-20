-- Migration: Fix Orphaned Email Jobs
-- Issue: Gmail sync bug left email_jobs.job_id as NULL for duplicate jobs
-- This script links orphaned emails to their corresponding jobs

-- Start transaction
BEGIN;

-- Create a temporary table to track updates
CREATE TEMP TABLE orphaned_email_matches AS
SELECT
    ej.email_job_id,
    ej.sender_email,
    ej.subject,
    ej.received_date,
    ej.extracted_data->>'title' as extracted_title,
    ej.extracted_data->>'company' as extracted_company,
    j.job_id,
    j.title as job_title,
    j.company as job_company,
    j.date_email_sent,
    ABS(EXTRACT(EPOCH FROM (ej.received_date - j.date_email_sent))) as time_diff_seconds
FROM email_jobs ej
CROSS JOIN jobs j
WHERE
    -- Find orphaned emails (processed but not linked)
    ej.job_id IS NULL
    AND ej.processed = true
    -- Match by company and title
    AND LOWER(ej.extracted_data->>'company') = LOWER(j.company)
    AND LOWER(ej.extracted_data->>'title') = LOWER(j.title)
    -- Match by source
    AND j.source = 'gmail'
    -- Must be within reasonable time window (7 days)
    AND ABS(EXTRACT(EPOCH FROM (ej.received_date - j.date_email_sent))) < 604800
ORDER BY ej.email_job_id, time_diff_seconds ASC;

-- Show preview of what will be updated
SELECT
    'Preview: Will link ' || COUNT(DISTINCT oem.email_job_id) || ' orphaned emails to jobs' as status
FROM orphaned_email_matches oem;

SELECT
    oem.email_job_id,
    oem.sender_email,
    oem.subject,
    oem.extracted_company,
    oem.extracted_title,
    oem.job_id,
    oem.job_company,
    oem.job_title,
    ROUND(oem.time_diff_seconds / 3600.0, 2) as hours_diff
FROM orphaned_email_matches oem
WHERE oem.email_job_id IN (
    -- For each orphaned email, get the best matching job (closest timestamp)
    SELECT DISTINCT ON (email_job_id) email_job_id
    FROM orphaned_email_matches
    ORDER BY email_job_id, time_diff_seconds ASC
)
ORDER BY oem.email_job_id;

-- Update email_jobs to link them to the matched jobs
UPDATE email_jobs ej
SET job_id = matched.job_id
FROM (
    -- For each orphaned email, select the best matching job (closest timestamp)
    SELECT DISTINCT ON (email_job_id)
        email_job_id,
        job_id
    FROM orphaned_email_matches
    ORDER BY email_job_id, time_diff_seconds ASC
) as matched
WHERE ej.email_job_id = matched.email_job_id;

-- Show results
SELECT
    'Updated ' || COUNT(*) || ' email_jobs records' as result
FROM email_jobs
WHERE job_id IS NOT NULL
AND email_job_id IN (SELECT email_job_id FROM orphaned_email_matches);

-- Commit transaction
COMMIT;

-- Verification query - show remaining orphaned emails (if any)
SELECT
    COUNT(*) as remaining_orphaned_emails,
    'Run this to see details: SELECT * FROM email_jobs WHERE job_id IS NULL AND processed = true;' as next_step
FROM email_jobs
WHERE job_id IS NULL AND processed = true;
