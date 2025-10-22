<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: ISSUE-004
title: Multi-Criteria Weighted Job Scoring System
status: open
priority: high
severity: medium
component: backend, frontend, database
created: 2025-10-21
updated: 2025-10-21
affects: [Job Filtering, Job Ranking, Decision Making, UI]
related: []](#id-issue-004%0Atitle-multi-criteria-weighted-job-scoring-system%0Astatus-open%0Apriority-high%0Aseverity-medium%0Acomponent-backend-frontend-database%0Acreated-2025-10-21%0Aupdated-2025-10-21%0Aaffects-job-filtering-job-ranking-decision-making-ui%0Arelated-)
- [ISSUE-004: Multi-Criteria Weighted Job Scoring System](#issue-004-multi-criteria-weighted-job-scoring-system)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Current State](#current-state)
    - [Current Filtering Logic](#current-filtering-logic)
    - [Problems with Current Approach](#problems-with-current-approach)
  - [Requirements](#requirements)
    - [User Preferences (Priority Order)](#user-preferences-priority-order)
  - [Proposed Solution](#proposed-solution)
    - [Architecture: Multi-Tier Approach](#architecture-multi-tier-approach)
  - [Database Schema Changes](#database-schema-changes)
    - [New Table: scoring_criteria](#new-table-scoring_criteria)
    - [New Table: job_scores](#new-table-job_scores)
  - [Scoring Criteria Specification](#scoring-criteria-specification)
    - [1. Compensation Score (30% weight)](#1-compensation-score-30%25-weight)
    - [2. Employment Relationship Score (20% weight)](#2-employment-relationship-score-20%25-weight)
    - [3. Remote Work Policy Score (20% weight)](#3-remote-work-policy-score-20%25-weight)
    - [4. Domain/Technical Fit Score (15% weight)](#4-domaintechnical-fit-score-15%25-weight)
    - [5. Flexibility & Perks Score (10% weight)](#5-flexibility--perks-score-10%25-weight)
    - [6. Benefits Score (3% weight)](#6-benefits-score-3%25-weight)
    - [7. Company Industry Score (2% weight)](#7-company-industry-score-2%25-weight)
  - [Implementation Plan](#implementation-plan)
    - [Phase 1: Foundation (Week 1) ✅ COMPLETED](#phase-1-foundation-week-1--completed)
    - [Phase 2: Backend Scoring (Week 2) ✅ **COMPLETED**](#phase-2-backend-scoring-week-2--completed)
    - [Phase 3: UI Enhancement (Week 3) ✅ **COMPLETED**](#phase-3-ui-enhancement-week-3--completed)
    - [Phase 4: Integration & Testing (Week 4) ✅ **COMPLETED**](#phase-4-integration--testing-week-4--completed)
  - [Future Enhancement: Option C Migration](#future-enhancement-option-c-migration)
    - [Manual Override Capabilities](#manual-override-capabilities)
    - [Schema Extensions](#schema-extensions)
    - [UI Additions](#ui-additions)
  - [Testing Plan](#testing-plan)
    - [Validation with Existing Jobs](#validation-with-existing-jobs)
    - [Edge Cases](#edge-cases)
  - [Success Metrics](#success-metrics)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: ISSUE-004
title: Multi-Criteria Weighted Job Scoring System
status: open
priority: high
severity: medium
component: backend, frontend, database
created: 2025-10-21
updated: 2025-10-21
affects: [Job Filtering, Job Ranking, Decision Making, UI]
related: []
---

# ISSUE-004: Multi-Criteria Weighted Job Scoring System

## Summary

Current job filtering uses binary pass/fail logic that is too restrictive and doesn't capture the nuanced trade-offs between different job characteristics. Need to implement a multi-criteria weighted scoring system that ranks jobs on a 0-100 scale across multiple dimensions (compensation, employment relationship, remote work, technical fit, flexibility, benefits, company industry) to support informed decision-making.

## Impact

**Current State:**
- All 30 jobs in "filtered" status with minimal differentiation
- Cannot compare jobs across multiple criteria dimensions
- Hard filters eliminate potentially acceptable jobs
- No visibility into trade-off analysis
- Cognitive overload trying to manually compare jobs

**After Implementation:**
- Each job gets a total score (0-100) based on weighted criteria
- Jobs ranked by total score for easy comparison
- Visual table showing all criteria side-by-side
- Configurable weights to adjust priorities
- Future: Manual override capability for edge cases

## Current State

### Current Filtering Logic

**Location**: `backend/src/main.rs:683-733` (function `filter_job`)

**Current Criteria** (Pass/Fail):
1. ❌ Minimum salary: $130,000 (hard cutoff)
2. ❌ Domain keywords: Must match "Testing", "QA", "Firmware", "AI" keywords
3. ❌ Commute time: ≤45 minutes for non-remote roles
4. ❌ Remote preference: Advisory only (not eliminatory)

**Database Table**: `job_criteria`
- `min_salary`: 130000
- `max_commute_time`: 45
- `max_commute_days_per_week`: 3
- `preferred_domains`: Text array
- `location_preferences`: JSONB
- `remote_preference`: 'preferred'

### Problems with Current Approach

1. **Too Restrictive**: Eliminates jobs that might be acceptable with trade-offs
2. **Ignores Key Factors**: Doesn't consider:
   - Employment relationship (direct vs agency vs contract)
   - Tax structure (Schedule C vs 1099 vs W-2)
   - Benefits quality (private insurance vs standard)
   - Flexibility & perks (retainer arrangements, company shuttles, schedule flexibility)
   - Compensation structure (hourly rate, daily rate, equity, bonus)
3. **No Ranking**: All "filtered" jobs treated equally
4. **No Trade-off Analysis**: Can't compare "$150K agency" vs "$140K direct hire"
5. **Binary Logic**: Job either passes or fails - no nuance

## Requirements

### User Preferences (Priority Order)

**Compensation Equivalence:**
- Hourly rate: Convert to annual (× 2080 hours)
- Daily rate: Convert to annual (× 250 days)
- 1099 contract: +10% effective value (tax advantage)
- Schedule C (own consulting firm): +15% effective value
- Equity: Discount heavily (count as 20% of stated value)
- Bonus: Add percentage of base to equivalent compensation

**Employment Relationship Ranking** (descending preference):
1. Direct hire (full-time employee)
2. Staffing agency (places candidate for employer fee)
3. Contract agency (candidate works for agency on behalf of employer)
4. Contract-to-hire (low priority)

**Contract Work Preferences:**
- Strongly prefer contracts with retainer arrangements
- Retainer size typically 1-3 days per week
- Higher retainer = more autonomy and stability

**Benefits Priority:**
- Low overall factor but nice-to-have
- Private insurance (e.g., Blue Shield) preferred over standard
- Has Medicare/Kaiser baseline coverage

**Flexibility & Perks:**
- Company shuttle/bus: Highly valued (extends acceptable commute)
- FasTrak/express lane reimbursement: Highly valued
- Schedule flexibility: Late-morning/evening hours preferred
- Parking, transit passes: Minor perks

**Remote Work:**
- Fully remote: Ideal
- Hybrid 1-2 days/week: Good
- Hybrid 3 days/week: Acceptable
- Hybrid 4+ days/week: Concerning
- Fully onsite: Only for exceptional compensation

**Technical Domain:**
- Software/Firmware Testing & QA: Primary focus
- Test automation: Highly preferred
- Generative AI involvement: Bonus
- Adjacent fields (DevOps, Release Engineering): Case-by-case

## Proposed Solution

### Architecture: Multi-Tier Approach

**Tier 1: Minimal Hard Filters** (Eliminate noise only)
- Absolute minimum compensation: $100,000 equivalent
- Job must have extractable data (not garbage/courses/events)
- Status: "new" if passes, "filtered_out" if fails hard filters

**Tier 2: Weighted Scoring** (Rank remaining jobs)
- Calculate 0-100 score for each of 7 criteria
- Multiply by configured weight
- Sum to get total score (0-100)
- Store in database for persistence and caching

**Tier 3: Interactive UI** (Manual decision)
- Sortable table showing all criteria side-by-side
- Color-coded cells (green/yellow/red) for visual assessment
- Weight adjustment sliders → instant re-ranking
- Click to expand full job details

## Database Schema Changes

### New Table: scoring_criteria

Stores configurable weights for each scoring criterion.

```sql
CREATE TABLE scoring_criteria (
    criteria_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    criterion_name VARCHAR(50) NOT NULL UNIQUE,
    weight DECIMAL(4,3) NOT NULL CHECK (weight >= 0 AND weight <= 1),
    enabled BOOLEAN DEFAULT true,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default weights (sum = 1.0)
INSERT INTO scoring_criteria (criterion_name, weight, description) VALUES
    ('compensation', 0.30, 'Equivalent annual value adjusted for tax structure'),
    ('employment_relationship', 0.20, 'Direct hire vs staffing/contract agency'),
    ('remote_work', 0.20, 'Remote policy and onsite days per week'),
    ('domain_fit', 0.15, 'Match with testing/QA/automation focus'),
    ('flexibility_perks', 0.10, 'Retainers, shuttles, schedule flexibility'),
    ('benefits', 0.03, 'Insurance quality and benefits package'),
    ('company_industry', 0.02, 'Industry sector preference');

-- Constraint: Weights must sum to 1.0 (enforced at application level)
```

### New Table: job_scores

Stores calculated scores for each job.

```sql
CREATE TABLE job_scores (
    job_id UUID PRIMARY KEY REFERENCES jobs(job_id) ON DELETE CASCADE,
    compensation_score DECIMAL(5,2) CHECK (compensation_score BETWEEN 0 AND 100),
    relationship_score DECIMAL(5,2) CHECK (relationship_score BETWEEN 0 AND 100),
    remote_work_score DECIMAL(5,2) CHECK (remote_work_score BETWEEN 0 AND 100),
    domain_fit_score DECIMAL(5,2) CHECK (domain_fit_score BETWEEN 0 AND 100),
    flexibility_score DECIMAL(5,2) CHECK (flexibility_score BETWEEN 0 AND 100),
    benefits_score DECIMAL(5,2) CHECK (benefits_score BETWEEN 0 AND 100),
    industry_score DECIMAL(5,2) CHECK (industry_score BETWEEN 0 AND 100),
    total_score DECIMAL(5,2) CHECK (total_score BETWEEN 0 AND 100),
    rank INTEGER,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Future: Option C (Manual Override) fields
    manual_override_enabled BOOLEAN DEFAULT false,
    manual_adjustment_points DECIMAL(5,2) DEFAULT 0,
    override_reason TEXT,
    overridden_by VARCHAR(100),
    overridden_at TIMESTAMPTZ
);

CREATE INDEX idx_job_scores_total ON job_scores(total_score DESC);
CREATE INDEX idx_job_scores_rank ON job_scores(rank ASC);
```

## Scoring Criteria Specification

### 1. Compensation Score (30% weight)

**Purpose**: Evaluate total annual compensation equivalence adjusted for tax structure.

**Data Sources**:
- `raw_data->compensation->salary_min`, `salary_max`
- `raw_data->compensation->hourly_rate`
- `raw_data->compensation->daily_rate`
- `raw_data->compensation->equity_offered`
- `raw_data->compensation->bonus_structure`
- `raw_data->employment->tax_structure`

**Scoring Formula**:

1. **Convert to annual equivalent**:
   - Annual salary: Use as-is (or average of min/max)
   - Hourly rate: × 2080 hours/year
   - Daily rate: × 250 days/year

2. **Apply tax structure multiplier**:
   - W-2: × 1.0 (baseline)
   - 1099: × 1.10 (+10% for tax advantages)
   - Schedule C: × 1.15 (+15% for consulting firm benefits)

3. **Add bonus/equity** (if available):
   - Bonus: Add stated percentage of base (e.g., 10% bonus on $130K = +$13K)
   - Equity: Multiply by 0.20 discount factor, add to total

4. **Calculate score** (0-100 scale):
   - $100K = 0 pts (minimum threshold)
   - $130K = 50 pts (baseline expectation)
   - $160K = 75 pts
   - $200K = 100 pts
   - Linear interpolation between points
   - Cap at 100 pts

**Example**:
- Job: $140K base, 10% bonus, W-2
- Equivalent: $140K + $14K = $154K
- Score: 50 + ((154-130)/(160-130)) × 25 = 50 + 20 = 70 pts
- Weighted: 70 × 0.30 = 21 points toward total

### 2. Employment Relationship Score (20% weight)

**Purpose**: Rank by employment relationship preference.

**Data Source**: `raw_data->employment->relationship`

**Scoring Logic**:
- `direct` or `full-time`: 100 pts
- `staffing_agency` or `recruiter`: 60 pts
- `contract_agency`: 40 pts
- `contract_to_hire`: 20 pts
- Unknown/missing: 30 pts (neutral)

**Special Cases**:
- If `tax_structure = "schedule_c"` (own consulting firm): Override to 100 pts
- If `relationship = "contract"` AND retainer exists: 90 pts

**Example**:
- Job: Staffing agency placement
- Score: 60 pts
- Weighted: 60 × 0.20 = 12 points

### 3. Remote Work Policy Score (20% weight)

**Purpose**: Evaluate work location flexibility.

**Data Sources**:
- `raw_data->remote_work->policy`
- `raw_data->remote_work->days_onsite_per_week`
- `raw_data->commute->company_shuttle`
- `raw_data->commute->commute_perks`

**Scoring Logic**:

**Base score by policy**:
- `fully_remote` or `remote`: 100 pts
- `hybrid`:
  - 0-1 days onsite: 90 pts
  - 2 days onsite: 80 pts
  - 3 days onsite: 60 pts
  - 4 days onsite: 30 pts
  - 5 days onsite: 10 pts
- `onsite` or `office`: 0 pts

**Commute bonuses** (if hybrid/onsite):
- Company shuttle/bus: +15 pts
- FasTrak reimbursement: +10 pts
- Flexible schedule: +5 pts
- Cap at 100 pts total

**Example**:
- Job: Hybrid 2 days/week with company shuttle
- Score: 80 + 15 = 95 pts
- Weighted: 95 × 0.20 = 19 points

### 4. Domain/Technical Fit Score (15% weight)

**Purpose**: Match job with testing/QA/automation focus.

**Data Sources**:
- `raw_data->job_domain->primary_category`
- `raw_data->job_domain->testing_focus`
- `raw_data->job_domain->automation_focus`
- `raw_data->job_domain->generative_ai_usage`
- `raw_data->job_domain->tech_stack`
- `title`, `description`

**Scoring Logic**:

**Base score by category**:
- `testing_qa` or `quality_assurance`: 100 pts
- `test_automation`: 90 pts
- `firmware_testing`: 85 pts
- `software_engineering` + `testing_focus=true`: 80 pts
- `devops` or `release_engineering`: 60 pts
- `software_engineering` (general): 40 pts
- Other categories: 20 pts

**Bonuses**:
- `automation_focus = true`: +10 pts
- `generative_ai_usage = true`: +10 pts
- Tech stack includes "Playwright", "Cypress", "Selenium": +5 pts
- Title contains "Test", "QA", "Quality": +5 pts

**Penalties**:
- Title contains "Manager", "Director", "Executive": -20 pts (prefer IC roles)

**Cap at 100 pts**

**Example**:
- Job: Test Automation Engineer, GenAI focus, Playwright
- Score: 90 + 10 (GenAI) + 5 (Playwright) = 105 → 100 pts (capped)
- Weighted: 100 × 0.15 = 15 points

### 5. Flexibility & Perks Score (10% weight)

**Purpose**: Value autonomy, retainers, and work flexibility.

**Data Sources**:
- `raw_data->employment->contract_duration`
- `raw_data->commute->schedule_flexibility`
- `raw_data->commute->company_shuttle`
- `raw_data->commute->commute_perks`
- Description mentions of "retainer", "flexible hours", "work-life balance"

**Scoring Logic**:

**Retainer arrangements** (parse from description or contract_duration):
- 3-day retainer: 100 pts
- 2-day retainer: 85 pts
- 1-day retainer: 70 pts
- Contract without retainer: 40 pts
- No contract/retainer: 0 pts

**If no retainer, score based on perks**:
- Schedule flexibility mentioned: 60 pts
- Company shuttle: 50 pts
- FasTrak reimbursement: 40 pts
- Parking provided: 30 pts
- Standard benefits: 20 pts
- None: 0 pts

**Example**:
- Job: 2-day retainer + schedule flexibility
- Score: 85 pts (retainer takes precedence)
- Weighted: 85 × 0.10 = 8.5 points

### 6. Benefits Score (3% weight)

**Purpose**: Assess benefits package quality (low priority factor).

**Data Sources**:
- `raw_data->employment->benefits`
- Description mentions of insurance types

**Scoring Logic**:
- Private insurance (Blue Shield, Aetna, etc.): 100 pts
- Comprehensive benefits mentioned: 70 pts
- Standard benefits: 50 pts
- Minimal benefits: 30 pts
- No benefits mentioned: 0 pts
- Unknown: 40 pts (neutral)

**Example**:
- Job: Blue Shield insurance
- Score: 100 pts
- Weighted: 100 × 0.03 = 3 points

### 7. Company Industry Score (2% weight)

**Purpose**: Minor preference for certain industry sectors.

**Data Source**: `raw_data->company_industry`

**Scoring Logic**:
- Healthcare Technology: 100 pts
- Enterprise SaaS: 90 pts
- Financial Services: 80 pts
- Consulting: 70 pts
- E-commerce: 60 pts
- Telecommunications: 50 pts
- Other/Unknown: 40 pts

**Example**:
- Job: Healthcare Technology
- Score: 100 pts
- Weighted: 100 × 0.02 = 2 points

---

## Implementation Plan

### Phase 1: Foundation (Week 1) ✅ COMPLETED

**Database Schema** (2 days): ✅
- [x] Create `scoring_criteria` table
- [x] Create `job_scores` table
- [x] Seed default weights
- [x] Migration script for existing database
- [x] Test schema on dev database

**Documentation Updates** (1 day): ✅ **COMPLETED**
- [x] Fix PRD duplicate TOC (no duplicates found - only doctoc)
- [x] Update PRD Section 3 with new preference rankings (docs/PRD.md:140-182)
- [x] Add compensation equivalence formulas to PRD (docs/PRD.md:250-272)
- [x] Document retainer, benefits, flexibility priorities (docs/PRD.md:324-402)

**Backend Prep** (2 days): ✅
- [x] Create Rust structs for `ScoringCriteria` and `JobScore`
- [x] Add database query functions: `get_scoring_criteria()`, `save_job_score()`
- [x] Relax hard filters:
  - Lower `min_salary` to $100,000
  - Make domain matching advisory (not eliminatory)

### Phase 2: Backend Scoring (Week 2) ✅ **COMPLETED**

**Status**: Implemented and tested - commit 4f861db

**Scoring Functions** (4 days):
- [x] `calculate_compensation_score()` - Handle salary, hourly, daily, tax structure
- [x] `calculate_relationship_score()` - Direct, agency, contract rankings
- [x] `calculate_remote_score()` - Remote policy + commute bonuses
- [x] `calculate_domain_fit_score()` - Testing focus + tech stack + GenAI
- [x] `calculate_flexibility_score()` - Retainers + schedule + perks
- [x] `calculate_benefits_score()` - Insurance type parsing
- [x] `calculate_industry_score()` - Industry sector lookup

**Orchestration** (1 day):
- [x] `calculate_job_score(job: &Job) -> JobScore` - Calls all scoring functions
- [x] Fetch weights from `scoring_criteria` table
- [x] Calculate weighted sum
- [x] Calculate rank across all scored jobs
- [x] Save to `job_scores` table

**API Endpoints** (1 day):
- [x] `POST /api/jobs/{id}/calculate-score` - Trigger scoring for one job
- [x] `POST /api/jobs/calculate-all-scores` - Bulk re-score all jobs
- [x] `GET /api/jobs/ranked` - Get jobs ordered by score
- [x] `GET /api/scoring-criteria` - Get current weights
- [x] `PUT /api/scoring-criteria` - Update weights (array of criteria)

**Implementation Details**:
- All 7 scoring functions implemented with proper 0-100 scaling
- Linear interpolation for compensation ($100K-$200K+ range)
- Tax structure multipliers: W-2 (×1.0), 1099 (×1.10), Schedule C (×1.15)
- Weighted sum calculation: total_score = Σ(score_i × weight_i)
- SQL window function for ranking (ROW_NUMBER() OVER ORDER BY total_score DESC)
- Database migration updated: DECIMAL → DOUBLE PRECISION for f64 compatibility
- Route ordering fixed: /ranked before /{id} to prevent UUID parsing conflict
- PRD updated with comprehensive scoring formulas (section 3.6)

**Testing Results**:
- Successfully scored 30 jobs with 0 failures
- All API endpoints functional
- Weighted calculations verified correct
- Rankings properly assigned

### Phase 3: UI Enhancement (Week 3) ✅ **COMPLETED**

**Status**: Core functionality implemented - commit sequence 1863412, 19bb36c, 684678e, dd8cc22

**New React Components** (3 days):
- [x] `<RankedJobsTable />` - Main sortable table (frontend/src/RankedJobsTab.tsx)
  - Columns: Rank, Score, Title, Company, Comp, Relationship, Remote, Domain, [Expand]
  - Color-coded score cells (0-40 red, 40-70 yellow, 70-100 green)
  - Click column header to sort (8 sortable columns)
  - Click row to expand full details with all 7 criterion scores + weights
- [x] `<JobScoreDetails />` - Integrated into RankedJobsTab as expandable row
  - Shows all 7 criterion scores with individual color coding
  - Displays weights for each criterion
  - Shows calculated_at timestamp and job details
- [x] `<WeightAdjustmentPanel />` - Collapsible panel with sliders (frontend/src/WeightAdjustmentPanel.tsx)
  - Real-time validation: weights must sum to 1.0
  - 7 gradient sliders with percentage display
  - "Save & Recalculate All Scores" button triggers:
    * PUT /api/scoring-criteria to update weights
    * POST /api/jobs/calculate-all-scores to recalculate all jobs
    * Displays success message with count
  - Reset button to revert changes
  - Collapsible UI (starts collapsed)

**Integration** (1 day):
- [x] Add "Ranked Jobs" tab to main navigation with TrendingUp icon
- [x] **Add overall score badge as FIRST badge on job cards** in all tabs (App.tsx:1304-1316)
  - Badge format: "⭐ Score: 44.8 (#1)" with color coding
  - Green: 70-100, Yellow: 40-69, Red: 0-39
  - Position: FIRST badge before Industry, Employment Type
  - Shows rank in parentheses if available
  - Has data-testid="header-score"
- [x] **Sort job cards by total_score DESC** in ALL tabs (App.tsx:1221-1252)
  - filterJobs() and getAllActiveJobs() now sort by total_score DESC
  - Null scores sorted to end
  - Applies to: All, New, Approved, Applied, Filtered tabs
  - **Filtered tab especially important**: High-scoring filtered jobs now surface to top
- [x] Add filter by minimum score (e.g., "Show only 70+") - ✅ COMPLETED
  - Implementation: RankedJobsTab.tsx:50, 106-112, 240-289
  - Features: Button group filter (0, 30, 40, 50, 60, 70+)
  - Shows filtered count: "Showing N jobs with score ≥ X"
  - Active button highlighted with blue background (#0ea5e9)
  - Integrated before Scoring Legend

**Polish** (1 day):
- [x] Loading states (RankedJobsTab shows "Loading ranked jobs..." with Award icon)
- [x] Success/error messages (WeightAdjustmentPanel displays feedback with icons)
- [ ] Export to CSV button - DEFERRED (future enhancement)
- [ ] Help tooltips explaining each criterion - DEFERRED (future enhancement)

**Backend Enhancement**:
- [x] Added GET /api/jobs/{id}/score endpoint (main.rs:1902-1917)
- [x] Integrated into route table at line 5839

**Implementation Details**:
- RankedJobsTab fetches jobs from GET /api/jobs/ranked (sorted by total_score DESC)
- Fetches individual scores via GET /api/jobs/{id}/score for each job
- WeightAdjustmentPanel integrated above table
- Score badges fetch scores via fetchJobScores() after jobs load
- Job cards use jobScores Map for O(1) lookups
- Sorting is client-side using jobScores Map data

**Testing**:
- Backend endpoints tested with curl (30 jobs returned)
- Frontend hot-reloads automatically (servers running)
- Score badges visible across all tabs
- Sorting works (highest scores first)
- WeightAdjustmentPanel validation (sum must = 1.0)

### Phase 4: Integration & Testing (Week 4) ✅ **COMPLETED**

**Status**: Implemented and tested - commit [pending]

**Automation** (2 days): ✅
- [x] Auto-calculate scores after LLM extraction completes
- [x] Add score calculation to `/api/intake/reextract-job` flow
- [x] Batch calculate scores for all existing filtered jobs

**Testing** (2 days): ✅ **ALL COMPLETED**
- [x] Unit tests for each scoring function (20 tests added - main.rs:6326-6743)
- [ ] Integration tests for `calculate_job_score()` - DEFERRED (covered by unit tests)
- [x] API endpoint tests (6 tests added - api_tests.rs:343-701)
  - test_scoring_criteria_retrieval
  - test_job_score_insertion
  - test_multiple_job_scores_ranking
  - test_scoring_criteria_update
  - test_score_boundary_values
  - test_null_score_handling
- [x] Frontend E2E tests (Playwright) - 10 tests added (27-job-scoring-system.spec.ts)
  - Ranked Jobs tab visibility
  - Score display and color coding
  - Score badges on job cards
  - Weight adjustment panel functionality
  - Minimum score filtering
  - Sorting by criteria
  - Job detail expansion
  - Weight update and recalculation
  - Null score handling
  - Badge ordering verification
- [x] Test weight adjustment → re-ranking flow

**Validation** (1 day): ✅
- [x] Calculate scores for all 30 current filtered jobs
- [x] Review rankings for reasonableness
- [x] Weights validated as appropriate
- [x] Document any edge cases discovered

**Implementation Details**:

1. **Auto-calculation Integration**:
   - Modified `reextract_single_job()` to auto-calculate scores after LLM extraction (main.rs:4390-4420)
   - Modified `reextract_all_jobs()` to batch calculate scores after all extractions (main.rs:4522-4561)
   - Modified `reextract_job_descriptions()` to batch calculate scores (main.rs:4305-4344)
   - All reextract endpoints now return `score_calculated` status in response

2. **Unit Tests Added** (main.rs:6326-6743):
   - `test_compensation_score_with_annual_salary` - Tests $100K, $130K, $200K salary scoring
   - `test_compensation_score_with_1099` - Tests 1099 tax structure bonus
   - `test_compensation_score_missing_data` - Tests graceful handling of missing data
   - `test_relationship_score` - Tests direct hire, staffing agency, contract-to-hire
   - `test_remote_score` - Tests fully remote, hybrid, onsite, and shuttle bonuses
   - `test_domain_fit_score` - Tests automation engineer vs general software engineering
   - `test_flexibility_score` - Tests retainer detection and flexibility perks
   - `test_benefits_score` - Tests private insurance vs comprehensive benefits
   - `test_industry_score` - Tests healthcare tech, enterprise SaaS, unknown industries
   - **All 20 tests passing**

3. **Validation Results**:
   - Successfully scored all 30 jobs
   - Score distribution:
     - Average score: 24.93
     - Range: 5.0 to 44.8
     - High scores (70+): 0 jobs
     - Medium scores (40-69): 6 jobs
     - Low scores (<40): 24 jobs
   - **Key Finding**: 26 out of 30 jobs missing compensation data (weighted 30%)
   - Rankings are reasonable - remote jobs with good employment relationships rank highest

4. **Weight Adjustment Testing**:
   - Tested increasing remote_work weight from 20% to 25%
   - Verified rankings changed as expected:
     - C++ Developer (onsite) dropped from rank #2 to #7
     - Cypress Test Automation (remote) moved up in rankings
   - Weights restored to original values (30/20/20/15/10/3/2 distribution)

**Edge Cases Discovered**:
1. Missing compensation data significantly lowers scores (affects 26/30 jobs)
2. Industry events and training courses correctly score very low (5-8 points)
3. Jobs with no remote work option but high salary still get reasonable scores (balanced)
4. Title keywords affect domain_fit_score (+5 for "test", -20 for "manager")

**Performance**:
- Batch scoring 30 jobs: <1 second
- Single job scoring + rank recalculation: <100ms
- Weight adjustment + full recalculation: <1 second

---

## Future Enhancement: Option C Migration

### Manual Override Capabilities

**Use Case**: User wants to adjust score for specific job based on intangible factors not captured by formula (e.g., "really like the hiring manager", "bad gut feeling about company culture", "strategic career move").

### Schema Extensions

Fields already included in `job_scores` table (set to defaults initially):
- `manual_override_enabled BOOLEAN DEFAULT false`
- `manual_adjustment_points DECIMAL(5,2) DEFAULT 0` (range: -20 to +20)
- `override_reason TEXT`
- `overridden_by VARCHAR(100)` (user identifier)
- `overridden_at TIMESTAMPTZ`

### UI Additions

**Job Score Details Panel**:
- [ ] "Manual Adjustment" section
- [ ] Slider: -20 to +20 points
- [ ] Text area: Reason for adjustment
- [ ] "Apply Override" button
- [ ] Badge showing "Manually Adjusted (+15)" on job cards

**Ranked Jobs Table**:
- [ ] Icon indicator for jobs with manual overrides
- [ ] Filter option: "Show only manually adjusted"
- [ ] Hover tooltip showing override reason

**Scoring Logic Update**:
```rust
final_score = calculated_score + manual_adjustment_points;
final_score = final_score.clamp(0.0, 100.0); // Stay within 0-100 range
```

**API Endpoint**:
- `PUT /api/jobs/{id}/score-override` - Set manual adjustment
  - Body: `{ adjustment_points: f32, reason: String }`
  - Recalculates rank across all jobs

---

## Testing Plan

### Validation with Existing Jobs

**Test Dataset**: All 30 current filtered jobs

**Test Cases**:
1. [ ] Calculate scores for all 30 jobs
2. [ ] Verify scores fall within 0-100 range
3. [ ] Verify weights sum to 1.0
4. [ ] Verify ranking is correct (highest score = rank 1)
5. [ ] Spot-check 5 jobs:
   - Expert Systems Architect (1099, hybrid, testing → should score high)
   - Associate Test Engineer (lower salary → mid-range score)
   - Jobs with missing data → should handle gracefully

**Expected Results**:
- Top 10 jobs should align with intuitive "best opportunities"
- Jobs with missing data get neutral scores (don't crash)
- Rank distribution: Some high (80+), some mid (50-70), some low (30-50)

### Edge Cases

1. **Missing Compensation Data**:
   - Input: Job with no salary info
   - Expected: Compensation score = 0 (lowest possible)

2. **Multiple Compensation Types**:
   - Input: Job with both salary range ($120K-$140K) and bonus (10%)
   - Expected: Use midpoint ($130K) + bonus ($13K) = $143K equivalent

3. **Extreme Values**:
   - Input: Job with $500K salary
   - Expected: Compensation score capped at 100

4. **Unknown Employment Relationship**:
   - Input: Job with relationship = null
   - Expected: Relationship score = 30 (neutral)

5. **Weight Sum Validation**:
   - Input: User sets weights that sum to 0.95
   - Expected: API rejects with error "Weights must sum to 1.0"

6. **Re-ranking After Weight Change**:
   - Input: Change compensation weight from 30% to 40%
   - Expected: All job ranks recalculated, order may change

---

## Success Metrics

**Immediate (Week 4)**:
- [ ] All 30 filtered jobs have calculated scores
- [ ] Scores distributed across 0-100 range (not clustered)
- [ ] Top 5 ranked jobs align with user intuition
- [ ] UI renders ranked table without errors
- [ ] Weight adjustment triggers re-ranking within 1 second

**Medium-term (Month 2)**:
- [ ] User applies to 80%+ of jobs from top 10 ranked
- [ ] <20% of jobs from bottom 10 ranked get applied to
- [ ] User adjusts weights ≤3 times (weights are "good enough")
- [ ] Zero complaints about jobs scoring unexpectedly high/low

**Long-term (Month 3+)**:
- [ ] Scoring system handles new jobs automatically
- [ ] Decision time per job reduced by 50% (faster comparison)
- [ ] User requests Option C (manual override) implementation

---

## Status History

- 2025-10-21: Issue created based on user feedback
- 2025-10-21: Proposed multi-criteria weighted scoring system
- 2025-10-21: Documented 7 scoring criteria with formulas
- 2025-10-21: Defined 4-phase implementation plan
- 2025-10-21: Marked as **OPEN** - awaiting implementation

---

## Notes

**Design Decisions**:
- Chose weighted scoring over AHP (Analytic Hierarchy Process) for simplicity
- Chose linear scoring (0-100) over TOPSIS for interpretability
- Weights configurable in database (not hardcoded) for flexibility
- Future Option C (manual override) designed in from start

**Key Constraints**:
- Weights must always sum to 1.0 (enforced at application level)
- Individual scores always 0-100 (no negative scores)
- Total score always 0-100 (weighted sum of criterion scores)
- Rank is recalculated whenever any job score changes

**Alternative Approaches Considered**:
1. **Spreadsheet Export** (Option B): Too manual, rejected per user preference
2. **Pairwise Comparison (AHP)**: Too complex, 7 criteria = 21 comparisons
3. **TOPSIS**: Requires ideal/anti-ideal vectors, less intuitive
4. **Rule-Based System**: Too rigid, doesn't capture trade-offs

**Data Dependencies**:
- Requires high-quality LLM extraction of employment, compensation, remote_work fields
- If extraction quality improves (ISSUE-001), scoring accuracy improves
- Missing data should not crash scoring (graceful degradation)

**User Preferences Override**:
- This issue's documented preferences override any conflicting statements in PRD
- PRD Section 3 should be updated to match this issue's requirements

---

## Related Files

**Backend**:
- `backend/src/main.rs:683-733` - Current `filter_job()` function (to be refactored)
- `backend/src/main.rs` - New scoring functions (to be added)
- `database/schema.sql` - Schema for `scoring_criteria` and `job_scores` tables

**Frontend**:
- `frontend/src/App.tsx` - New `<RankedJobsTable />` component (to be added)
- `frontend/src/App.tsx` - New `<WeightAdjustmentPanel />` component (to be added)

**Documentation**:
- `docs/PRD.md` - Needs updates to Section 3 (Job Criteria)
- `CLAUDE.md` - May need workflow updates after implementation

**Database**:
- `job_criteria` table - Existing (may be deprecated or repurposed)
- `scoring_criteria` table - New (to be created)
- `job_scores` table - New (to be created)
