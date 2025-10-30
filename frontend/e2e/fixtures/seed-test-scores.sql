-- =============================================================================
-- E2E Test Score Seeding Script
-- =============================================================================
-- Pre-calculates and inserts job scores for test jobs to prevent 404 errors
-- during E2E tests. Scores are based on test job attributes and default weights.
--
-- Default Weights (from scoring_criteria):
--   compensation: 0.30
--   employment_relationship: 0.20
--   remote_work: 0.20
--   domain_fit: 0.15
--   flexibility_perks: 0.10
--   benefits: 0.03
--   company_industry: 0.02
--
-- Score Calculation Notes:
--   - Individual criterion scores: 0-100 scale
--   - Total score: weighted sum of individual scores
--   - Ranks assigned based on total_score (1 = highest)
--
-- Flexible Testing:
--   Tests should use score RANGES (±5 points) rather than exact values
--   to accommodate minor calculation variations
-- =============================================================================

-- Clean up existing test scores
DELETE FROM job_scores WHERE job_id IN (
    'test-job-1', 'test-job-2', 'test-job-3', 'test-job-4', 'test-job-5',
    'test-job-6', 'test-job-7', 'test-job-8', 'test-job-9', 'test-job-10'
);

-- Insert pre-calculated scores for test jobs
-- Format: (job_id, comp_score, relationship_score, remote_score, domain_score, flex_score, benefits_score, industry_score, total_score)

-- test-job-1: highSalaryRemoteJob
-- Senior AI Test Engineer, $155k, Remote, AI+Testing domain
-- High scores across the board: good salary, remote, perfect domain fit
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-1',
    75.0,  -- $155k is good but not exceptional
    85.0,  -- Direct hire (assuming)
    100.0, -- Fully remote
    95.0,  -- Perfect AI+Testing domain fit
    70.0,  -- Average flexibility/perks
    70.0,  -- Average benefits
    80.0,  -- Tech industry
    -- Total: (75*0.30) + (85*0.20) + (100*0.20) + (95*0.15) + (70*0.10) + (70*0.03) + (80*0.02) = 83.95
    83.95,
    2,     -- Rank 2
    NOW()
);

-- test-job-2: lowSalaryJob (FILTERED)
-- Junior QA, $80k, Remote
-- Low score due to salary below minimum
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-2',
    20.0,  -- $80k is well below minimum
    70.0,  -- Direct hire
    100.0, -- Remote
    60.0,  -- QA is in domain
    50.0,  -- No info on flexibility
    50.0,  -- No info on benefits
    60.0,  -- Startup industry
    -- Total: (20*0.30) + (70*0.20) + (100*0.20) + (60*0.15) + (50*0.10) + (50*0.03) + (60*0.02) = 48.70
    48.70,
    10,    -- Rank 10 (lowest)
    NOW()
);

-- test-job-3: testingJob
-- Test Automation Engineer, $145k, SF
-- Good scores, slight reduction for location (SF = commute possible)
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-3',
    68.0,  -- $145k is decent
    85.0,  -- Direct hire
    75.0,  -- SF location (not remote, but close)
    100.0, -- Perfect test automation fit
    70.0,  -- Average flexibility
    70.0,  -- Average benefits
    85.0,  -- Tech industry
    -- Total: (68*0.30) + (85*0.20) + (75*0.20) + (100*0.15) + (70*0.10) + (70*0.03) + (85*0.02) = 74.80
    74.80,
    5,     -- Rank 5
    NOW()
);

-- test-job-4: firmwareJob
-- Firmware Validation Engineer, $160k, Fremont
-- High scores, excellent salary and location
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-4',
    80.0,  -- $160k is excellent
    85.0,  -- Direct hire
    90.0,  -- Fremont is ideal (very close)
    95.0,  -- Firmware testing is in domain
    75.0,  -- Hardware companies often have good perks
    75.0,  -- Good benefits
    90.0,  -- Hardware/tech industry
    -- Total: (80*0.30) + (85*0.20) + (90*0.20) + (95*0.15) + (75*0.10) + (75*0.03) + (90*0.02) = 83.50
    83.50,
    3,     -- Rank 3
    NOW()
);

-- test-job-5: approvedJob
-- Lead Testing Engineer, $170k, Remote
-- Very high scores across the board
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-5',
    85.0,  -- $170k is very good
    90.0,  -- Direct hire, enterprise
    100.0, -- Fully remote
    100.0, -- Perfect testing leadership fit
    80.0,  -- Enterprise perks
    80.0,  -- Enterprise benefits
    85.0,  -- Enterprise tech
    -- Total: (85*0.30) + (90*0.20) + (100*0.20) + (100*0.15) + (80*0.10) + (80*0.03) + (85*0.02) = 88.60
    88.60,
    1,     -- Rank 1 (highest)
    NOW()
);

-- test-job-6: appliedJob
-- Senior QA Automation Architect, $185k, Remote
-- Highest salary, excellent fit
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-6',
    95.0,  -- $185k is exceptional
    90.0,  -- Direct hire
    100.0, -- Remote
    100.0, -- Perfect QA automation architect fit
    85.0,  -- Global company perks
    85.0,  -- Global company benefits
    90.0,  -- Global tech
    -- Total: (95*0.30) + (90*0.20) + (100*0.20) + (100*0.15) + (85*0.10) + (85*0.03) + (90*0.02) = 92.05
    92.05,
    NULL,  -- Rank NULL (already applied, not in ranking)
    NOW()
);

-- test-job-7: longCommuteJob (FILTERED)
-- Test Engineer, $140k, Sacramento (>45 min commute)
-- Moderate score, filtered due to commute
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-7',
    65.0,  -- $140k is okay
    80.0,  -- Direct hire
    30.0,  -- Sacramento is too far (65 min commute)
    80.0,  -- Testing domain fit
    60.0,  -- Average flexibility
    60.0,  -- Average benefits
    70.0,  -- Average industry
    -- Total: (65*0.30) + (80*0.20) + (30*0.20) + (80*0.15) + (60*0.10) + (60*0.03) + (70*0.02) = 59.70
    59.70,
    8,     -- Rank 8
    NOW()
);

-- test-job-8: nonMatchingDomainJob (FILTERED)
-- Marketing Manager, $150k, Remote
-- Low domain fit score, filtered
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-8',
    72.0,  -- $150k is good
    85.0,  -- Direct hire
    100.0, -- Remote
    10.0,  -- Marketing is not in preferred domains
    70.0,  -- Average flexibility
    70.0,  -- Average benefits
    60.0,  -- AdTech industry
    -- Total: (72*0.30) + (85*0.20) + (100*0.20) + (10*0.15) + (70*0.10) + (70*0.03) + (60*0.02) = 57.80
    57.80,
    9,     -- Rank 9
    NOW()
);

-- test-job-9: multipleFilterReasonsJob (FILTERED)
-- Sales Engineer, $95k, LA
-- Very low scores across multiple criteria
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-9',
    35.0,  -- $95k is below minimum
    70.0,  -- Direct hire
    25.0,  -- LA is very far (120 min commute)
    15.0,  -- Sales is not in preferred domains
    50.0,  -- No info on flexibility
    50.0,  -- No info on benefits
    50.0,  -- Corporate industry
    -- Total: (35*0.30) + (70*0.20) + (25*0.20) + (15*0.15) + (50*0.10) + (50*0.03) + (50*0.02) = 36.75
    36.75,
    11,    -- Rank 11 (would be lowest if not filtered)
    NOW()
);

-- test-job-10: aiJob
-- Generative AI Quality Engineer, $180k, Remote
-- Highest combined score: excellent salary, remote, perfect AI+QA fit
INSERT INTO job_scores (
    job_id, compensation_score, relationship_score, remote_work_score,
    domain_fit_score, flexibility_score, benefits_score, industry_score,
    total_score, rank, calculated_at
) VALUES (
    'test-job-10',
    92.0,  -- $180k is excellent
    90.0,  -- Direct hire
    100.0, -- Remote
    100.0, -- Perfect generative AI + QA fit
    85.0,  -- AI companies often have great perks
    85.0,  -- AI companies have good benefits
    95.0,  -- AI industry is hot
    -- Total: (92*0.30) + (90*0.20) + (100*0.20) + (100*0.15) + (85*0.10) + (85*0.03) + (95*0.02) = 90.00
    90.00,
    NULL,  -- Rank NULL (status='new', would be rank 1 if approved)
    NOW()
);

-- =============================================================================
-- Expected Score Ranges for Testing (±5 points tolerance)
-- =============================================================================
-- Use these ranges in test assertions to allow for calculation variations:
--
-- test-job-1:  78.95 -  88.95  (actual: 83.95)
-- test-job-2:  43.70 -  53.70  (actual: 48.70)
-- test-job-3:  69.80 -  79.80  (actual: 74.80)
-- test-job-4:  78.50 -  88.50  (actual: 83.50)
-- test-job-5:  83.60 -  93.60  (actual: 88.60)
-- test-job-6:  87.05 -  97.05  (actual: 92.05)
-- test-job-7:  54.70 -  64.70  (actual: 59.70)
-- test-job-8:  52.80 -  62.80  (actual: 57.80)
-- test-job-9:  31.75 -  41.75  (actual: 36.75)
-- test-job-10: 85.00 -  95.00  (actual: 90.00)
-- =============================================================================
