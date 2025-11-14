-- Migration: Add condensed_description column to jobs table
-- Purpose: Cache LLM-generated condensed descriptions to improve performance
-- Date: 2025-11-14
-- Related: TESTING_STATUS.md Phase 1 - Option 1 (Database caching)

-- Add the condensed_description column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS condensed_description TEXT;

-- Add comment to document the purpose
COMMENT ON COLUMN jobs.condensed_description IS 'Cached LLM-generated condensed description (eliminates repeated API calls)';
