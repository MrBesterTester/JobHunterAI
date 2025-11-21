# Playwright Best Practices for E2E Testing

**Battle-tested guidance from JobHunter project + Official Playwright recommendations**

This document consolidates hard-earned lessons from fixing flaky E2E tests in the JobHunter project, validated against official Playwright documentation. These patterns have been proven through fixing 10+ flaky tests and achieving 99%+ pass rates in comprehensive test suites.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [1. Locator Strategies: When to Use What](#1-locator-strategies-when-to-use-what)
  - [Priority Hierarchy (Official Playwright Guidance)](#priority-hierarchy-official-playwright-guidance)
  - [When to Use `data-testid` Attributes](#when-to-use-data-testid-attributes)
  - [Battle-Tested Pattern: Stable Locators for Dynamic Lists](#battle-tested-pattern-stable-locators-for-dynamic-lists)
- [2. Test Isolation and Serial Execution](#2-test-isolation-and-serial-execution)
  - [When to Use Serial Mode](#when-to-use-serial-mode)
  - [Serial Mode Syntax](#serial-mode-syntax)
  - [Battle-Tested Pattern: Database State Isolation](#battle-tested-pattern-database-state-isolation)
- [3. State Synchronization: Polling vs Fixed Timeouts](#3-state-synchronization-polling-vs-fixed-timeouts)
  - [The Anti-Pattern: Fixed Timeouts](#the-anti-pattern-fixed-timeouts)
  - [The Solution: State Polling with `page.waitForFunction()`](#the-solution-state-polling-with-pagewaitforfunction)
  - [Battle-Tested Pattern: Waiting for Stat Updates](#battle-tested-pattern-waiting-for-stat-updates)
- [4. Performance Testing and Load-Aware Assertions](#4-performance-testing-and-load-aware-assertions)
  - [The Problem: Context-Dependent Performance](#the-problem-context-dependent-performance)
  - [The Solution: Load-Aware Thresholds](#the-solution-load-aware-thresholds)
  - [Best Practices for Performance Tests](#best-practices-for-performance-tests)
- [5. Auto-Waiting and Actionability](#5-auto-waiting-and-actionability)
  - [What Playwright Auto-Waits For](#what-playwright-auto-waits-for)
  - [Web-First Assertions (Recommended)](#web-first-assertions-recommended)
  - [Anti-Pattern: Manual Assertions](#anti-pattern-manual-assertions)
- [6. Configuration Propagation to Test Workers](#6-configuration-propagation-to-test-workers)
  - [The Problem: Environment Variables Not Reaching Workers](#the-problem-environment-variables-not-reaching-workers)
  - [The Solution: Propagate Configuration via globalSetup](#the-solution-propagate-configuration-via-globalsetup)
  - [Battle-Tested Pattern: Load-Aware Timeouts](#battle-tested-pattern-load-aware-timeouts)
  - [Load-Aware Test Timeout Helper (ISSUE-062)](#load-aware-test-timeout-helper-issue-062)
  - [Multi-Level Timeout Architecture (ISSUE-063)](#multi-level-timeout-architecture-issue-063)
  - [Alternative Approaches (For Reference)](#alternative-approaches-for-reference)
- [7. Common Anti-Patterns and How to Fix Them](#7-common-anti-patterns-and-how-to-fix-them)
  - [❌ Anti-Pattern 1: Position-Based Selectors](#-anti-pattern-1-position-based-selectors)
  - [❌ Anti-Pattern 2: Fixed Timeouts for State Changes](#-anti-pattern-2-fixed-timeouts-for-state-changes)
  - [❌ Anti-Pattern 3: CSS Class Selectors](#-anti-pattern-3-css-class-selectors)
  - [❌ Anti-Pattern 4: Parallel Tests with Shared Database State](#-anti-pattern-4-parallel-tests-with-shared-database-state)
  - [❌ Anti-Pattern 5: Testing Implementation Details](#-anti-pattern-5-testing-implementation-details)
- [8. Quick Reference: Decision Trees](#8-quick-reference-decision-trees)
  - [How Should I Pass Configuration to Tests?](#how-should-i-pass-configuration-to-tests)
  - [Which Locator Should I Use?](#which-locator-should-i-use)
  - [Should I Use Serial Mode?](#should-i-use-serial-mode)
  - [Should I Use a Fixed Timeout?](#should-i-use-a-fixed-timeout)
- [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---

## 1. Locator Strategies: When to Use What

### Priority Hierarchy (Official Playwright Guidance)

Playwright recommends this hierarchy for locator selection:

**1. Role-based locators (HIGHEST PRIORITY)**
```typescript
// ✅ Best: Reflects how users perceive the page
page.getByRole('button', { name: 'Submit' })
page.getByRole('textbox', { name: 'Username' })
```

**2. Text-based locators**
```typescript
// ✅ Good: User-facing text
page.getByText('Welcome back')
page.getByLabel('Email address')
page.getByPlaceholder('Enter your name')
```

**3. Test ID locators**
```typescript
// ✅ Acceptable: Explicit test contract
page.getByTestId('submit-button')
```

**4. CSS/XPath selectors (AVOID)**
```typescript
// ❌ Brittle: Breaks with DOM changes
page.locator('.btn-primary')
page.locator('//div[@class="container"]/button')
```

**Why this matters:** Role and text locators are resilient to UI refactoring. CSS classes change with design updates. DOM structure changes with refactoring. **User-facing attributes remain stable.**

### When to Use `data-testid` Attributes

Use `data-testid` when:
- Multiple similar elements exist (e.g., multiple "Sync Now" buttons for different services)
- Role/text locators are ambiguous or fragile
- You need an explicit test contract that survives refactoring
- Implementing organization-wide test ID methodology

**Real Example from JobHunter (Commit 2485e934):**

**Problem:** Multiple "Sync Now" buttons (Gmail, Microsoft, LinkedIn, RapidAPI)
```typescript
// ❌ BEFORE: Fragile - depends on render order
const syncButton = page.getByRole('button', { name: /Sync Now/i }).first();
```

**Solution:** Add explicit test IDs to all buttons
```typescript
// ✅ AFTER: Robust and self-documenting
const gmailSyncButton = page.getByTestId('gmail-sync-button');
const microsoftSyncButton = page.getByTestId('microsoft-sync-button');
```

**Application code:**
```tsx
// IntakeTab.tsx
<button data-testid="gmail-sync-button" onClick={handleGmailSync}>
  Sync Now
</button>
<button data-testid="microsoft-sync-button" onClick={handleMicrosoftSync}>
  Sync Now
</button>
```

**Benefits:**
- ✅ Independent of render order
- ✅ Self-documenting (clear which button is which)
- ✅ Easy to extend for other tests
- ✅ No risk of testing wrong button

### Battle-Tested Pattern: Stable Locators for Dynamic Lists

**Problem:** Job list re-sorts after data loads, breaking position-based selectors.

**Real Example from JobHunter (Commit 4a6c0a35):**

```typescript
// ❌ BEFORE: Breaks when list re-sorts
const jobCard = page.locator('[data-testid="job-card"]').first();
const jobId = await jobCard.locator('[data-testid="job-id-badge"]').textContent();

// Later: .first() now points to DIFFERENT job after re-sort
await jobCard.click(); // ❌ Wrong job!
```

**Solution:** Capture stable identifier, create filtered locator
```typescript
// ✅ AFTER: Stable reference to specific job
const firstJobCard = page.locator('[data-testid="job-card"]').first();
const jobIdText = await firstJobCard.locator('[data-testid="job-id-badge"]').textContent();

// Create locator that filters by exact job ID (stable even if list re-sorts)
const stableJobCard = page.locator('[data-testid="job-card"]').filter({
  has: page.locator('[data-testid="job-id-badge"]', { hasText: jobIdText || '' })
});

// Now operations work on the SAME job regardless of position
await stableJobCard.click(); // ✅ Correct job!
```

**Key Insight:** Capture identifying information early, then use it to create a stable locator that survives list re-ordering.

---

## 2. Test Isolation and Serial Execution

### When to Use Serial Mode

**Official Guidance:** "Using serial is not recommended. It is usually better to make your tests isolated."

**However, use serial mode when:**
- Tests modify shared database state (e.g., approval/rejection workflows)
- Tests have genuine dependencies requiring strict ordering
- Resource contention causes flakiness under parallel load
- Database connection pool saturation occurs

**Real Examples from JobHunter:**

**1. Job Status Updates (03-job-status-updates.spec.ts)**
```typescript
// Approval/rejection tests modify shared database state
test.describe.serial('Section 5: Approve/Reject Workflow Test', () => {
  test('should move job from Inbox to Approved when approved', async ({ page }) => {
    // Modifies database: status = 'approved'
  });

  test('should move job from Inbox to Rejected when rejected', async ({ page }) => {
    // Modifies database: status = 'rejected'
  });
});
```

**2. Gmail Sync Integration (16-gmail-sync-integration.spec.ts)**
```typescript
// Gmail tests share test data pool and modify counts
test.describe('Gmail Sync Integration', () => {
  test.describe.configure({ mode: 'serial' });

  test('should sync jobs from Gmail', async ({ page }) => {
    // Consumes test data from shared pool
  });

  test('should allow approving jobs synced from Gmail', async ({ page }) => {
    // Depends on data from previous test
  });
});
```

### Serial Mode Syntax

**Two syntaxes are supported:**

```typescript
// Option 1: describe.serial() - shorthand
test.describe.serial('Test Suite Name', () => {
  // Tests run serially
});

// Option 2: describe.configure() - explicit
test.describe('Test Suite Name', () => {
  test.describe.configure({ mode: 'serial' });

  // Tests run serially
});
```

**Note:** Commit 185a6e90 corrected usage from non-existent `test.describe.serial()` to proper `.configure({ mode: 'serial' })` syntax.

### Battle-Tested Pattern: Database State Isolation

**Problem:** 4 parallel workers racing to modify shared database state.

**From ISSUE-046 Root Cause Analysis:**
```
Test reads stale stats:
- Worker 1: Approves job, expects count = 6
- Worker 2: Also approves job concurrently
- Worker 1: Reads count = 7 (modified by Worker 2)
- Test fails: Expected 6, got 7
```

**Solution Options (in priority order):**

**1. Serial Execution (Fast Fix)**
```typescript
test.describe.serial('Tests Requiring Isolation', () => {
  // Tests run sequentially, no race conditions
});
```

**2. Per-Worker Data Pools (Better Long-Term)**
```typescript
// Seed dedicated data for each worker using workerIndex
test.beforeAll(async ({ }, testInfo) => {
  const workerIndex = testInfo.workerIndex;
  await seedTestData(`test-data-worker-${workerIndex}`);
});

// Tests only query their worker's data pool
await page.goto(`/?source=test-data-worker-${workerIndex}`);
```

**3. Database Transaction Isolation (Ideal but Complex)**
```typescript
test.beforeAll(async () => {
  await db.query('BEGIN TRANSACTION');
  await seedTestData();
});

test.afterAll(async () => {
  await db.query('ROLLBACK'); // Perfect isolation
});
```

---

## 3. State Synchronization: Polling vs Fixed Timeouts

### The Anti-Pattern: Fixed Timeouts

**❌ DON'T DO THIS:**
```typescript
await firstJob.approve();
await page.waitForTimeout(1500); // ❌ Arbitrary wait
const newCount = await dashboardPage.getStatCount('approved');
```

**Why this is bad:**
- Works in isolation (low load) but fails under comprehensive test load
- No guarantee state has actually changed
- Either too short (flaky) or too long (slow tests)
- Hides real timing issues

### The Solution: State Polling with `page.waitForFunction()`

**✅ DO THIS INSTEAD:**
```typescript
await firstJob.approve();

// Wait for actual state change by polling DOM
await page.waitForFunction(
  (expectedCount) => {
    const statElement = document.querySelector('[data-testid="stat-approved"]');
    const match = statElement?.textContent?.match(/\d+/);
    return match && parseInt(match[0]) >= expectedCount;
  },
  initialApprovedCount + 1,
  { timeout: 10000 }
);

const newCount = await dashboardPage.getStatCount('approved');
```

**Why this is better:**
- Waits for **actual** state change, not arbitrary time
- Works under any system load
- Fails fast if state never changes
- Self-documenting (clear what condition we're waiting for)

### Battle-Tested Pattern: Waiting for Stat Updates

**Real Example from JobHunter (Commit abb1620e - ISSUE-046 Resolution):**

**Problem:** Statistics update tests failed in comprehensive suite (5 flaky tests), passed in isolation.

**Root Cause:** Fixed 1500ms timeout inadequate under parallel test load.

**Solution:** Replace all fixed timeouts with state polling (4 locations updated).

```typescript
// Location 1: After job approval (line 122)
await firstJob.approve();

// ❌ BEFORE
await page.waitForTimeout(1500);

// ✅ AFTER: Poll for exact expected values
await page.waitForFunction(
  ({ expectedNew, expectedApproved }) => {
    const newStatElement = document.querySelector('[data-testid="stat-new"]');
    const approvedStatElement = document.querySelector('[data-testid="stat-approved"]');

    const newMatch = newStatElement?.textContent?.match(/(\d+)/);
    const approvedMatch = approvedStatElement?.textContent?.match(/(\d+)/);

    const currentNew = newMatch ? parseInt(newMatch[1], 10) : -1;
    const currentApproved = approvedMatch ? parseInt(approvedMatch[1], 10) : -1;

    return currentNew === expectedNew && currentApproved === expectedApproved;
  },
  { expectedNew: initialNewCount - 1, expectedApproved: initialApprovedCount + 1 },
  { timeout: 10000 }
);

// Verify statistics updated
const newNewCount = await dashboardPage.getStatCount('new');
const newApprovedCount = await dashboardPage.getStatCount('approved');
```

**Results:**
- ✅ 15/15 tests passing (3 consecutive runs)
- ✅ No retries needed
- ✅ Works under both low and high load
- ✅ ~1.6 minute runtime (consistent)

**Key Pattern Elements:**
1. **Direct DOM querying** - `document.querySelector('[data-testid="stat-*"]')`
2. **Pattern matching** - Extract numbers using regex
3. **Exact value checking** - Compare actual vs expected
4. **Adequate timeout** - 10 seconds (works under any load)
5. **Boolean return** - Only returns `true` when exact state reached

---

## 4. Performance Testing and Load-Aware Assertions

### The Problem: Context-Dependent Performance

Performance varies significantly based on execution context:
- **Isolation**: Single test, low system load, fast response times
- **Comprehensive suite**: 4 workers, high CPU/memory usage, slower response times

**Fixed thresholds break under load:**
```typescript
// ❌ BEFORE: Works in isolation, fails in comprehensive suite
expect(duration).toBeLessThan(10000); // <10s
```

### The Solution: Load-Aware Thresholds

**✅ Detect execution context and adjust expectations:**
```typescript
// Detect if running in comprehensive suite (CI or with multiple workers)
const isUnderLoad = process.env.CI || process.env.TEST_PARALLEL_INDEX !== undefined;
const maxDuration = isUnderLoad ? 20000 : 10000;

expect(duration).toBeLessThan(maxDuration);
```

**Real Example from JobHunter (Commit abb1620e, line 410):**
```typescript
test('should track request/response cycle for status updates', async ({ page }) => {
  const startTime = Date.now();

  await firstJob.approve();
  await waitForApiCall(page, 'status-update');

  const duration = Date.now() - startTime;

  // ❌ BEFORE: Fixed 10s threshold
  // expect(duration).toBeLessThan(10000);

  // ✅ AFTER: Load-aware threshold
  // Comprehensive suite: <20s (accounts for resource contention)
  // Isolation: <10s (normal performance expectation)
  const isUnderLoad = process.env.CI || process.env.TEST_PARALLEL_INDEX !== undefined;
  const maxDuration = isUnderLoad ? 20000 : 10000;

  expect(duration).toBeLessThan(maxDuration);
});
```

### Best Practices for Performance Tests

**1. Measure Web Vitals, Not Arbitrary Thresholds**
```typescript
// ✅ Use standard Web Vitals metrics
const metrics = await page.evaluate(() => ({
  fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
  lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
  ttfb: performance.timing.responseStart - performance.timing.requestStart,
}));

expect(metrics.lcp).toBeLessThan(2500); // Standard LCP threshold
```

**2. Use Serial Execution for Performance Tests**
```typescript
// Performance tests are sensitive to resource contention
test.describe.serial('Performance Tests', () => {
  // Ensure consistent system load across runs
});
```

**3. Run Performance Tests Separately**
```typescript
// playwright.config.ts
{
  name: 'performance',
  testMatch: '**/performance/**',
  fullyParallel: false, // Serial execution
  workers: 1, // Single worker for consistent results
}
```

**4. Consider Disabling Performance Tests in Comprehensive Suites**

From JobHunter experience (commit 67fe1869):
```typescript
// Frontend/e2e/test-config.ts
export const shouldRunTest = (testName: string): boolean => {
  return {
    'performance': false, // Disabled - infrastructure not ready
    'job-status-updates': true,
    // ...
  }[testName] ?? true;
};
```

**Why:** Performance tests require dedicated infrastructure and controlled load. Better to run separately than cause flakiness in main suite.

---

## 5. Auto-Waiting and Actionability

### What Playwright Auto-Waits For

Playwright automatically performs actionability checks before actions:

**All actions check:**
- ✅ **Visible** - Element has non-empty bounding box, not `visibility:hidden`
- ✅ **Stable** - Element position consistent across two animation frames
- ✅ **Receives Events** - Element is hit target (not obscured by overlay)

**`click()` additionally checks:**
- ✅ **Enabled** - Not disabled via `[disabled]` or `aria-disabled`

**`fill()` additionally checks:**
- ✅ **Editable** - Enabled and not readonly

**Key insight:** You rarely need explicit waits. Playwright handles it automatically.

### Web-First Assertions (Recommended)

**✅ Use auto-retrying assertions:**
```typescript
// Waits and retries until condition is met
await expect(page.getByText('welcome')).toBeVisible();
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
await expect(page.locator('[data-testid="count"]')).toHaveText('5');
```

**Behavior:**
- Retries assertion every 100ms
- Waits up to `timeout` (default: 5s)
- Passes as soon as condition is met
- Fails if timeout exceeded

### Anti-Pattern: Manual Assertions

**❌ DON'T DO THIS:**
```typescript
// No waiting - immediate check, likely to fail
expect(await page.getByText('welcome').isVisible()).toBe(true);
```

**Why this is bad:**
- `isVisible()` returns immediately without waiting
- Fails if element hasn't rendered yet
- No retry mechanism
- Creates flaky tests

**✅ DO THIS INSTEAD:**
```typescript
// Auto-retrying assertion with built-in waiting
await expect(page.getByText('welcome')).toBeVisible();
```

---

## 6. Configuration Propagation to Test Workers

### The Problem: Environment Variables Not Reaching Workers

Playwright runs tests in separate worker processes for parallelization. These worker processes have independent environments, and **environment variables set via command line may not always propagate correctly** to test code running inside workers.

**Symptoms:**
- Tests work in globalSetup but fail in test functions
- `process.env.VARIABLE_NAME` returns `undefined` in tests despite being set
- Load-aware timeouts default to shorter values even when environment variable is exported
- Feature flags or configuration not being respected in tests

**Real Example from JobHunter (ISSUE-055 Priority 1):**

```typescript
// In tab-navigation.ts helper (called from tests)
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;
```

**Problem observed:**
```bash
# Script exports environment variable
export COMPREHENSIVE_TESTS=true
COMPREHENSIVE_TESTS=true npx playwright test

# But in worker process:
# process.env.COMPREHENSIVE_TESTS === undefined ❌
# Timeout defaults to 10s instead of 45s
# Result: Test times out and fails under load
```

**Why this happens:**
- Playwright workers spawn as separate OS processes
- Environment variable inheritance can be inconsistent depending on how tests are invoked
- npm/npx process spawning may filter or reset certain environment variables
- Worker process model isolates execution environments for stability

### The Solution: Propagate Configuration via globalSetup

**Official Playwright guidance:** Environment variables set in `globalSetup` **ARE guaranteed** to be available in all test worker processes.

**✅ Recommended Pattern:**

```typescript
// frontend/e2e/global-setup.ts
async function globalSetup() {
  console.log('🧪 Setting up test environment...');

  // Detect and propagate environment variables to workers
  if (process.env.COMPREHENSIVE_TESTS) {
    console.log('✅ COMPREHENSIVE_TESTS detected - enabling extended timeouts (45s)');
    // Explicitly set in globalSetup to ensure worker processes inherit it
    process.env.COMPREHENSIVE_TESTS = 'true';
  } else {
    console.log('ℹ️  COMPREHENSIVE_TESTS not set - using default timeouts (10s)');
  }

  // ... rest of setup code
}

export default globalSetup;
```

**Why this works:**
- ✅ Environment variables set in `globalSetup` are **guaranteed** by Playwright to reach all workers
- ✅ Works regardless of how tests are invoked (npm, npx, direct)
- ✅ Minimal code change (just detect and re-set the variable)
- ✅ Backward compatible (if variable not set, defaults remain)
- ✅ Self-documenting (logs show what configuration is active)

**Using the configuration in tests:**

```typescript
// frontend/e2e/helpers/tab-navigation.ts
export async function switchToTab(page: Page, tab: TabType) {
  // ... tab switching logic ...

  // Load-aware timeout automatically uses propagated env var
  const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="job-card"]').length > 0,
    { timeout: pollTimeout }
  );
}
```

### Battle-Tested Pattern: Load-Aware Timeouts

**Use Case:** Different timeout thresholds for isolated tests vs comprehensive suite execution.

**Problem:** Tests pass in isolation (10s timeout adequate) but fail under comprehensive test load (need 45s timeout).

**Solution:** Environment variable-based configuration with globalSetup propagation.

```typescript
// Step 1: Set environment variable in test runner script
// helper-scripts/run-e2e-tests.sh
export COMPREHENSIVE_TESTS=true
COMPREHENSIVE_TESTS=true npx playwright test

// Step 2: Propagate via globalSetup
// frontend/e2e/global-setup.ts
async function globalSetup() {
  if (process.env.COMPREHENSIVE_TESTS) {
    process.env.COMPREHENSIVE_TESTS = 'true'; // Ensure workers inherit
  }
}

// Step 3: Use in helpers and tests
// frontend/e2e/helpers/tab-navigation.ts
const pollTimeout = process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;
```

**Benefits:**
- ✅ Eliminates false negatives (tests failing due to insufficient timeout under load)
- ✅ Keeps fast feedback loop for targeted test runs (10s timeout in isolation)
- ✅ Adapts to system load automatically
- ✅ Single source of truth for configuration

**Key Insight:** Don't rely on command-line environment variables reaching workers. Always propagate configuration explicitly via globalSetup.

### Load-Aware Test Timeout Helper (ISSUE-062)

**Use Case:** Systematically apply load-aware timeouts to all test.setTimeout() calls and explicit timeout parameters.

**Problem:** With 138+ timeout configurations throughout the test suite, only 5 (3.6%) were load-aware. Tests would pass individually but fail under comprehensive test load (4 parallel workers).

**Solution:** Centralized timeout utility that automatically scales timeouts under load.

```typescript
// frontend/e2e/helpers/timeout-utils.ts
export function getTestTimeout(baseTimeout: number): number {
  const isComprehensiveTests = process.env.COMPREHENSIVE_TESTS === 'true';
  const multiplier = isComprehensiveTests ? 1.5 : 1.0;
  return Math.floor(baseTimeout * multiplier);
}
```

**Usage in tests:**

```typescript
import { getTestTimeout } from '../helpers/timeout-utils';

// Test-level timeout
test('should complete LLM generation', async ({ page }) => {
  test.setTimeout(getTestTimeout(60000)); // 60s → 90s under comprehensive load
  // ... test logic
});

// Explicit timeout parameters
await page.waitForSelector('[data-testid="job-card"]', {
  timeout: getTestTimeout(5000) // 5s → 7.5s under comprehensive load
});

await page.waitForFunction(
  () => document.querySelectorAll('.job').length > 0,
  { timeout: getTestTimeout(10000) } // 10s → 15s under comprehensive load
);
```

**Benefits:**
- ✅ Centralized timeout logic (easy to adjust multiplier)
- ✅ Consistent pattern across all tests
- ✅ Tests adapt to load automatically
- ✅ Eliminates false negatives under comprehensive test load
- ✅ Fast feedback loop for individual test runs (no unnecessary delays)
- ✅ Self-documenting (comment shows base → scaled timeout)

**Multiplier Rationale:**
- **1.5x multiplier** chosen based on empirical data from ISSUE-056 investigation
- Comprehensive test runs with 4 parallel workers showed operations taking 1.3-1.8x longer
- 1.5x provides safety margin without excessive conservatism
- Adjust multiplier if test suite grows significantly (e.g., 400+ → 1000+ tests)

**When to Use:**
- ✅ All `test.setTimeout()` calls (20+ updated in ISSUE-062)
- ✅ Explicit timeout parameters in `waitForSelector`, `waitForFunction`, etc.
- ✅ Any timeout configuration that depends on system performance
- ❌ **Don't use** for timeouts that are business logic constraints (e.g., "LLM must respond within 30s")

**Important:** Still prefer state polling (`waitForFunction`) over fixed timeouts whenever possible. `getTestTimeout()` is for cases where explicit timeouts are necessary (test timeouts, API call timeouts, etc.).

### Multi-Level Timeout Architecture (ISSUE-063)

**Understanding:** Timeouts exist at multiple levels in E2E test code, and each level operates independently. A timeout at one level can occur even if higher-level timeouts haven't been reached.

**Timeout Hierarchy:**

1. **Test-level timeout** - Playwright's `test.setTimeout()` controls maximum test execution time
2. **Helper-level timeout** - Internal waits within helper functions (e.g., `switchToTab` helper's `jobCardsTimeout`)
3. **Action-level timeout** - Individual Playwright action timeouts (e.g., `waitForSelector({ timeout: N })`)

**Critical Point:** A helper can timeout even if the overall test still has time remaining!

**Real Example from ISSUE-063:**

```typescript
// Test file: 16-gmail-sync-integration.spec.ts
test('should allow approving jobs', async ({ page }) => {
  test.setTimeout(getTestTimeout(90000)); // Test timeout: 90s under load

  // Call helper function
  await switchToTab(page, 'new'); // ❌ Times out at 45s!

  // Test still has 45s remaining, but helper already failed
});

// Helper file: tab-navigation.ts
export async function switchToTab(page: Page, tab: TabType) {
  // Helper timeout: 45s under load (line 43)
  const jobCardsTimeout = process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;

  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="job-card"]').length > 0,
    { timeout: jobCardsTimeout } // ⏰ Helper times out at 45s
  );
}
```

**What Happened:**
- Test timeout: 90s (plenty of time remaining)
- Helper timeout: 45s
- Actual operation time: 61s under comprehensive load
- **Result:** Helper times out at 45s before test timeout would occur at 90s

**Debugging Strategy - Identify Which Level is Timing Out:**

When you see a timeout error, determine which level caused it:

```
TimeoutError: page.waitForFunction: Timeout 45000ms exceeded.
    at switchToTab (/path/to/tab-navigation.ts:64:18)
    at /path/to/16-gmail-sync-integration.spec.ts:232:5
```

**Analysis:**
- ❌ Not test-level (test.setTimeout would show test timeout value, e.g., 90000ms)
- ✅ Helper-level (stack trace shows timeout occurred inside `switchToTab` at line 64)
- Duration matches helper's `jobCardsTimeout` (45000ms)

**Solutions by Level:**

**Option 1: Increase helper timeout globally** (affects all tests using the helper)
```typescript
// frontend/e2e/helpers/tab-navigation.ts
const jobCardsTimeout = process.env.COMPREHENSIVE_TESTS ? 90000 : 10000; // 45s → 90s
```
**Pros:** Simple, consistent across all tests
**Cons:** Affects all ~72+ tests using this helper, slower failure feedback

**Option 2: Add optional timeout parameter** (surgical fix)
```typescript
// Helper signature with optional parameter
export async function switchToTab(
  page: Page,
  tab: TabType,
  expectJobCards: boolean = shouldExpectJobCards(tab),
  customTimeout?: number  // Optional override
): Promise<void> {
  const jobCardsTimeout = customTimeout ??
    (process.env.COMPREHENSIVE_TESTS ? 45000 : 10000);
  // ... rest of function
}

// Usage in specific test
await switchToTab(page, 'new', true, getTestTimeout(90000)); // Override for this test only
```
**Pros:** Surgical, explicit, doesn't affect other tests
**Cons:** More complex API, requires updating call sites

**Key Takeaway for Shared Helpers:**

When multiple tests share a helper function, the helper's timeout cannot vary per test (unless you add an optional parameter). Global helper timeouts affect all tests using that helper.

**Best Practices:**

1. **Always check timeout values at all levels** when debugging timeout failures
2. **Look at the actual timeout duration in the error** (e.g., "Timeout 45000ms") to identify which level timed out
3. **Consider the scope of your fix**: Does changing a helper timeout affect many tests? Is that acceptable?
4. **Use optional timeout parameters** when specific tests need different timeouts than the helper's default
5. **Document timeout rationale** in comments (e.g., "// Increased from 45s to 90s - Gmail sync takes 61s under load")

### Alternative Approaches (For Reference)

**Option 2: Use `.env` files with `dotenv`**
```typescript
// playwright.config.ts
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env.test') });
```
**Trade-offs:**
- ✅ Standard pattern for environment configuration
- ❌ Requires managing separate `.env` files
- ❌ Less flexible than runtime detection
- ❌ Can't easily override for different test runs

**Option 3: Playwright config-based timeout**
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: process.env.COMPREHENSIVE_TESTS ? 45000 : 30000,
});
```
**Trade-offs:**
- ✅ Centralized configuration
- ❌ Applies globally to all tests (less granular control)
- ❌ Can't vary timeouts by operation type (tab navigation vs API calls)

**Option 4: Accept the limitation and increase base timeouts**
```typescript
const pollTimeout = 45000; // Always use maximum timeout
```
**Trade-offs:**
- ✅ Simple, no configuration needed
- ❌ Slower feedback loop for targeted tests
- ❌ Hides real performance issues (tests take longer than necessary)

**Recommendation:** Use globalSetup propagation (Option 1) for maximum flexibility and reliability.

---

## 7. Common Anti-Patterns and How to Fix Them

### ❌ Anti-Pattern 1: Position-Based Selectors

**Problem:** List order changes based on dynamic data.

```typescript
// ❌ BREAKS: When list re-sorts
const firstJob = page.locator('[data-testid="job-card"]').first();
```

**✅ Solution:** Use stable identifiers
```typescript
// Capture stable ID
const jobIdText = await page.locator('[data-testid="job-card"]')
  .first()
  .locator('[data-testid="job-id-badge"]')
  .textContent();

// Create stable locator
const stableJob = page.locator('[data-testid="job-card"]').filter({
  has: page.locator('[data-testid="job-id-badge"]', { hasText: jobIdText })
});
```

**From:** Commit 4a6c0a35 - Fixed flaky refresh button test

---

### ❌ Anti-Pattern 2: Fixed Timeouts for State Changes

**Problem:** Arbitrary waits don't guarantee state changes.

```typescript
// ❌ FRAGILE: May be too short or too long
await button.click();
await page.waitForTimeout(1500);
const result = await getResult();
```

**✅ Solution:** Poll for actual state
```typescript
await button.click();
await page.waitForFunction(
  () => document.querySelector('[data-testid="result"]')?.textContent === 'Success',
  { timeout: 10000 }
);
const result = await getResult();
```

**From:** Commit abb1620e - Resolved ISSUE-046 (5 flaky tests)

---

### ❌ Anti-Pattern 3: CSS Class Selectors

**Problem:** CSS classes change with design updates.

```typescript
// ❌ BRITTLE: Breaks with styling changes
await page.locator('.btn-primary.submit-button').click();
```

**✅ Solution:** Use role or test ID
```typescript
// Option 1: Role (best for standard elements)
await page.getByRole('button', { name: 'Submit' }).click();

// Option 2: Test ID (for ambiguous cases)
await page.getByTestId('submit-button').click();
```

**From:** Official Playwright guidance

---

### ❌ Anti-Pattern 4: Parallel Tests with Shared Database State

**Problem:** Race conditions when multiple workers modify same data.

```typescript
// ❌ FLAKY: Workers race to modify shared state
test('should approve job', async ({ page }) => {
  const count = await getApprovedCount(); // e.g., 5
  await approveJob();
  // ❌ Another worker also approved - now count is 7, not 6!
  expect(await getApprovedCount()).toBe(count + 1); // FAILS
});
```

**✅ Solution:** Use serial execution
```typescript
test.describe.serial('Approval Tests', () => {
  test('should approve job', async ({ page }) => {
    // No race conditions - tests run sequentially
  });
});
```

**From:** Commits f458c574, 9f067bfe - Gmail and Tab Navigation fixes

---

### ❌ Anti-Pattern 5: Testing Implementation Details

**Problem:** Tests break when refactoring without functional changes.

```typescript
// ❌ COUPLING: Tests internal implementation
expect(component.state.isLoading).toBe(false);
expect(apiClient.fetchData).toHaveBeenCalledTimes(1);
```

**✅ Solution:** Test user-observable behavior
```typescript
// User sees loading spinner disappear
await expect(page.getByTestId('loading-spinner')).not.toBeVisible();

// User sees data rendered
await expect(page.getByRole('heading', { name: 'Results' })).toBeVisible();
```

**From:** Official Playwright best practices

---

## 8. Quick Reference: Decision Trees

### How Should I Pass Configuration to Tests?

```
START
│
├─ Do I need dynamic configuration based on execution context?
│  (e.g., different timeouts for isolated vs comprehensive suite)
│  └─ YES → Use globalSetup to propagate environment variables
│         ✅ if (process.env.VAR) { process.env.VAR = 'true'; }
│         ✅ Works across all workers guaranteed
│
├─ Do I have static configuration that rarely changes?
│  └─ YES → Use .env file with dotenv
│         ✅ dotenv.config() in playwright.config.ts
│         ⚠️  Requires managing .env files
│
├─ Do I need global timeout adjustment only?
│  └─ YES → Set in playwright.config.ts
│         ✅ timeout: process.env.COMPREHENSIVE_TESTS ? 45000 : 30000
│         ⚠️  Less granular control
│
└─ NEVER rely on command-line env vars alone
   ❌ export VAR=true && npx playwright test  // May not reach workers
   ✅ Use globalSetup to re-set: process.env.VAR = 'true'
```

### Which Locator Should I Use?

```
START
│
├─ Is it a standard HTML element with role? (button, textbox, link, etc.)
│  └─ YES → Use getByRole()
│         ✅ page.getByRole('button', { name: 'Submit' })
│
├─ Is it labeled text input?
│  └─ YES → Use getByLabel()
│         ✅ page.getByLabel('Email address')
│
├─ Is it non-interactive text?
│  └─ YES → Use getByText()
│         ✅ page.getByText('Welcome back')
│
├─ Are there multiple similar elements? (e.g., multiple "Sync" buttons)
│  └─ YES → Add data-testid and use getByTestId()
│         ✅ page.getByTestId('gmail-sync-button')
│
└─ FALLBACK → Add data-testid
             ✅ page.getByTestId('custom-element')
```

### Should I Use Serial Mode?

```
START
│
├─ Do tests modify shared database state?
│  └─ YES → Use serial mode
│         ✅ test.describe.serial()
│
├─ Do tests consume limited test data pool?
│  └─ YES → Use serial mode
│         ✅ test.describe.configure({ mode: 'serial' })
│
├─ Are tests flaky in parallel but pass in isolation?
│  └─ YES → Consider serial mode (or fix root cause)
│         ⚠️ Better: Make tests truly independent
│
└─ NO → Use default parallel execution
       ✅ Better performance
```

### Should I Use a Fixed Timeout?

```
START
│
├─ Are you waiting for a state change? (API response, UI update, etc.)
│  └─ YES → Use waitForFunction() or web-first assertions
│         ✅ await page.waitForFunction(() => condition)
│         ✅ await expect(element).toBeVisible()
│
├─ Are you waiting for an animation to complete?
│  └─ YES → Use waitForFunction() with stable bounding box check
│         ✅ await page.waitForFunction(() => stable condition)
│
├─ Are you testing performance/timing?
│  └─ YES → Measure duration, use load-aware assertions
│         ✅ const duration = Date.now() - start;
│         ✅ expect(duration).toBeLessThan(isUnderLoad ? 20000 : 10000)
│
└─ NEVER use page.waitForTimeout() for state changes
   ❌ await page.waitForTimeout(1500) // ANTI-PATTERN
```

---

## References

**Official Playwright Documentation:**
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locators](https://playwright.dev/docs/locators)
- [Actionability](https://playwright.dev/docs/actionability)
- [Test Parallelism](https://playwright.dev/docs/test-parallel)
- [Global Setup and Teardown](https://playwright.dev/docs/test-global-setup-teardown)
- [page.waitForFunction()](https://playwright.dev/docs/api/class-page#page-wait-for-function)

**JobHunter Project References:**
- ISSUE-046: E2E Test Suite Context-Dependent Flakiness (`bugs/open/ISSUE-046-*.md`)
- ISSUE-055 Priority 1: Environment variable propagation to Playwright workers (2025-11-19)
- Commit 2485e934: Add data-testid attributes to Intake Tab buttons
- Commit 4a6c0a35: Use stable job ID locator instead of position-based selector
- Commit f458c574: Make Gmail tests serial to prevent race conditions
- Commit 9f067bfe: Serialize Tab Navigation tests
- Commit abb1620e: Resolve ISSUE-046 with state polling (5 flaky tests fixed)

**External Resources:**
- [Checkly: Performance Testing with Playwright](https://www.checklyhq.com/docs/learn/playwright/performance/)
- [Web Vitals](https://web.dev/vitals/)
- [Artillery: Load Testing with Playwright](https://www.artillery.io/docs/playwright)

---

**Last Updated:** 2025-11-19

**Document Status:** Living document - update as new patterns emerge from test fixes
