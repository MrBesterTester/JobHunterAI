---
id: ISSUE-064
title: E2E tests lack proper database isolation and state management
status: open
priority: high
severity: high
component: frontend
created: 2025-11-21
updated: 2025-11-21
affects: [testing, reliability, ci-cd]
related: [PLAYWRIGHT_BEST_PRACTICES.md]
---

# ISSUE-064: E2E tests lack proper database isolation and state management

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Problem Statement](#problem-statement)
  - [Entry Conditions](#entry-conditions)
  - [Exit Conditions](#exit-conditions)
  - [Inter-Test Dependencies](#inter-test-dependencies)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior (Playwright Best Practices)](#expected-behavior-playwright-best-practices)
- [Actual Behavior (Current Implementation)](#actual-behavior-current-implementation)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
  - [Current Test Architecture](#current-test-architecture)
  - [Example: Test That Modifies State Without Cleanup](#example-test-that-modifies-state-without-cleanup)
  - [Playwright Official Documentation](#playwright-official-documentation)
  - [Community Discussion](#community-discussion)
- [Risks and Consequences](#risks-and-consequences)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Per-Worker Database Isolation](#option-1-per-worker-database-isolation)
  - [Option 2: Per-Test Database Seeding in beforeEach](#option-2-per-test-database-seeding-in-beforeeach)
  - [Option 3: Transaction Rollback Pattern](#option-3-transaction-rollback-pattern)
  - [Option 4: Test Data Pools with Worker Index](#option-4-test-data-pools-with-worker-index)
  - [Comparison Matrix](#comparison-matrix)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Our E2E test suite lacks proper database isolation and state management. Tests run in parallel (4 workers, ~567 tests) against a single shared PostgreSQL database with no per-test cleanup or state restoration. This violates Playwright's core principle that "each test should be completely isolated from another test" and creates unpredictable test behavior due to inter-test dependencies.

## Impact

**Who/What is affected:**
- **Developers**: Flaky tests that pass/fail depending on execution order
- **CI/CD Pipeline**: Unreliable test results, difficult to debug failures
- **Test Suite Maintainability**: Growing complexity as tests become order-dependent
- **Development Velocity**: Time wasted investigating spurious test failures

**Severity:**
- **High**: Undermines test suite reliability and confidence
- **Current State**: 567 parallel tests modifying shared database with no isolation
- **Risk Level**: Increasing as test suite grows and more tests modify database state

## Problem Statement

### Entry Conditions

Each test has implicit **entry conditions** - the database state it expects when it starts:
- Specific jobs with specific statuses
- Known counts of jobs in each status
- Specific email_jobs entries for statistics tests
- Clean or predictable OAuth state

**Current Problem**: Tests assume entry conditions based on global setup, but those conditions may have been violated by previous tests that ran in parallel.

### Exit Conditions

Each test has **exit conditions** - the database state it leaves behind after completion:
- Jobs moved from "new" to "approved" status
- Gmail sync creating new job records
- Job counts changed in various statuses
- Email records added/modified

**Current Problem**: No cleanup means exit conditions become the entry conditions for subsequent tests, creating cascading dependencies.

### Inter-Test Dependencies

When tests run back-to-back or in parallel without isolation:
- **Test A** expects 10 "new" jobs (from seed data)
- **Test B** (running in parallel) approves 3 jobs, leaving 7 "new" jobs
- **Test A** fails because it now sees 7 instead of 10
- **Test C** (running later) depends on Test B's exit state without knowing it

**User's Concern**: "We don't know whether the entry conditions are understood and met as well as clear understanding of the exit condition of each test and how that may affect the test that follow."

This is **especially critical** with database state, as noted in `PLAYWRIGHT_BEST_PRACTICES.md`.

## Steps to Reproduce

1. Run test suite with 4 parallel workers:
   ```bash
   cd frontend && npx playwright test --workers=4
   ```

2. Observe that tests modify database state (approve jobs, sync Gmail, etc.)

3. Note that database state is seeded once globally, never cleaned up per-test

4. Run tests multiple times and observe occasional flaky failures due to state conflicts

## Expected Behavior (Playwright Best Practices)

According to official Playwright documentation:

1. **Test Isolation**: "Each test should be completely isolated from another test and should run independently with its own local storage, session storage, data, cookies etc."

2. **No Serial Dependencies**: "Using serial is not recommended. It is usually better to make your tests isolated, so they can be run independently."

3. **Database Isolation**: "For parallel test execution with shared resources like databases, leverage worker indices to create isolated test data" (use `testInfo.workerIndex` to generate unique data per worker)

4. **Before/After Hooks**: "Rather than having tests depend on each other, use before/after hooks to establish necessary conditions"

5. **Shared Resources**: "Don't use common databases, files, or external systems without proper isolation; prefer mocking APIs or generating unique test data per run"

## Actual Behavior (Current Implementation)

1. **Global Setup Seeds Once**: Database seeded once in `globalSetup` before all tests
2. **No Per-Test Cleanup**: Tests modify database with no restoration in `afterEach`
3. **Shared Database**: All 4 workers + 567 tests share single `jobhunter_personal` database
4. **Serial Mode Used**: Some tests use `test.describe.configure({ mode: 'serial' })` to avoid conflicts
5. **Isolated Project**: Created `chromium-isolated` project as workaround for state-dependent tests
6. **Entry/Exit Conditions Unclear**: No explicit documentation of what state each test expects/produces

## Root Cause

**Architectural Decision**: Single shared database (`jobhunter_personal`) used for all E2E tests

**Historical Context**:
- Started with global setup seeding database once (ISSUE-040)
- No per-test isolation implemented as tests were added
- Serial mode and isolated projects added as band-aids when conflicts arose
- Never refactored for proper parallel execution with database isolation

**Technical Constraints**:
- PostgreSQL database shared across all worker processes
- No transaction management in test code
- No worker-specific database namespacing
- OAuth tokens stored in single database (complicates per-worker isolation)

## Evidence

### Current Test Architecture

From `frontend/playwright.config.ts`:
```typescript
workers: 4, // 4 parallel workers
fullyParallel: true,
```

From `frontend/e2e/global-setup.ts`:
```typescript
// Seed test data before running tests (ONCE for all tests)
await seedTestData();
```

**Test Count**:
```bash
$ npx playwright test --list | grep -E "^\s+\[chromium\]" | wc -l
567  # 567 tests in main project running in parallel with 4 workers
```

### Example: Test That Modifies State Without Cleanup

From `frontend/e2e/tests/03-job-status-updates.spec.ts`:

```typescript
test.describe('Job Status Updates', () => {
  // Uses serial mode as workaround for database conflicts
  test.describe.configure({ mode: 'serial' });

  test('should move job from Inbox to Approved when approved', async ({ page }) => {
    // ...
    await firstJob.approve();  // ❌ Modifies database state
    // ❌ No cleanup/restoration in afterEach
  });
});
```

**Problems**:
1. Uses serial mode (Playwright discourages this)
2. Modifies database state (approves job)
3. No cleanup hook to restore original state
4. Next test inherits this modified state

**No Cleanup Hooks Found**:
```bash
$ grep -n "afterEach\|afterAll\|cleanup\|restore\|reset" e2e/tests/03-job-status-updates.spec.ts
# No output - no cleanup logic
```

### Playwright Official Documentation

**Source**: https://playwright.dev/docs/best-practices

> "Each test should be completely isolated from another test and should run independently with its own local storage, session storage, data, cookies etc. Test isolation improves reproducibility, makes debugging easier and prevents cascading test failures."

**Source**: https://playwright.dev/docs/test-parallel

> "Parallel tests are executed in separate worker processes and cannot share any state or global variables."

> "For parallel test execution with shared resources like databases, Playwright recommends leveraging worker indices to create isolated test data. Use `testInfo.workerIndex` to generate unique database usernames (e.g., `user-1`, `user-2`) for each worker process."

### Community Discussion

**Source**: https://github.com/microsoft/playwright/issues/33699

Dmitry Gozman (Playwright team) recommended:
1. Per-worker server instances
2. Per-worker databases
3. Custom fixtures with worker-specific baseURL
4. Cleanup in fixture teardown

Quote: "This will ensure that tests running in one worker will talk to its own server instance that will connect to its own database."

**Community Pain Point**: "There does not seem to be anywhere online that walks one through writing transactional tests that will not leak data during parallelization."

## Risks and Consequences

**Current Risks**:
1. **Flaky Tests**: Tests fail intermittently when parallel execution creates unexpected state
2. **Race Conditions**: Multiple workers modifying same database records simultaneously
3. **Cascading Failures**: One test's failure corrupts state for subsequent tests
4. **Order Dependencies**: Tests pass in one order, fail in another
5. **Debugging Difficulty**: Hard to reproduce failures due to timing-dependent state conflicts
6. **False Confidence**: Tests may pass with wrong state, missing real bugs

**Future Risks** (As Test Suite Grows):
1. More serial mode usage (slows down test execution)
2. More isolated projects needed (complexity increases)
3. Developer frustration with unreliable tests
4. Pressure to disable flaky tests (reducing coverage)

## Proposed Solutions

### Option 1: Per-Worker Database Isolation

**Description**: Create separate database instance for each Playwright worker

**Implementation**:
```typescript
// In worker fixture
const workerIndex = testInfo.workerIndex;
const dbName = `jobhunter_test_worker_${workerIndex}`;

// Create database
await exec(`createdb ${dbName}`);

// Run migrations/seeding
await exec(`psql -d ${dbName} -f database/schema.sql`);
await exec(`psql -d ${dbName} -f database/seed_test_data.sql`);

// Configure backend to use worker-specific database
process.env.DATABASE_URL = `postgresql://user@localhost/${dbName}`;
```

**Pros**:
- Complete isolation between workers
- No race conditions possible
- Can run fully parallel without serial mode
- Tests can modify database freely

**Cons**:
- Requires 4 PostgreSQL databases (one per worker)
- Increased resource usage (CPU, memory, disk)
- Slower test startup (4x database creation/seeding time)
- OAuth credentials need to be replicated per database
- Backend server needs per-worker configuration

**Implementation Effort**: 2-3 days

**Maintenance**: Medium - need to manage multiple database instances

### Option 2: Per-Test Database Seeding in beforeEach

**Description**: Truncate and reseed database before each test

**Implementation**:
```typescript
test.beforeEach(async ({ page }) => {
  // Truncate all tables
  await exec(`psql -d jobhunter_personal -c "TRUNCATE TABLE jobs, email_jobs, ... CASCADE"`);

  // Reseed test data
  await exec(`psql -d jobhunter_personal -f database/seed_test_data.sql`);

  // Navigate to app
  await page.goto('http://localhost:3000');
});
```

**Pros**:
- Single database (simpler infrastructure)
- Clear entry conditions for every test
- No worker-specific complexity

**Cons**:
- **Very slow**: ~500ms per test * 567 tests = ~4.7 minutes just for seeding
- Serial execution required (can't run parallel with shared database being truncated)
- Destroys parallelism benefits
- Test execution time increases dramatically

**Implementation Effort**: 1 day

**Maintenance**: Low - simple pattern

### Option 3: Transaction Rollback Pattern

**Description**: Wrap each test in a database transaction, rollback after test

**Implementation**:
```typescript
test.beforeEach(async ({ page, testInfo }) => {
  // Start transaction
  await exec(`psql -d jobhunter_personal -c "BEGIN"`);

  // Store transaction ID for cleanup
  testInfo.transaction = await getTransactionId();
});

test.afterEach(async ({ testInfo }) => {
  // Rollback transaction
  await exec(`psql -d jobhunter_personal -c "ROLLBACK"`);
});
```

**Pros**:
- Single database
- Very fast (no I/O for cleanup)
- Automatic state restoration
- Can maintain parallelism (if transaction isolation works)

**Cons**:
- **Complex**: Requires backend integration with transaction management
- **Limited**: Can't rollback across process boundaries (backend server commits separately)
- Doesn't work with our architecture (backend in separate process)
- Would require major backend refactoring

**Implementation Effort**: 5-7 days (backend changes needed)

**Maintenance**: High - complex transaction management logic

### Option 4: Test Data Pools with Worker Index

**Description**: Pre-create isolated test data sets, assign to workers by index

**Implementation**:
```typescript
// Seed database with 4 sets of test data
INSERT INTO jobs (...) VALUES (...) WHERE worker_id = 0;  -- Worker 0 data
INSERT INTO jobs (...) VALUES (...) WHERE worker_id = 1;  -- Worker 1 data
// etc.

// In test
const workerIndex = testInfo.workerIndex;
await page.goto(`http://localhost:3000?worker=${workerIndex}`);

// Frontend filters by worker_id
SELECT * FROM jobs WHERE worker_id = ${workerIndex};
```

**Pros**:
- Single database
- Maintains parallelism
- No database creation overhead
- No transaction complexity

**Cons**:
- **Significant code changes**: Frontend/backend need worker-awareness
- Tests still share database (potential for conflicts)
- Data pool exhaustion if tests create many records
- Complicated cleanup logic
- Worker ID must be passed through entire stack

**Implementation Effort**: 3-4 days

**Maintenance**: Medium - worker-aware filtering throughout codebase

### Comparison Matrix

| Criterion | Option 1: Per-Worker DB | Option 2: Per-Test Seed | Option 3: Transactions | Option 4: Data Pools |
|-----------|-------------------------|-------------------------|------------------------|----------------------|
| **Isolation Quality** | ⭐⭐⭐⭐⭐ Perfect | ⭐⭐⭐⭐⭐ Perfect | ⭐⭐⭐⭐ Good | ⭐⭐⭐ Moderate |
| **Parallelism** | ⭐⭐⭐⭐⭐ Full | ⭐ None (serial only) | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐ Good |
| **Speed** | ⭐⭐⭐ Moderate | ⭐ Very slow | ⭐⭐⭐⭐⭐ Fast | ⭐⭐⭐⭐ Good |
| **Complexity** | ⭐⭐⭐ Moderate | ⭐⭐⭐⭐⭐ Simple | ⭐ Complex | ⭐⭐ Moderate |
| **Resource Usage** | ⭐⭐ High (4x DB) | ⭐⭐⭐⭐ Low | ⭐⭐⭐⭐ Low | ⭐⭐⭐ Moderate |
| **Implementation Effort** | 2-3 days | 1 day | 5-7 days | 3-4 days |
| **Maintenance** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Low | ⭐ High | ⭐⭐⭐ Medium |
| **Playwright Alignment** | ⭐⭐⭐⭐⭐ Perfect | ⭐⭐ Acceptable | ⭐⭐⭐ Acceptable | ⭐⭐⭐⭐ Good |

## Decision

**Status**: 🚨 **LE PROBLEMA DU JOUR** - CRITICAL PRIORITY

**Decision Made**: Option 1 (Per-Worker Database Isolation)

**Rationale**:
- Aligns perfectly with Playwright best practices (official recommendation)
- Solves entry/exit condition problem completely
- Maintains full parallelism (4 workers)
- Resource overhead is reasonable (~200MB for 4 databases)
- Clean, maintainable architecture
- Industry standard pattern

**Rejected Options**:
- Option 2: Too slow (~4.7 min overhead, forces serial execution)
- Option 3: Doesn't work with our architecture (backend in separate process)
- Option 4: Architectural pollution (worker-awareness throughout stack)

**Next Steps**:
1. ✅ **[COMPLETED]** Prototype Option 1 to validate assumptions
   - **Result**: Highly successful! ✅
   - **Startup time**: 947ms (under 1 second!)
   - **Memory overhead**: 0.18 MB (negligible)
   - **Validation**: All 4 worker databases created/seeded successfully (45 jobs + 15 email_jobs each)
   - **Parallel creation**: Works perfectly
   - **Conclusion**: Option 1 is highly feasible
   - **Prototype script**: `prototype-worker-db-isolation.ts`
   - **Schema fixes**: Added missing `extraction_method` (jobs table) and `source` (email_jobs table) columns
   - **Commit**: a8b231a
2. **[NEXT]** Implement worker fixture for database isolation
   - Create Playwright worker fixture
   - Implement per-worker database connection strategy
   - Test with subset of actual E2E tests
3. Roll out to full test suite
4. Remove all serial mode usage (anti-patterns)

## Implementation

[Details will be added during implementation]

## Testing

**Test Commands:**
```bash
# Reproduce the problem: Run tests multiple times and observe flakiness
cd frontend && for i in {1..5}; do npx playwright test --workers=4; done

# Verify the fix: Tests should pass consistently regardless of execution order
cd frontend && for i in {1..10}; do npx playwright test --workers=4; done
```

**Verification:**
- [ ] All tests pass consistently across 10 consecutive runs
- [ ] No serial mode usage in test files (except where truly necessary)
- [ ] No flaky test failures due to database state conflicts
- [ ] Test execution time remains reasonable (< 15 minutes)
- [ ] Database state is properly isolated between workers/tests

## Status History

- 2025-11-21: ISSUE created based on user concern about inter-test dependencies
- 2025-11-21: Comprehensive research conducted on Playwright best practices
- 2025-11-21: Evidence gathered from current test suite
- 2025-11-21: Four solution options documented with analysis

## Notes

**Immediate Trigger**: Dashboard statistics test failure revealed that test seed data was incomplete (ISSUE-063). During investigation, user raised concern about inter-test dependencies and database state management. This investigation confirmed the concern is valid and systemic.

**Recent Related Work**:
- ISSUE-064: Created `chromium-isolated` project as band-aid for state-dependent tests
- PLAYWRIGHT_BEST_PRACTICES.md: Updated to document test isolation importance
- Multiple tests using serial mode to avoid conflicts (anti-pattern)

**Key Insight**: "As the test suite grows, the lack of proper isolation will become an increasingly significant problem. Addressing this now prevents accumulating technical debt."

**User Quote**: "We don't know whether the entry conditions are understood and met as well as clear understanding of the exit condition of each test and how that may affect the test that follow. I think that this is especially true of having a database."

## Related Files

**Configuration**:
- `frontend/playwright.config.ts:38-51` - Parallel execution configuration (4 workers)
- `frontend/playwright.config.ts:85-114` - Isolated project workaround
- `frontend/e2e/global-setup.ts:22-42` - Global database seeding (once for all tests)

**Test Examples with State Modification**:
- `frontend/e2e/tests/03-job-status-updates.spec.ts:24-27` - Serial mode due to state conflicts
- `frontend/e2e/tests/03-job-status-updates.spec.ts:38-78` - Approves jobs, no cleanup
- `frontend/e2e/tests/16-gmail-sync-integration.spec.ts` - Gmail sync modifies database
- `frontend/e2e/tests/23-description-quality.spec.ts` - State-dependent test in isolated project

**Documentation**:
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` - Test isolation section
- `README_auto-test-plan.md` - Test plan and strategy
- `docs/TESTING_STATUS.md` - Current test suite status

**Backend**:
- `backend/src/main.rs` - Database connection management
- `database/schema.sql` - Database schema
- `database/seed_test_data.sql` - Test data seeding script
