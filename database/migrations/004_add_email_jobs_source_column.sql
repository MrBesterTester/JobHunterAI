-- Migration: Add source column to email_jobs table
-- Date: 2025-11-03
-- Description: Adds a source column to distinguish between Gmail and Microsoft email sources

-- Add source column to email_jobs table
ALTER TABLE email_jobs
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'gmail';

-- Update existing records to have 'gmail' as source
UPDATE email_jobs
SET source = 'gmail'
WHERE source IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN email_jobs.source IS 'Email source: gmail, microsoft_email, etc.';
