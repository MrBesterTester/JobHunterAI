-- Migration 007: Add last_page_fetched column for automatic pagination
-- Phase 4.2: Automatic Pagination for RapidAPI JSearch
-- Created: 2025-11-03
--
-- Purpose: Track which page was last fetched for pagination,
--          enabling automatic page increment after each sync.

-- Add last_page_fetched column to job_sources table
ALTER TABLE job_sources
ADD COLUMN last_page_fetched INTEGER DEFAULT 1;

-- Add comment
COMMENT ON COLUMN job_sources.last_page_fetched IS
  'Tracks the last page fetched for pagination (RapidAPI JSearch). Automatically increments after each sync. Defaults to 1 (first page).';

-- Initialize existing RapidAPI source (if it exists)
UPDATE job_sources
SET last_page_fetched = 1
WHERE source_name = 'rapidapi';

-- Optional: Create index for queries (recommended for performance)
CREATE INDEX idx_job_sources_last_page ON job_sources(last_page_fetched);

-- Verify migration
SELECT source_name, source_type, last_page_fetched
FROM job_sources
WHERE source_name = 'rapidapi';
