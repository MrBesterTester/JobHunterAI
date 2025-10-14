-- Migration: Rename date_collected to date_email_sent
-- This better reflects that we store the email's sent date, not when we processed it

-- Rename the column
ALTER TABLE jobs RENAME COLUMN date_collected TO date_email_sent;

-- Drop old index
DROP INDEX IF EXISTS idx_jobs_date_collected;

-- Create new index
CREATE INDEX idx_jobs_date_email_sent ON jobs(date_email_sent DESC);

-- Recreate the view with the new column name
DROP VIEW IF EXISTS jobs_with_applications;
CREATE VIEW jobs_with_applications AS
SELECT
    j.*,
    a.application_id,
    a.application_status,
    a.date_applied,
    a.follow_up_date
FROM jobs j
LEFT JOIN applications a ON j.job_id = a.job_id
ORDER BY j.date_email_sent DESC;
