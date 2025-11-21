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

- [🚨 IMPLEMENTATION ROADMAP - LE PROBLEMA DU JOUR](#-implementation-roadmap---le-problema-du-jour)
  - [Phase 1: Foundation (COMPLETED ✅)](#phase-1-foundation-completed-)
  - [Phase 2: Backend Connection Strategy (COMPLETED ✅)](#phase-2-backend-connection-strategy-completed-)
  - [Phase 3: Playwright Worker Fixture (COMPLETED ✅)](#phase-3-playwright-worker-fixture-completed-)
  - [Phase 4: Full Rollout (PENDING)](#phase-4-full-rollout-pending)
  - [Phase 5: Cleanup (PENDING)](#phase-5-cleanup-pending)
  - [Key Questions to Track](#key-questions-to-track)
- [Remaining Challenge: Intra-Worker Test Isolation](#remaining-challenge-intra-worker-test-isolation)
  - [What We've Solved (Inter-Worker Conflicts)](#what-weve-solved-inter-worker-conflicts)
  - [What Remains Unsolved (Intra-Worker Conflicts)](#what-remains-unsolved-intra-worker-conflicts)
  - [Proposed Solutions for Intra-Worker Isolation](#proposed-solutions-for-intra-worker-isolation)
    - [Option 5A: Per-Test Database Reset (Thorough but Slow)](#option-5a-per-test-database-reset-thorough-but-slow)
    - [Option 5B: Transaction Rollback per Test (Fast but Complex)](#option-5b-transaction-rollback-per-test-fast-but-complex)
    - [Option 5C: Accept Partial Isolation (Pragmatic)](#option-5c-accept-partial-isolation-pragmatic)
    - [Option 5D: Hybrid Approach (Reset Between Test Files)](#option-5d-hybrid-approach-reset-between-test-files)
  - [Comparison Matrix](#comparison-matrix)
  - [Decision Required](#decision-required)
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
  - [Comparison Matrix](#comparison-matrix-1)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---

## 🚨 IMPLEMENTATION ROADMAP - LE PROBLEMA DU JOUR

**Status**: 🔬 Prototyping Complete → 🔧 Implementation Phase

**Solution**: Option 1 (Per-Worker Database Isolation) - **VALIDATED** ✅
- ✅ Prototype successful (947ms startup, 0.18 MB memory)
- ✅ Schema fixes committed (a8b231a)
- 🔧 Ready for implementation

---

### Phase 1: Foundation (COMPLETED ✅)

- [x] **Prototype validation** (Commit: a8b231a)
  - Created 4 worker databases in parallel
  - Measured startup time: 947ms (acceptable!)
  - Measured memory: 0.18 MB (negligible!)
  - Verified data: 45 jobs + 15 email_jobs per database
- [x] **Schema synchronization**
  - Added `extraction_method` column to jobs table
  - Added `source` column to email_jobs table
  - Schema now matches production

### Phase 2: Backend Connection Strategy (COMPLETED ✅)

**Decision**: Option A (Request Header) - **IMPLEMENTED AND TESTED** ✅

**Implementation Details**:
```rust
// Backend - DatabasePools struct holds all pools
struct DatabasePools {
    default_pool: PgPool,
    worker_pools: HashMap<usize, PgPool>,
}

// Backend - WorkerPool extractor reads X-Worker-Index header
impl FromRequest for WorkerPool {
    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        // Read X-Worker-Index header
        // Select worker pool or fallback to default
    }
}

// Playwright fixture (Phase 3 implementation)
page.setExtraHTTPHeaders({
  'X-Worker-Index': testInfo.workerIndex.toString()
});
```

**Test Results** ✅:
- Worker 0-3: All route correctly to `jobhunter_test_worker_{0-3}`
- Invalid index (e.g., 99): Falls back to default database
- No header: Uses default database (jobhunter_personal)
- Backend startup: "Worker databases: 4 connected"

**Tasks**:
- [x] Decide on backend connection strategy (Option A selected)
- [x] Implement backend database connection logic
- [x] Test backend connection with worker databases
- [x] Verify routing works for all workers (0-3)
- [x] Verify fallback to default database
- [x] Commit implementation (382ca73)

### Phase 3: Playwright Worker Fixture (COMPLETED ✅)

**File**: `frontend/e2e/fixtures/worker-database.ts` ✅ **CREATED**

**Tasks**:
- [x] Create worker-scoped fixture
- [x] Implement database creation/seeding per worker
- [x] Implement database cleanup on worker teardown
- [x] Configure backend connection (X-Worker-Index header)
- [x] Test with sample E2E tests (3 tests created)

**Test Results** ✅:
- **Test file**: `frontend/e2e/tests/99-worker-database-fixture-test.spec.ts`
- **Tests**: 13 passed in 23.3 seconds
- **Workers**: 2 and 3 (automatic assignment)
- **Database lifecycle**: Successfully created and cleaned up per worker
- **Console output verification**:
  - `[Worker 2] Creating database: jobhunter_test_worker_2`
  - `[Worker 3] Creating database: jobhunter_test_worker_3`
  - `[Worker 2] ✅ Database dropped: jobhunter_test_worker_2`
  - `[Worker 3] ✅ Database dropped: jobhunter_test_worker_3`

**Implementation Details**:
```typescript
export const test = base.extend<{}, WorkerFixtures>({
  workerDatabase: [async ({ }, use, workerInfo) => {
    const workerIndex = workerInfo.workerIndex;
    const dbName = `jobhunter_test_worker_${workerIndex}`;

    // Setup: Create and seed worker database
    await createWorkerDatabase(workerIndex);

    // Provide database name to tests
    await use(dbName);

    // Teardown: Drop worker database
    await dropWorkerDatabase(workerIndex);
  }, { scope: 'worker' }],
});

// Extended page fixture with automatic X-Worker-Index header
export const testWithPage = test.extend<{ page: Page }>({
  page: async ({ page, workerDatabase }, use, workerInfo) => {
    await page.setExtraHTTPHeaders({
      'X-Worker-Index': workerInfo.workerIndex.toString()
    });
    await use(page);
  },
});
```

**Commit**: fe7d650

### Phase 4: Full Rollout (PENDING)

**Tasks**:
- [ ] Update `playwright.config.ts` to use new fixture
- [ ] Remove global-setup database seeding (replaced by per-worker)
- [ ] Test with full E2E suite (567 tests, 4 workers)
- [ ] Verify all tests pass with isolation
- [ ] Monitor test execution time (should stay <15 min)

### Phase 5: Cleanup (PENDING)

**Tasks**:
- [ ] Remove serial mode from `03-job-status-updates.spec.ts`
- [ ] Remove `chromium-isolated` project workaround
- [ ] Remove serial mode from any other tests using it
- [ ] Update `PLAYWRIGHT_BEST_PRACTICES.md` with new pattern
- [ ] Archive prototype script (or move to helper-scripts/)

---

### Key Questions to Track

1. **Database Naming**: `jobhunter_test_worker_{0-3}` ✅ (decided)
2. **Backend Connection**: Request header vs per-worker backend? 🔧 (needs decision)
3. **Seed Data Location**: Reuse `database/seed_test_data.sql`? ✅ (yes)
4. **Worker Assignment**: Automatic via Playwright? ✅ (yes, no manual mapping needed)
5. **Database Lifecycle**: Create on worker start, destroy on worker end? 🔧 (needs validation)
6. **OAuth Credentials**: How to handle per-worker? 🔧 (needs investigation)

---

## Remaining Challenge: Intra-Worker Test Isolation

**Status**: 🟡 **OPEN FOR DISCUSSION** - Architectural concern identified after Phase 3 completion

### What We've Solved (Inter-Worker Conflicts)

**Before Phase 3**:
```
Worker 0 ──┐
Worker 1 ──┼──> jobhunter_personal (SHARED DATABASE)
Worker 2 ──┤    ❌ Race conditions, conflicts between workers
Worker 3 ──┘
```

**After Phase 3** ✅:
```
Worker 0 ──> jobhunter_test_worker_0 ✅ Isolated from other workers
Worker 1 ──> jobhunter_test_worker_1 ✅ Isolated from other workers
Worker 2 ──> jobhunter_test_worker_2 ✅ Isolated from other workers
Worker 3 ──> jobhunter_test_worker_3 ✅ Isolated from other workers
```

### What Remains Unsolved (Intra-Worker Conflicts)

**Within Worker 0** (~142 tests running sequentially):
```
Test 1: Approve a job       → Database now has 1 fewer "new" job
Test 2: Expects 10 "new"    → ❌ FAILS (only sees 9)
Test 3: Creates 5 new jobs  → Database now has 14 "new" jobs
Test 4: Expects 10 "new"    → ❌ FAILS (sees 14)
```

**The Problem**:
- Tests within the same worker **share database state sequentially**
- Test A's exit conditions become Test B's entry conditions
- With 567 tests across 4 workers: **~142 tests per worker** run sequentially on the same database
- Each test can modify state (approve jobs, sync Gmail, create records, etc.)
- No automatic cleanup between tests
- **Test assignment within a worker is fairly arbitrary** (Playwright decides based on file order, timing, etc.)

**User Observation**: "I got the distinct feeling that we're not done with this issue, particularly if the tests running on a given worker database are fairly arbitrary."

### Proposed Solutions for Intra-Worker Isolation

#### Option 5A: Per-Test Database Reset (Thorough but Slow)

```typescript
test.beforeEach(async ({ workerDatabase }) => {
  // Truncate all tables
  await exec(`psql -d ${workerDatabase} -c "TRUNCATE TABLE jobs, email_jobs CASCADE"`);

  // Reseed test data
  await exec(`psql -d ${workerDatabase} -f database/seed_test_data.sql`);
});
```

**Pros**:
- Perfect isolation - clean entry conditions for every test
- No test order dependencies within a worker
- Guarantees test independence

**Cons**:
- ~500ms overhead per test
- ~142 tests per worker × 500ms = ~71 seconds per worker
- Tests run in parallel across workers, so total overhead ~71s (not 284s)
- Still faster than old single-DB approach, but noticeable slowdown

**Implementation Effort**: 1 day
**Maintenance**: Low - simple pattern

---

#### Option 5B: Transaction Rollback per Test (Fast but Complex)

```typescript
test.beforeEach(async () => {
  await backend.beginTransaction();
});

test.afterEach(async () => {
  await backend.rollbackTransaction();
});
```

**Pros**:
- Very fast (no I/O for cleanup)
- Perfect isolation
- No runtime overhead

**Cons**:
- **Requires major backend refactoring** (must support long-lived transactions across HTTP requests)
- Complex transaction management across process boundaries
- Backend currently commits after each request (architectural change needed)

**Implementation Effort**: 5-7 days (significant backend changes)
**Maintenance**: High - complex transaction management logic

---

#### Option 5C: Accept Partial Isolation (Pragmatic)

- Keep per-worker databases (solves inter-worker conflicts) ✅
- Use `test.describe.configure({ mode: 'serial' })` for test files that heavily modify state
- Document entry/exit conditions for critical tests
- Reset database between test **files** (not individual tests) if needed

**Pros**:
- Works today with Phase 3 implementation
- Good balance of performance and isolation
- 75% problem solved (inter-worker conflicts eliminated)
- Flexible - can add per-file resets where needed

**Cons**:
- Not perfect - tests within a worker may affect each other
- Requires discipline and documentation
- Some flakiness risk remains (lower than before)

**Implementation Effort**: 0 days (use what we have)
**Maintenance**: Medium - requires test design awareness

---

#### Option 5D: Hybrid Approach (Reset Between Test Files)

```typescript
// In each test file's afterAll
test.afterAll(async ({ workerDatabase }) => {
  // Reset database after this file's tests complete
  await exec(`psql -d ${workerDatabase} -c "TRUNCATE TABLE jobs CASCADE"`);
  await exec(`psql -d ${workerDatabase} -f database/seed_test_data.sql`);
});
```

**Pros**:
- Less frequent resets (only ~30-40 test files vs 567 individual tests)
- Predictable state within a test file's lifecycle
- Lower overhead than per-test reset (~30-40 resets × 500ms = ~15-20s total)
- Tests within a file can be designed to work together

**Cons**:
- Tests within a file still share state sequentially
- Requires coordination within test files

**Implementation Effort**: 2-3 days (add afterAll hooks to test files)
**Maintenance**: Medium - per-file awareness needed

---

### Comparison Matrix

| Criterion | 5A: Per-Test Reset | 5B: Transactions | 5C: Pragmatic | 5D: Per-File Reset |
|-----------|-------------------|------------------|---------------|-------------------|
| **Isolation Quality** | ⭐⭐⭐⭐⭐ Perfect | ⭐⭐⭐⭐⭐ Perfect | ⭐⭐⭐ Moderate | ⭐⭐⭐⭐ Good |
| **Speed** | ⭐⭐⭐ +71s overhead | ⭐⭐⭐⭐⭐ Fast | ⭐⭐⭐⭐⭐ No overhead | ⭐⭐⭐⭐ +15-20s |
| **Complexity** | ⭐⭐⭐⭐⭐ Simple | ⭐ Very complex | ⭐⭐⭐⭐⭐ Simple | ⭐⭐⭐⭐ Simple |
| **Backend Changes** | ⭐⭐⭐⭐⭐ None | ⭐ Major refactor | ⭐⭐⭐⭐⭐ None | ⭐⭐⭐⭐⭐ None |
| **Implementation** | 1 day | 5-7 days | 0 days | 2-3 days |
| **Maintenance** | ⭐⭐⭐⭐⭐ Low | ⭐ High | ⭐⭐⭐ Medium | ⭐⭐⭐ Medium |

### Decision Required

**Question for stakeholder**: How much intra-worker isolation do you want?

1. **Strict isolation** (Option 5A): Every test gets fresh database (+71s runtime)
2. **Fast isolation** (Option 5B): Transactions (requires major backend refactor)
3. **Pragmatic** (Option 5C): Per-worker isolation only, manage dependencies (current state after Phase 3)
4. **Balanced** (Option 5D): Per-file resets (+15-20s runtime)

**Note**: This decision doesn't block Phase 4 rollout. We can deploy Phase 3's per-worker isolation and evaluate whether additional intra-worker isolation is needed based on actual test behavior.

---

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
