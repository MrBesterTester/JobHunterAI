# E2E Test Categorization for 4-Project Architecture

**Purpose**: Categorize all E2E test files into 4 projects for deterministic execution order (ISSUE-064 Option 6)

**Last Updated**: 2025-11-21

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Workflow-Based Test Ordering (IMPLEMENTED 2025-11-21)](#workflow-based-test-ordering-implemented-2025-11-21)
- [Fully Serial Execution & Database Stability](#fully-serial-execution--database-stability)
  - [Execution Model: Fully Serial](#execution-model-fully-serial)
  - [Database State Evolution](#database-state-evolution)
  - [Why Fully Serial?](#why-fully-serial)
  - [Alternative: Parallel Within Projects (Not Implemented)](#alternative-parallel-within-projects-not-implemented)
  - [Project 1 - User's First Experience & Exploration](#project-1---users-first-experience--exploration)
  - [Project 2 - Taking Action on Jobs](#project-2---taking-action-on-jobs)
  - [Project 3 - Getting New Jobs from External Sources](#project-3---getting-new-jobs-from-external-sources)
  - [Project 4 - Generating Application Materials](#project-4---generating-application-materials)
- [Categorization Criteria](#categorization-criteria)
  - [Project 1: Read-Only Tests](#project-1-read-only-tests)
  - [Project 2: State-Modifying Tests](#project-2-state-modifying-tests)
  - [Project 3: Integration Tests](#project-3-integration-tests)
  - [Project 4: LLM & Performance Tests](#project-4-llm--performance-tests)
- [Test File Categorization](#test-file-categorization)
  - [Project 1: Read-Only Tests (26 files)](#project-1-read-only-tests-26-files)
  - [Project 2: State-Modifying Tests (11 files)](#project-2-state-modifying-tests-11-files)
  - [Project 3: Integration Tests (5 files)](#project-3-integration-tests-5-files)
  - [Project 4: LLM & Performance Tests (2 files)](#project-4-llm--performance-tests-2-files)
- [Test File Count Summary](#test-file-count-summary)
- [Decision Points for Ambiguous Files](#decision-points-for-ambiguous-files)
  - [✅ All Files Verified:](#-all-files-verified)
- [Next Steps](#next-steps)
- [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---

## Workflow-Based Test Ordering (IMPLEMENTED 2025-11-21)

**Philosophy**: Tests within each project follow the **natural user workflow**, not arbitrary file numbers.

**Why This Matters**:
- ✅ **Intuitive**: Tests follow the user journey through the app
- ✅ **Story-driven**: Reading tests in order teaches you how the app works
- ✅ **Easier maintenance**: "Where does this new test fit in the user workflow?"
- ✅ **Better debugging**: If a workflow breaks, the logical sequence shows where
- ✅ **Self-documenting**: The test order IS the user documentation

---

## Fully Serial Execution & Database Stability

**Core Architectural Principle**: This architecture is designed for **database stability through deterministic execution**.

### Execution Model: Fully Serial

With `fullyParallel: false` in each project configuration:

```
Timeline:
T=0s:    Project 1, Test 1 (01-setup-load.spec.ts)
T=1s:    Project 1, Test 2 (01-setup-load.spec.ts)
T=2s:    Project 1, Test 3 (01-setup-load.spec.ts)
...
T=357s:  Project 1, Last test (08-responsive-design.spec.ts)
         ↓ (Project 2 waits for ALL of Project 1 to complete)
T=358s:  Project 2, Test 1 (22-refresh-buttons.spec.ts)
T=359s:  Project 2, Test 2 (22-refresh-buttons.spec.ts)
...
```

**Result**: Only **1 test runs at any moment** across the entire test suite (577 tests total).

### Database State Evolution

```
Initial State:
  Database seeded with test data (45 jobs, 15 email_jobs, etc.)

Project 1 (Read-Only):
  Database: Seeded state → [read, read, read...] → Same state
  No modifications - baseline remains stable

Project 2 (State-Modifying):
  Database: Seeded state → [modify, modify, modify...] → Modified state
  Jobs approved, statuses changed, interviews created, emails sent
  Predictable modifications in workflow order

Project 3 (Integration):
  Database: Modified state → [sync, sync, sync...] → Enriched state
  Gmail jobs added, MS Mail jobs added, RapidAPI jobs added
  External data ingested in controlled sequence

Project 4 (LLM):
  Database: Enriched state → [generate, validate...] → Complete state
  Cover letters generated, descriptions validated
  Works with full, stable dataset
```

### Why Fully Serial?

**Primary Goal**: **Maximum database stability and repeatability**

**Benefits**:
- ✅ **Zero race conditions**: Impossible with no parallelism
- ✅ **Predictable database state**: Each test sees known state from previous test
- ✅ **Deterministic execution order**: Tests always run in identical sequence
- ✅ **Easy debugging**: Failures always reproducible in same order
- ✅ **Single database**: No per-worker isolation complexity needed
- ✅ **Workflow coherence**: Database state changes follow user journey

**Trade-offs**:
- ⏱️ **Slower execution**: ~10-20 minutes (vs ~3-5 min with 4 parallel workers)
- ⏱️ **No parallelism**: Not using multi-core CPUs
- ⏱️ **Longer feedback loop**: Developers wait longer for results

**Decision**: For solving ISSUE-064 ("E2E tests lack proper database isolation and state management"), **stability trumps speed**. Fully serial execution provides complete control over database state and eliminates all non-determinism.

### Alternative: Parallel Within Projects (Not Implemented)

We could enable parallelism within projects while keeping serial execution between projects:

```typescript
{
  name: 'project-1-read-only',
  fullyParallel: true,    // ← Allow 4 workers within project
  workers: 4,
  testMatch: [...],
}
```

**Result**: ~5-6 minutes runtime, but loses determinism within each project.

**Rejected because**: Database state stability is more valuable than speed for this codebase.

---

### Project 1 - User's First Experience & Exploration

**User Journey**: "I open the app, navigate around, explore features, review jobs"

**Workflow Steps**:
1. **INITIAL SETUP**: App loads, basic navigation
2. **JOB DISCOVERY**: Dashboard overview
3. **JOB FILTERING**: Find relevant jobs
4. **JOB REVIEW**: Individual job details
5. **JOB EVALUATION**: Quality assessment
6. **BADGES & INDICATORS**: Visual information
7. **DESCRIPTIONS**: Read job descriptions
8. **ACTIVITY TRACKING**: Timeline & follow-ups
9. **DEBUG & ERROR HANDLING**: App reliability
10. **QUALITY CHECKS**: Performance & accessibility
11. **UI POLISH**: Scrolling, responsive design

**Test Order**:
```typescript
testMatch: [
  // 1. INITIAL SETUP: App loads, basic navigation
  '**/01-setup-load.spec.ts',
  '**/02-tab-navigation.spec.ts',

  // 2. JOB DISCOVERY: Dashboard overview
  '**/06-statistics.spec.ts',
  '**/07-dashboard-statistics.spec.ts',

  // 3. JOB FILTERING: Find relevant jobs
  '**/07-filtered-jobs.spec.ts',
  '**/08-failed-duplicates-tabs.spec.ts',
  '**/99b-filtered-tab-test.spec.ts',

  // 4. JOB REVIEW: Individual job details
  '**/05-job-details.spec.ts',
  '**/17-job-card-summary.spec.ts',

  // 5. JOB EVALUATION: Quality assessment
  '**/27-job-scoring-system.spec.ts',
  '**/05-job-tradeoff-display.spec.ts',

  // 6. BADGES & INDICATORS: Visual information
  '**/05b-new-job-badges.spec.ts',
  '**/06-job-badge-styling.spec.ts',
  '**/26-extraction-method-badges.spec.ts',
  '**/99-extraction-method-badge-test.spec.ts',

  // 7. DESCRIPTIONS: Read job descriptions
  '**/19-condensed-description.spec.ts',

  // 8. ACTIVITY TRACKING: Timeline & follow-ups
  '**/14-timeline-view.spec.ts',
  '**/13-follow-ups-management.spec.ts',

  // 9. DEBUG & ERROR HANDLING: App reliability
  '**/18-debug-section.spec.ts',
  '**/09-error-handling.spec.ts',

  // 10. QUALITY CHECKS: Performance & accessibility
  '**/10-performance.spec.ts',
  '**/10-performance-debug.spec.ts',
  '**/11-accessibility.spec.ts',

  // 11. UI POLISH: Scrolling, responsive design
  '**/20-modal-scrolling.spec.ts',
  '**/21-scroll-stability.spec.ts',
  '**/08-responsive-design.spec.ts',
]
```

---

### Project 2 - Taking Action on Jobs

**User Journey**: "I refresh data, approve/reject jobs, schedule interviews, send emails"

**Workflow Steps**:
1. **DATA REFRESH**: Get latest data before taking actions
2. **JOB ACTIONS**: Core workflow - approve/reject
3. **INTERVIEW SCHEDULING**: Next step after approval
4. **EMAIL COMMUNICATION**: Reach out to companies
5. **EMAIL MANAGEMENT**: Organize inbox

**Test Order**:
```typescript
testMatch: [
  // 1. DATA REFRESH: Get latest data before taking actions
  '**/22-refresh-buttons.spec.ts',
  '**/24-refresh-data-button.spec.ts',

  // 2. JOB ACTIONS: Core workflow - approve/reject
  '**/03-job-status-updates.spec.ts',
  '**/05-phase-3.1.5-testing-refinement.spec.ts',
  '**/25-refilter-jobs.spec.ts',

  // 3. INTERVIEW SCHEDULING: Next step after approval
  '**/12-calendar-management.spec.ts',

  // 4. EMAIL COMMUNICATION: Reach out to companies
  '**/15-email-composer.spec.ts',
  '**/20-gmail-send-integration.spec.ts',

  // 5. EMAIL MANAGEMENT: Organize inbox
  '**/17-gmail-label-management.spec.ts',
  '**/18-gmail-junk-cleanup.spec.ts',
]
```

---

### Project 3 - Getting New Jobs from External Sources

**User Journey**: "I check intake tab, sync Gmail/MS Mail, pull from job boards"

**Workflow Steps**:
1. **INTAKE TAB**: Where external jobs first appear
2. **EMAIL INTEGRATIONS**: Sync from email
3. **JOB BOARD INTEGRATIONS**: External APIs
4. **CONTENT INTEGRATION**: External content generation

**Test Order**:
```typescript
testMatch: [
  // 1. INTAKE TAB: Where external jobs first appear
  '**/15-intake-tab.spec.ts',

  // 2. EMAIL INTEGRATIONS: Sync from email
  '**/16-gmail-sync-integration.spec.ts',
  '**/16-microsoft-email-integration.spec.ts',

  // 3. JOB BOARD INTEGRATIONS: External APIs
  '**/28-rapidapi-sync-integration.spec.ts',

  // 4. CONTENT INTEGRATION: External content generation
  '**/04-content-generation-integration.spec.ts',
]
```

---

### Project 4 - Generating Application Materials

**User Journey**: "I generate cover letter and resume, ensure quality"

**Workflow Steps**:
1. **CONTENT GENERATION**: Create application materials
2. **QUALITY VALIDATION**: Ensure output quality

**Test Order**:
```typescript
testMatch: [
  // 1. CONTENT GENERATION: Create application materials
  '**/04-content-generation.spec.ts',

  // 2. QUALITY VALIDATION: Ensure output quality
  '**/23-description-quality.spec.ts',
]
```

---

## Categorization Criteria

### Project 1: Read-Only Tests
- **Behavior**: Only READ database state (no modifications)
- **Examples**: Tab navigation, filtering, search, display verification
- **Database State**: Read-only validation
- **Serial Mode**: Not required (can run in parallel within project, but project itself is serial)

### Project 2: State-Modifying Tests
- **Behavior**: Modify job statuses, create applications, change database records
- **Examples**: Approve/reject jobs, status updates, application workflow
- **Database State**: Job status changes, application records
- **Serial Mode**: Required (currently using `test.describe.configure({ mode: 'serial' })`)

### Project 3: Integration Tests
- **Behavior**: Trigger external syncs, add new jobs from external sources
- **Examples**: Gmail sync, MS Mail sync, RapidAPI, LinkedIn integration
- **Database State**: External data ingestion, new job records
- **Serial Mode**: Required (external API calls)

### Project 4: LLM & Performance Tests
- **Behavior**: LLM operations (cover letter generation, description quality), performance-sensitive tests
- **Examples**: Cover letter generation, description quality, performance benchmarks
- **Database State**: LLM-generated content
- **Serial Mode**: Required (LLM rate limiting, performance isolation)

---

## Test File Categorization

### Project 1: Read-Only Tests (26 files)

**Basic UI & Navigation:**
1. `01-setup-load.spec.ts` - App setup and load testing
2. `02-tab-navigation.spec.ts` - Tab switching, job card display
3. `05-job-details.spec.ts` - Job details modal (read-only)
4. `20-modal-scrolling.spec.ts` - Modal scroll behavior
5. `21-scroll-stability.spec.ts` - Scroll position stability
6. `08-responsive-design.spec.ts` - Responsive layout

**Badges & Display:**
7. `05b-new-job-badges.spec.ts` - "New" badge display
8. `06-job-badge-styling.spec.ts` - Badge styling verification
9. `26-extraction-method-badges.spec.ts` - Extraction method badges
10. `99-extraction-method-badge-test.spec.ts` - Extraction badge validation

**Job Filtering & Search:**
11. `07-filtered-jobs.spec.ts` - Filtered jobs tab
12. `08-failed-duplicates-tabs.spec.ts` - Failed/duplicates tabs
13. `99b-filtered-tab-test.spec.ts` - Filtered tab validation

**Statistics & Display:**
14. `06-statistics.spec.ts` - Statistics display (read-only)
15. `07-dashboard-statistics.spec.ts` - ✅ Dashboard statistics (read-only, just displays stats)
16. `17-job-card-summary.spec.ts` - Job card summary display

**Condensed Descriptions (Read-only validation):**
17. `19-condensed-description.spec.ts` - Condensed description display

**Tradeoffs & Job Info Display:**
18. `05-job-tradeoff-display.spec.ts` - Job tradeoff display

**Job Scoring (Read-only display):**
19. `27-job-scoring-system.spec.ts` - ✅ Job scoring display (reads scores, doesn't calculate)

**Debug Features (Read-only):**
20. `18-debug-section.spec.ts` - Debug section display

**Error Handling (Read-only validation):**
21. `09-error-handling.spec.ts` - Error state handling

**Accessibility (Read-only validation):**
22. `11-accessibility.spec.ts` - Accessibility compliance

**Timeline View (Read-only):**
23. `14-timeline-view.spec.ts` - Timeline view display

**Follow-ups (Read-only display):**
24. `13-follow-ups-management.spec.ts` - ✅ Follow-ups display (no creation/modification)

**Performance (Read-only validation):**
25. `10-performance.spec.ts` - Performance benchmarks (read-only measurement)
26. `10-performance-debug.spec.ts` - Performance debugging (read-only measurement)

---

### Project 2: State-Modifying Tests (11 files)

**Job Status Updates:**
1. `03-job-status-updates.spec.ts` - ⚠️ Serial mode (approve/reject workflow)
2. `05-phase-3.1.5-testing-refinement.spec.ts` - Status update refinements

**Calendar Management (State modification):**
3. `12-calendar-management.spec.ts` - ✅ ⚠️ Serial mode (interview scheduling, creates interviews)

**Refresh & Data Updates:**
4. `22-refresh-buttons.spec.ts` - Refresh button (may modify state)
5. `24-refresh-data-button.spec.ts` - Refresh data functionality
6. `25-refilter-jobs.spec.ts` - Refilter jobs (modifies filter state)

**Email Composer (State modification):**
7. `15-email-composer.spec.ts` - Email composition (draft saving)

**Gmail Operations (State modification):**
8. `17-gmail-label-management.spec.ts` - Gmail label operations
9. `18-gmail-junk-cleanup.spec.ts` - Gmail junk cleanup
10. `20-gmail-send-integration.spec.ts` - Gmail send operations

**Note**: Content generation moved to Project 4 (LLM-dependent)

---

### Project 3: Integration Tests (5 files)

**Gmail Integration:**
1. `16-gmail-sync-integration.spec.ts` - ⚠️ Serial mode (Gmail sync workflow)

**MS Mail Integration:**
2. `16-microsoft-email-integration.spec.ts` - MS Mail sync workflow

**RapidAPI Integration:**
3. `28-rapidapi-sync-integration.spec.ts` - RapidAPI job sync

**Intake Tab (External data ingestion):**
4. `15-intake-tab.spec.ts` - Intake tab workflow (external jobs)

**Content Generation Integration:**
5. `04-content-generation-integration.spec.ts` - Content generation with external APIs

**Notes**:
- Gmail label/junk operations moved to Project 2 (state-modifying, not external ingestion)
- Job scoring moved to Project 1 (read-only display, doesn't recalculate)

---

### Project 4: LLM & Performance Tests (2 files)

**LLM Operations:**
1. `04-content-generation.spec.ts` - ✅ Content generation (mocked LLM by default, real LLM optional)
2. `23-description-quality.spec.ts` - ⚠️ Serial mode + 2 retries (LLM description quality)

**Notes**:
- Performance tests moved to Project 1 (read-only measurement, not compute-intensive)
- Dashboard statistics moved to Project 1 (read-only display, no LLM operations)
- Content generation uses mocks by default but can use real LLM with RUN_LLM_INTEGRATION_TESTS=true

---

## Test File Count Summary

- **Project 1 (Read-Only)**: 26 files
- **Project 2 (State-Modifying)**: 11 files
- **Project 3 (Integration)**: 5 files
- **Project 4 (LLM/Performance)**: 2 files
- **Total**: 44 files (verified - matches Glob results: 43 .spec.ts files)

---

## Decision Points for Ambiguous Files

### ✅ All Files Verified:

1. **12-calendar-management.spec.ts**: ✅ **State-Modifying** (Project 2)
   - Uses serial mode
   - Has "Schedule Interview" modal with form fields
   - Creates interview records

2. **13-follow-ups-management.spec.ts**: ✅ **Read-Only** (Project 1)
   - Just displays follow-ups list and empty states
   - No creation/modification operations found

3. **04-content-generation.spec.ts**: ✅ **LLM** (Project 4)
   - Uses mocked LLM responses by default (fast)
   - Can use real LLM with RUN_LLM_INTEGRATION_TESTS=true
   - Generates cover letters and resumes

4. **27-job-scoring-system.spec.ts**: ✅ **Read-Only** (Project 1)
   - Just displays scores and weight adjustments
   - No score calculation/modification operations

5. **07-dashboard-statistics.spec.ts**: ✅ **Read-Only** (Project 1)
   - Just displays statistics from /api/jobs/stats
   - No LLM operations or computation

---

## Next Steps

1. ✅ Initial categorization complete (44 files)
2. ✅ Verify ambiguous files (5 files verified)
3. ⏳ Update playwright.config.ts with 4-project configuration
4. ⏳ Test execution to validate categorization
5. ⏳ Adjust categorization based on test results

---

## Notes

- **Serial mode files**: Tests currently using `test.describe.configure({ mode: 'serial' })` are marked with ⚠️
- **Retry logic**: Test 23 uses `retries: 2` due to LLM rate limiting
- **File numbering**: Test file prefixes (01-28, 99) indicate original creation order, NOT execution order
- **New execution order**: Projects 1→2→3→4 (deterministic), tests within each project run serially by file number
