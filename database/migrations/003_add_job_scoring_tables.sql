-- Migration: Add Multi-Criteria Job Scoring System (ISSUE-004 Phase 1)
-- Creates tables for weighted scoring criteria and per-job calculated scores
-- Supports configurable weights and future manual override capabilities

-- ============================================================================
-- Table: scoring_criteria
-- ============================================================================
-- Stores configurable weights for each scoring criterion
-- Weights must sum to 1.0 (enforced at application level)

CREATE TABLE scoring_criteria (
    criteria_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    criterion_name VARCHAR(50) NOT NULL UNIQUE,
    weight DOUBLE PRECISION NOT NULL CHECK (weight >= 0 AND weight <= 1),
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE scoring_criteria IS 'Configurable weights for multi-criteria job scoring (ISSUE-004)';
COMMENT ON COLUMN scoring_criteria.weight IS 'Weight factor 0.0-1.0 (all weights must sum to 1.0)';
COMMENT ON COLUMN scoring_criteria.enabled IS 'Allow disabling criteria without deletion';

-- Seed default weights (sum = 1.0)
INSERT INTO scoring_criteria (criterion_name, weight, description) VALUES
    ('compensation', 0.30, 'Equivalent annual value adjusted for tax structure'),
    ('employment_relationship', 0.20, 'Direct hire vs staffing/contract agency'),
    ('remote_work', 0.20, 'Remote policy and onsite days per week'),
    ('domain_fit', 0.15, 'Match with testing/QA/automation focus'),
    ('flexibility_perks', 0.10, 'Retainers, shuttles, schedule flexibility'),
    ('benefits', 0.03, 'Insurance quality and benefits package'),
    ('company_industry', 0.02, 'Industry sector preference');

-- ============================================================================
-- Table: job_scores
-- ============================================================================
-- Stores calculated scores for each job (0-100 scale per criterion)
-- total_score = sum of (criterion_score * weight) for all enabled criteria

CREATE TABLE job_scores (
    job_id UUID PRIMARY KEY REFERENCES jobs(job_id) ON DELETE CASCADE,

    -- Individual criterion scores (0-100 scale)
    compensation_score DOUBLE PRECISION CHECK (compensation_score BETWEEN 0 AND 100),
    relationship_score DOUBLE PRECISION CHECK (relationship_score BETWEEN 0 AND 100),
    remote_work_score DOUBLE PRECISION CHECK (remote_work_score BETWEEN 0 AND 100),
    domain_fit_score DOUBLE PRECISION CHECK (domain_fit_score BETWEEN 0 AND 100),
    flexibility_score DOUBLE PRECISION CHECK (flexibility_score BETWEEN 0 AND 100),
    benefits_score DOUBLE PRECISION CHECK (benefits_score BETWEEN 0 AND 100),
    industry_score DOUBLE PRECISION CHECK (industry_score BETWEEN 0 AND 100),

    -- Aggregate scores
    total_score DOUBLE PRECISION CHECK (total_score BETWEEN 0 AND 100),
    rank INTEGER, -- Ordinal ranking among all scored jobs
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Future: Option C (Manual Override) fields
    manual_override_enabled BOOLEAN DEFAULT false,
    manual_adjustment_points DOUBLE PRECISION DEFAULT 0,
    override_reason TEXT,
    overridden_by VARCHAR(100),
    overridden_at TIMESTAMPTZ
);

-- Add comments
COMMENT ON TABLE job_scores IS 'Multi-criteria weighted scores for job ranking (ISSUE-004)';
COMMENT ON COLUMN job_scores.total_score IS 'Weighted sum of all criterion scores (0-100)';
COMMENT ON COLUMN job_scores.rank IS 'Ordinal ranking: 1 = highest total_score';
COMMENT ON COLUMN job_scores.manual_override_enabled IS 'Future: Allow manual score adjustments';

-- Create indexes for efficient sorting and ranking queries
CREATE INDEX idx_job_scores_total ON job_scores(total_score DESC);
CREATE INDEX idx_job_scores_rank ON job_scores(rank ASC);
CREATE INDEX idx_job_scores_calculated_at ON job_scores(calculated_at DESC);

-- Create index for filtering by score range
CREATE INDEX idx_job_scores_total_range ON job_scores(total_score DESC) WHERE total_score >= 70;
