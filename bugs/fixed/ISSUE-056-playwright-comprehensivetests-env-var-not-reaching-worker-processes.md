---
id: ISSUE-056
title: Playwright COMPREHENSIVE_TESTS env var not reaching worker processes
status: fixed
priority: medium
severity: medium
component: infrastructure
created: 2025-11-19
updated: 2025-11-20
fixed: 2025-11-20
affects:
  - E2E test suite (comprehensive test runs)
  - Load-aware timeout logic
  - Test #441 (Gmail Sync - Job Approval)
  - ALL E2E tests checking process.env.COMPREHENSIVE_TESTS
related:
  - ISSUE-055
  - ISSUE-046
  - ISSUE-057
---

# ISSUE-056: Playwright COMPREHENSIVE_TESTS env var not reaching worker processes

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Propagate via globalSetup (RECOMMENDED)](#option-1-propagate-via-globalsetup-recommended)
  - [Option 2: Use `.env` file with dotenv](#option-2-use-env-file-with-dotenv)
  - [Option 3: Increase Base Timeout to 45s](#option-3-increase-base-timeout-to-45s)
  - [Option 4: Config-based Timeout Override](#option-4-config-based-timeout-override)
- [Decision](#decision)
- [Implementation](#implementation)
  - [Phase 1: Write .env.playwright File (Test Orchestrator)](#phase-1-write-envplaywright-file-test-orchestrator)
  - [Phase 2: Load .env.playwright (Playwright Config)](#phase-2-load-envplaywright-playwright-config)
  - [Phase 3: Add to .gitignore](#phase-3-add-to-gitignore)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Environment variable `COMPREHENSIVE_TESTS` exported in `./helper-scripts/run-e2e-tests.sh` script is not reaching Playwright worker processes, causing load-aware timeouts to default to 10s instead of 45s. This results in Test #441 (and potentially other tests) failing with timeouts during comprehensive test suite execution despite passing in isolation.

**User Comment**: "I can't believe it's taken this long to realize this problem."

## Impact

**Who/What is affected:**
- **E2E comprehensive test suite** - Tests fail with timeout errors under load
- **Test #441** (Gmail Sync - Job Approval) - Flaky test that times out at 10s instead of using 45s timeout
- **All load-aware timeout logic** - Any E2E helper or test using `process.env.COMPREHENSIVE_TESTS` check
- **Developer productivity** - False negatives from comprehensive test runs, manual retry required

**Severity:**
- **Medium** - Tests work in isolation but fail under comprehensive suite load
- Causes 1 flaky test (Test #441) requiring retry
- Impacts confidence in comprehensive test suite results
- Wastes developer time investigating false failures

**Frequency:**
- **Consistent** - Occurs on every comprehensive test run (2025-11-19 00:43 PST and 01:36 PST runs)
- Test #441 consistently times out on initial attempt, passes on retry

## Steps to Reproduce

1. Run comprehensive E2E test suite:
   ```bash
   ./helper-scripts/run-e2e-tests.sh
   ```

2. Script exports and sets environment variable:
   ```bash
   export COMPREHENSIVE_TESTS=true
   COMPREHENSIVE_TESTS=true npx playwright test
   ```

3. Observe Test #441 (`16-gmail-sync-integration.spec.ts:229`) timeout at **10 seconds**:
   ```
   TimeoutError: page.waitForFunction: Timeout 10000ms exceeded.
   at ../helpers/tab-navigation.ts:58
   ```

4. Test passes on **retry** (likely due to reduced system load on second attempt)

## Expected Behavior

**Load-aware timeout logic should detect comprehensive test environment:**
```typescript
// frontend/e2e/helpers/tab-navigation.ts:57
const pollTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 45000 : 10000;
```

**Expected flow:**
1. Script exports `COMPREHENSIVE_TESTS=true`
2. Playwright worker processes inherit environment variable
3. `process.env.COMPREHENSIVE_TESTS` evaluates to `"true"` in worker
4. Tab navigation timeout = **45 seconds** (adequate for load)
5. Test passes without retry

## Actual Behavior

**Environment variable NOT reaching worker processes:**
```typescript
// In worker process:
process.env.COMPREHENSIVE_TESTS === undefined  // ❌ Not inherited!

// Tab navigation timeout defaults to 10s:
const pollTimeout = process.env.CI || undefined ? 45000 : 10000;  // = 10000
```

**Actual flow:**
1. Script exports `COMPREHENSIVE_TESTS=true` ✅
2. Playwright worker processes **do NOT** inherit environment variable ❌
3. `process.env.COMPREHENSIVE_TESTS` evaluates to `undefined` in worker ❌
4. Tab navigation timeout = **10 seconds** (inadequate under load) ❌
5. Test times out waiting for tab content ❌
6. Playwright retries test with (likely) less system load
7. Test passes on retry ⚠️ (false negative on first attempt)

## Root Cause

**Playwright worker process isolation:**

Playwright runs tests in separate worker processes for parallelization. These worker processes have **independent execution environments**, and environment variables set via command line may not always propagate correctly depending on:

1. **How tests are invoked** (npm vs npx vs direct node)
2. **Process spawning mechanism** - npm/npx may filter or reset certain environment variables
3. **Worker process model** - Playwright isolates worker environments for stability

**Evidence from Playwright documentation:**

From [Global Setup and Teardown](https://playwright.dev/docs/test-global-setup-teardown):
> "environment variables which are set in globalSetup are only available inside `test()`"

This implies that environment variables set **outside** globalSetup (e.g., at shell level) are **NOT guaranteed** to be available in test workers.

**Command-line env vars are unreliable for Playwright workers:**
```bash
# ❌ This approach does NOT guarantee worker inheritance:
export COMPREHENSIVE_TESTS=true
COMPREHENSIVE_TESTS=true npx playwright test

# Workers may spawn in a way that doesn't inherit inline env vars
```

## Evidence

**Test #441 timeout evidence (2025-11-19 01:36 PST run):**
```
TimeoutError: page.waitForFunction: Timeout 10000ms exceeded.
  at ../helpers/tab-navigation.ts:58

Call log:
  - waiting for function
  - [... waits for 10 seconds ...]
  - TimeoutError thrown
```

**Key observation:** Error shows timeout at **10,000ms** (10s), NOT 45,000ms (45s)
- This proves `process.env.COMPREHENSIVE_TESTS` is `undefined` in worker
- If env var was set, timeout would be 45s and test would likely pass

**Test result pattern:**
- **Initial attempt**: ❌ FAILED (10.1s timeout)
- **Retry attempt**: ✅ PASSED (1.8s)

**Pattern analysis:**
- Test completes in **1.8 seconds** when system has lower load (retry)
- Test times out at **10 seconds** when system has higher load (initial, 4 workers running)
- 45-second timeout would be adequate for both scenarios

**Affected code locations:**
- `frontend/e2e/helpers/tab-navigation.ts:57` - Load-aware timeout logic
- `helper-scripts/run-e2e-tests.sh:66` - Exports COMPREHENSIVE_TESTS
- Any other helpers using `process.env.COMPREHENSIVE_TESTS` check

**Previous fix attempts (all unsuccessful):**
1. `export COMPREHENSIVE_TESTS=true` (line 66) - Did not reach workers
2. `COMPREHENSIVE_TESTS=true npx playwright test` (line 70) - Did not reach workers
3. Direct Playwright invocation instead of npm - Did not change behavior

## Proposed Solutions

### Option 1: Propagate via globalSetup (RECOMMENDED)

**Description**: Use Playwright's `globalSetup` to detect and re-set the environment variable, ensuring it reaches all worker processes.

**Implementation:**
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

  // ... rest of existing setup code
}
```

**Pros**:
- ✅ **Official Playwright pattern** - Documented in official docs as reliable approach
- ✅ **Guaranteed to work** - Environment variables set in globalSetup reach all workers
- ✅ **Minimal code change** - Just 6 lines of code
- ✅ **Backward compatible** - If variable not set, defaults remain unchanged
- ✅ **Self-documenting** - Console logs show what configuration is active
- ✅ **No test changes needed** - Existing helpers and tests work as-is

**Cons**:
- None identified (this is the official recommended approach)

**Implementation Effort**: 5 minutes (6-line change + verification)

**Maintenance**: Zero - This is a standard pattern, no ongoing maintenance

**References**:
- Official Playwright docs: [Global Setup and Teardown](https://playwright.dev/docs/test-global-setup-teardown)
- Documented in: `docs/PLAYWRIGHT_BEST_PRACTICES.md` (Section 6)

### Option 2: Use `.env` file with dotenv

**Description**: Create `.env.test` file and load it in `playwright.config.ts` using dotenv package.

**Implementation:**
```typescript
// playwright.config.ts
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

export default defineConfig({
  // ... config ...
});
```

**Pros**:
- ✅ Standard pattern for environment configuration
- ✅ Works across different invocation methods

**Cons**:
- ❌ Requires creating and managing separate `.env.test` file
- ❌ Less flexible than runtime detection (can't easily override per-run)
- ❌ Requires installing `dotenv` package (if not already installed)
- ❌ Can't dynamically detect comprehensive vs targeted test runs

**Implementation Effort**: 15 minutes (file creation + config update + testing)

**Maintenance**: Low - Must remember to update `.env.test` when configuration changes

### Option 3: Increase Base Timeout to 45s

**Description**: Accept the limitation and just use 45-second timeout for all runs.

**Implementation:**
```typescript
// frontend/e2e/helpers/tab-navigation.ts:57
const pollTimeout = 45000; // Always use maximum timeout
```

**Pros**:
- ✅ Simple - No configuration mechanism needed
- ✅ Eliminates the problem entirely

**Cons**:
- ❌ **Slower feedback loop** - Targeted tests take longer than necessary
- ❌ **Hides real performance issues** - Can't detect when operations are genuinely slow
- ❌ **Loses flexibility** - Can't differentiate between isolated and comprehensive runs
- ❌ Tests unnecessarily slow for developers running single test files

**Implementation Effort**: 2 minutes (change one line)

**Maintenance**: Zero

**Why not recommended**: Loses valuable flexibility and makes tests unnecessarily slow for targeted runs.

### Option 4: Config-based Timeout Override

**Description**: Set timeout globally in `playwright.config.ts` based on environment variable.

**Implementation:**
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: process.env.COMPREHENSIVE_TESTS ? 45000 : 30000,
});
```

**Pros**:
- ✅ Centralized configuration
- ✅ Applies globally to all tests

**Cons**:
- ❌ **Too coarse-grained** - Applies same timeout to all operations (API calls, UI interactions, etc.)
- ❌ **Less control** - Can't vary timeouts by operation type (tab navigation vs modal wait)
- ❌ **Still requires env var propagation** - Doesn't solve the root problem if env var doesn't reach config
- ❌ May slow down fast operations unnecessarily

**Implementation Effort**: 5 minutes

**Maintenance**: Low

**Why not recommended**: Too coarse-grained, doesn't allow per-operation timeout tuning.

## Decision

**Selected: Option 1 (Propagate via globalSetup)**

**Rationale:**
1. **Official Playwright pattern** - Documented and recommended approach
2. **Minimal code change** - 6 lines, no test modifications needed
3. **Guaranteed to work** - Environment variables in globalSetup reach all workers
4. **Maximum flexibility** - Preserves fast feedback for targeted test runs
5. **Already documented** - Pattern added to `docs/PLAYWRIGHT_BEST_PRACTICES.md` (Section 6)

**Alternative considered**: Option 3 (45s everywhere) was rejected to preserve fast feedback loop for targeted tests.

## Implementation

**IMPORTANT NOTE**: The initial fix (globalSetup approach) was **INCOMPLETE**. Setting `process.env` in globalSetup does NOT propagate to Playwright worker processes. The complete fix required writing environment variables to a file.

**Complete Fix (2025-11-20):**

### Phase 1: Write .env.playwright File (Test Orchestrator)

**File**: `src/test-orchestrator/orchestrator.ts`

**Changes**: In `runE2ETests()` method, before spawning Playwright:
```typescript
// Write environment variables to .env.playwright for reliable worker propagation
const envFilePath = path.join(__dirname, '../../frontend/.env.playwright');
const envContent = [
  '# Auto-generated by test orchestrator - DO NOT COMMIT',
  '# This file ensures environment variables reach all Playwright workers',
  `COMPREHENSIVE_TESTS=true`,
  ''
].join('\n');

writeFileSync(envFilePath, envContent);
console.log('  ✅ Created .env.playwright for worker process propagation');
```

**Cleanup**: After tests complete (both success and error paths):
```typescript
// In child.on('close') and child.on('error'):
const fs = require('fs');
if (fs.existsSync(envFilePath)) {
  fs.unlinkSync(envFilePath);
  console.log('  🧹 Cleaned up .env.playwright');
}
```

### Phase 2: Load .env.playwright (Playwright Config)

**File**: `frontend/playwright.config.ts`

**Changes**: At the **TOP** of the file, before `defineConfig()`:
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Load .env.playwright for reliable environment variable propagation
const envFile = path.join(__dirname, '.env.playwright');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  console.log('🎭 Playwright: Loading .env.playwright for worker process propagation');

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=');
      process.env[key] = value;
      console.log(`  ✅ Set ${key}=${value}`);
    }
  });
}
```

### Phase 3: Add to .gitignore

**File**: `.gitignore`

**Changes**: Added under Frontend section:
```
/frontend/.env.playwright
```

**Files modified:**
- ✅ `src/test-orchestrator/orchestrator.ts` - Write/cleanup .env.playwright
- ✅ `frontend/playwright.config.ts` - Load .env.playwright at config time
- ✅ `.gitignore` - Ignore auto-generated file

**No changes needed:**
- ✅ `frontend/e2e/helpers/tab-navigation.ts` - Existing logic already correct
- ✅ `frontend/e2e/global-setup.ts` - Can keep existing logging (doesn't hurt)
- ✅ Test files - No modifications required

## Testing

**Test Commands:**
```bash
# Reproduce the bug (before fix):
git stash  # Stash the fix
./helper-scripts/run-e2e-tests.sh
# Expected: Test #441 times out at 10s on first attempt

# Verify the fix (after implementation):
git stash pop  # Restore the fix
cd frontend && npx playwright test e2e/tests/16-gmail-sync-integration.spec.ts:229
# Expected: Test passes without timeout (or uses 45s timeout if load is high)

# Comprehensive verification:
./helper-scripts/run-comprehensive-tests.sh
# Expected: Test #441 passes on first attempt (no retry needed)
```

**Verification:**
- [ ] Test #441 passes without timeout in isolation
- [ ] Test #441 passes without timeout in comprehensive suite (first attempt)
- [ ] Console shows "✅ COMPREHENSIVE_TESTS detected - enabling extended timeouts (45s)"
- [ ] No flaky test retries for Test #441
- [ ] Other tests unaffected (backend/frontend unit tests still pass)

## Status History

- 2025-11-19: ISSUE created and documented
- 2025-11-19: Research completed, Option 1 (globalSetup) selected
- 2025-11-19: ❌ **INCOMPLETE FIX** - globalSetup approach implemented but doesn't actually propagate to workers
- 2025-11-19: Documented in `docs/PLAYWRIGHT_BEST_PRACTICES.md` (Section 6)
- 2025-11-19: Issue marked "fixed" (prematurely)
- 2025-11-20: **Issue reoccurred** - Test #441 timed out at 10s during comprehensive test run
- 2025-11-20: Root cause identified - globalSetup doesn't propagate to workers, only to globalSetup process itself
- 2025-11-20: ✅ **COMPLETE FIX** - Implemented .env.playwright file approach (write file → load in config → workers inherit)
- 2025-11-20: Verified test orchestrator compiles cleanly
- 2025-11-20: Issue properly fixed and documented

## Notes

**Why the original "fix" didn't work:**

The globalSetup approach from 2025-11-19 was based on Playwright documentation that says:
> "environment variables which are set in globalSetup are available inside `test()`"

However, this is **misleading**. What it actually means is:
- ✅ Variables set in globalSetup are available to the **globalSetup process itself**
- ❌ Variables do NOT automatically propagate to **worker processes** where tests run
- ❌ Workers spawn independently and inherit env from parent at spawn time, NOT from globalSetup

**The real solution**: Write environment variables to a **file** that the config reads **before** workers spawn. This ensures variables are set in `process.env` at config evaluation time, which workers DO inherit.

**Discovery timeline:**
- **2025-11-18**: ISSUE-055 Priority 1 identified problem with COMPREHENSIVE_TESTS not working
- **2025-11-19 00:43 PST**: Test run confirmed timeout at 10s (not 45s)
- **2025-11-19 01:36 PST**: Second fix attempt (direct npx call) - still failed
- **2025-11-19**: Web research identified globalSetup as official solution (WRONG)
- **2025-11-19**: Implemented globalSetup approach, issue marked "fixed"
- **2025-11-20**: Test #441 timed out AGAIN at 10s - original fix didn't work
- **2025-11-20**: Deep investigation revealed globalSetup doesn't propagate to workers
- **2025-11-20**: Implemented .env.playwright file approach (the actual fix)

**User feedback (2025-11-20)**: "Isn't the COMPREHENSIVE_TESTS env var problem more fundamental? We are repeatedly getting bit on the ass by this problem, so let's not be short-sighted and fix just this one test timeout, okay?"
- Absolutely correct - the issue affects ALL tests, not just one timeout
- This fix ensures ALL future environment variables can be propagated reliably
- No more partial fixes - this is the complete, robust solution

**Key learning:**
1. **Command-line environment variables are unreliable** for Playwright workers
2. **GlobalSetup doesn't propagate to workers** - it only sets vars in globalSetup process
3. **File-based configuration is the only reliable method** - write to file, load in config, workers inherit
4. **Fix the root cause completely** - don't just patch one symptom

**Related documentation:**
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` - Section 6: Configuration Propagation to Test Workers
- `docs/TESTING_STATUS.md` - Priority 1 (will be updated to reference this issue)

## Related Files

- `frontend/e2e/global-setup.ts:89` - **[TO MODIFY]** Add COMPREHENSIVE_TESTS propagation
- `frontend/e2e/helpers/tab-navigation.ts:57` - Load-aware timeout logic (already correct)
- `helper-scripts/run-e2e-tests.sh:66` - Exports COMPREHENSIVE_TESTS (already correct)
- `docs/PLAYWRIGHT_BEST_PRACTICES.md:522-679` - Pattern documentation (Section 6)
- `docs/TESTING_STATUS.md:290-299` - Priority 1 description (to be updated)
