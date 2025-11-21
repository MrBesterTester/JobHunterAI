---
id: ISSUE-062
title: Comprehensive timeout audit - ensure all test timeouts are load-aware
status: open
priority: high
severity: high
component: testing
created: 2025-11-20
updated: 2025-11-20
affects:
  - E2E test suite reliability
  - Comprehensive test runs
  - Test orchestrator
  - Backend test timeouts
related:
  - ISSUE-056
---

# ISSUE-062: Comprehensive timeout audit - ensure all test timeouts are load-aware

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Discovery Context](#discovery-context)
- [Audit Findings](#audit-findings)
  - [1. Playwright Config Timeouts](#1-playwright-config-timeouts)
  - [2. E2E Helper Timeouts](#2-e2e-helper-timeouts)
  - [3. E2E Individual Test Timeouts](#3-e2e-individual-test-timeouts)
    - [Test-Specific Timeouts (20 instances):](#test-specific-timeouts-20-instances)
    - [Hardcoded Waits (100+ instances):](#hardcoded-waits-100-instances)
  - [4. Test Orchestrator Timeouts](#4-test-orchestrator-timeouts)
  - [5. Backend Rust Timeouts](#5-backend-rust-timeouts)
    - [HTTP Client Timeouts:](#http-client-timeouts)
    - [Async Operation Timeouts:](#async-operation-timeouts)
    - [Backend Test Timeouts:](#backend-test-timeouts)
  - [6. Frontend Jest Test Timeouts](#6-frontend-jest-test-timeouts)
- [Summary Statistics](#summary-statistics)
- [Root Cause](#root-cause)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Make All E2E Test Timeouts Load-Aware (RECOMMENDED)](#option-1-make-all-e2e-test-timeouts-load-aware-recommended)
  - [Option 2: Increase All Timeouts Unconditionally](#option-2-increase-all-timeouts-unconditionally)
  - [Option 3: Accept Current State](#option-3-accept-current-state)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

After fixing ISSUE-056 (env var propagation), discovered that **3 separate Playwright timeout configurations** needed load-aware fixes:
1. `actionTimeout` (10s → 60s)
2. `navigationTimeout` (30s → 60s)
3. Per-test `timeout` (30s → 90s)

This pattern suggests **many more timeouts throughout the codebase are NOT load-aware** and may cause failures under comprehensive test load (4 parallel workers). Comprehensive audit reveals **140+ timeout configurations**, with only **14% being load-aware**.

## Impact

**Who/What is affected:**
- **E2E test reliability**: 120+ timeouts in E2E tests ignore load, causing intermittent failures under comprehensive test runs
- **Test orchestrator**: Backend health check has fixed 30s timeout (may be too short)
- **Backend tests**: All HTTP client and async operation timeouts are static
- **Developer productivity**: Flaky tests waste time, reduce confidence in test suite

**Severity:**
- **High** - Systematic issue affecting test reliability
- Discovered 3 timeout issues in ISSUE-056, likely more exist
- Only 5 out of 36 audited timeouts (14%) are load-aware
- 100+ hardcoded waits (`page.waitForTimeout()`) are anti-pattern

**Frequency:**
- Comprehensive test runs (4 parallel workers) trigger these issues
- Individual test runs may pass while comprehensive runs fail
- Creates false negatives and developer confusion

## Discovery Context

**ISSUE-056 Investigation Timeline:**
1. Initially thought env var wasn't propagating to Playwright workers
2. Implemented dotenv solution - tests still failed
3. Found `actionTimeout: 10s` was overriding explicit timeout parameters
4. Fixed actionTimeout/navigationTimeout - tests still failed
5. Found per-test `timeout: 30s` was too short
6. **Realization:** If we found 3 timeout issues, there are likely more

**User Request:** "I'm concerned that there are others yet to be discovered and fixed. Please do a complete audit of all timeouts."

## Audit Findings

### 1. Playwright Config Timeouts

**File**: `frontend/playwright.config.ts`

| Line | Setting | Current Value | What It Controls | Load-Aware? |
|------|---------|---------------|------------------|-----------|
| 45 | `timeout` | 90s (comp) / 30s (normal) | Per-test max time | ✅ YES |
| 48 | `globalTimeout` | 20 min (static) | Entire suite max time | ❌ NO |
| 76 | `actionTimeout` | 60s (comp) / 10s (normal) | Per-action timeout | ✅ YES |
| 80 | `navigationTimeout` | 60s (comp) / 30s (normal) | Page navigation | ✅ YES |
| 133 | `webServer.timeout` | 120s (static) | Dev server startup | ❌ NO |

**Status**: 3/5 load-aware (60%)

**Potential Issues**:
- `webServer.timeout` (120s) might be too short if dev server builds slowly under load
- `globalTimeout` (20 min) is static - reasonable for current suite size but doesn't scale

### 2. E2E Helper Timeouts

**File**: `frontend/e2e/helpers/tab-navigation.ts`

| Line | Setting | Current Value | What It Controls | Load-Aware? |
|------|---------|---------------|------------------|-----------|
| 42 | `baseTimeout` | 15s (comp) / 5s (normal) | Tab switch wait | ✅ YES |
| 43 | `jobCardsTimeout` | 45s (comp) / 10s (normal) | Job card render wait | ✅ YES |

**Status**: 2/2 load-aware (100%) ✅

**Analysis**: Excellent implementation - properly scales for parallel worker load

### 3. E2E Individual Test Timeouts

**Pattern**: `test.setTimeout(N)` calls in `frontend/e2e/tests/*.spec.ts`

#### Test-Specific Timeouts (20 instances):

| File | Line | Value | Reason | Load-Aware? |
|------|------|-------|--------|----------|
| 04-content-generation.spec.ts | 98, 1022, 1055 | 60-120s | LLM generation | ❌ NO |
| 04-content-generation-integration.spec.ts | 102 | 120s | Two generations | ❌ NO |
| 02-tab-navigation.spec.ts | 130, 326 | 60s | Tab navigation | ❌ NO |
| 10-performance.spec.ts | 141 | 90s | LLM ~55s + overhead | ❌ NO |
| 16-microsoft-email-integration.spec.ts | 295, 403, 508, 560, 721, 792 | 60-180s | LLM + sync | ❌ NO |
| 22-refresh-buttons.spec.ts | 64 | 180s | Long refresh | ❌ NO |
| 23-description-quality.spec.ts | 178 | 180s | Quality checks | ❌ NO |
| 28-rapidapi-sync-integration.spec.ts | 68, 210, 305, 369, 442 | 90-120s | Long sync | ❌ NO |

**Status**: 0/20 load-aware (0%) ❌

**Critical Issue**: All `test.setTimeout()` calls use hardcoded values, don't check `COMPREHENSIVE_TESTS`

#### Hardcoded Waits (100+ instances):

| File | Occurrence Count | Pattern | Value Range | Issue |
|------|-----------------|---------|-------------|-------|
| 15-intake-tab.spec.ts | 14 | `page.waitForTimeout()` | 500-2000ms | Anti-pattern |
| 25-refilter-jobs.spec.ts | 12 | `page.waitForTimeout()` | 100-5000ms | Anti-pattern |
| 16-microsoft-email-integration.spec.ts | 30+ | `waitForTimeout()` + others | 500-45000ms | Anti-pattern |
| 20-gmail-send-integration.spec.ts | 15 | `page.waitForTimeout()` | 500-2000ms | Anti-pattern |
| 13-follow-ups-management.spec.ts | 17 | `page.waitForTimeout()` | 1000-2000ms | Anti-pattern |
| Many others | Many | `waitForSelector()` | 5000-10000ms | Static values |

**Status**: 0/100+ load-aware (0%) ❌

**Critical Anti-Pattern**: Using `page.waitForTimeout()` instead of proper state polling (`waitForFunction`, `waitForSelector` with conditions)

### 4. Test Orchestrator Timeouts

**File**: `src/test-orchestrator/orchestrator.ts`

| Line | Timeout | Value | What It Controls | Load-Aware? |
|------|---------|-------|------------------|-----------|
| 668-670 | Health check attempts | 30 attempts × 1s | Backend startup (30s total) | ❌ NO |

**Status**: 0/1 load-aware (0%) ❌

**Potential Issue**: 30-second backend health check might timeout under heavy load or slow Cargo builds

### 5. Backend Rust Timeouts

#### HTTP Client Timeouts:

| File | Line | Setting | Value | What It Controls | Load-Aware? |
|------|------|---------|-------|------------------|-----------|
| src/llm.rs | 116, 121 | `client.timeout()` | 60s | LLM API calls | ❌ NO |
| src/main.rs | 2900 | `client.timeout()` | 30s | HTML-to-text service | ❌ NO |
| src/main.rs | 6077 | `client.timeout()` | 30s | Claude API extraction | ❌ NO |

#### Async Operation Timeouts:

| File | Line | Value | What It Controls | Load-Aware? |
|------|------|-------|------------------|-----------|
| src/main.rs | 4272-4273 | 45s | Microsoft email extraction | ❌ NO |

#### Backend Test Timeouts:

| File | Line | Value | What It Controls | Load-Aware? |
|------|------|-------|------------------|-----------|
| tests/llm_integration_tests.rs | 142, 212, 303, 348, 442 | 30s | Test HTTP requests | ❌ NO |

**Status**: 0/9 load-aware (0%) ❌

**Analysis**: All backend timeouts are static - reasonable for current usage but don't scale with load

### 6. Frontend Jest Test Timeouts

**Status**: No explicit Jest timeout configurations found
- Tests rely on default Jest timeout (5000ms)
- E2E tests use Playwright's `test.setTimeout()` instead

## Summary Statistics

| Category | Count | Load-Aware | % Load-Aware | Range |
|----------|-------|-----------|-------------|-------|
| Playwright Config | 5 | 3/5 | 60% | 10s-20min |
| E2E Helpers | 2 | 2/2 | 100% ✅ | 5-45s |
| E2E Test Settings | 20 | 0/20 | 0% ❌ | 60-180s |
| E2E Hardcoded Waits | 100+ | 0/100 | 0% ❌ | 100-45000ms |
| Test Orchestrator | 1 | 0/1 | 0% ❌ | 30s |
| Backend HTTP Clients | 4 | 0/4 | 0% ❌ | 30-60s |
| Backend Async Ops | 1 | 0/1 | 0% ❌ | 45s |
| Backend Tests | 5 | 0/5 | 0% ❌ | 30s |
| **TOTAL** | **138+** | **5/138** | **3.6%** ❌ | **100ms-20min** |

**Key Finding**: Only 5 out of 138+ timeouts (3.6%) are load-aware!

## Root Cause

**Systematic Issue**: Timeout configurations added over time without considering comprehensive test load (4 parallel workers)

**Contributing Factors**:
1. **No established pattern** - Different developers used different approaches
2. **No guidelines** - No documented standard for when/how to make timeouts load-aware
3. **Works in isolation** - Tests pass when run individually, fail under comprehensive load
4. **Anti-pattern usage** - 100+ instances of `page.waitForTimeout()` instead of proper state polling
5. **Incremental discovery** - ISSUE-056 revealed 3 timeout issues, suggesting more exist

## Proposed Solutions

### Option 1: Make All E2E Test Timeouts Load-Aware (RECOMMENDED)

**Description**: Systematically update all E2E test timeouts to check `COMPREHENSIVE_TESTS` env var

**Implementation**:

```typescript
// Create helper in e2e/helpers/timeout-utils.ts
export function getTestTimeout(baseTimeout: number): number {
  return process.env.COMPREHENSIVE_TESTS ? baseTimeout * 1.5 : baseTimeout;
}

// Usage in tests:
test.setTimeout(getTestTimeout(60000)); // 60s → 90s under load
await page.waitForSelector('[data-testid="foo"]', {
  timeout: getTestTimeout(5000) // 5s → 7.5s under load
});
```

**Pros**:
- ✅ Systematic fix for all E2E timeouts
- ✅ Consistent pattern across all tests
- ✅ Tests adapt to load automatically
- ✅ Eliminates false negatives under comprehensive test load
- ✅ Centralizes timeout logic (easy to adjust multiplier)

**Cons**:
- ⚠️ Requires updating 20+ test files
- ⚠️ Still allows hardcoded waits (doesn't fix anti-pattern)

**Implementation Effort**: 3-4 hours
- Create timeout utility helper (30 min)
- Update 20 test.setTimeout() calls (1.5 hours)
- Update waitForSelector/waitForFunction timeouts (1.5 hours)
- Test verification (30 min)

**Maintenance**: Low - centralized helper makes future adjustments easy

### Option 2: Increase All Timeouts Unconditionally

**Description**: Increase all static timeouts by 1.5-2x to accommodate comprehensive test load

**Pros**:
- ✅ Simple - just change numbers
- ✅ No conditional logic needed

**Cons**:
- ❌ Slower feedback for individual test runs
- ❌ Hides performance issues (tests take longer than necessary)
- ❌ Doesn't scale with future load increases
- ❌ Still allows anti-pattern (hardcoded waits)

**Implementation Effort**: 2 hours

**Maintenance**: None

### Option 3: Accept Current State

**Description**: Document known issues, accept occasional failures under comprehensive test load

**Pros**:
- ✅ No work required
- ✅ Tests work fine in isolation

**Cons**:
- ❌ Comprehensive test runs unreliable
- ❌ False negatives waste developer time
- ❌ Reduces confidence in test suite
- ❌ Will continue discovering timeout issues incrementally

**Implementation Effort**: 0 hours

**Maintenance**: High - ongoing firefighting of timeout issues

## Decision

**Recommended: Option 1 (Make All E2E Test Timeouts Load-Aware)**

**Rationale**:
1. **Systematic solution** - Addresses root cause, not symptoms
2. **Future-proof** - Scales with load increases
3. **Consistent pattern** - Easy for developers to follow
4. **Fast individual tests** - Doesn't slow down single-test runs
5. **Reliable comprehensive runs** - Eliminates false negatives

**Additional Work Needed**:
- Replace `page.waitForTimeout()` with proper state polling (separate issue/refactor)
- Document timeout guidelines in testing best practices
- Consider extending orchestrator backend health check timeout

## Implementation

**Phase 1: Create Timeout Utility Helper** ✅
```typescript
// File: frontend/e2e/helpers/timeout-utils.ts
export function getTestTimeout(baseTimeout: number): number {
  const multiplier = process.env.COMPREHENSIVE_TESTS ? 1.5 : 1.0;
  return Math.floor(baseTimeout * multiplier);
}
```

**Phase 2: Update test.setTimeout() Calls** (20 instances)
- 04-content-generation.spec.ts (3 calls)
- 04-content-generation-integration.spec.ts (1 call)
- 02-tab-navigation.spec.ts (2 calls)
- 10-performance.spec.ts (1 call)
- 16-microsoft-email-integration.spec.ts (6 calls)
- 22-refresh-buttons.spec.ts (1 call)
- 23-description-quality.spec.ts (1 call)
- 28-rapidapi-sync-integration.spec.ts (5 calls)

**Phase 3: Update Explicit Timeout Parameters**
- waitForSelector timeouts
- waitForFunction timeouts
- Any other explicit timeout: options

**Phase 4: Update Test Orchestrator**
- Extend backend health check from 30s → 45s under COMPREHENSIVE_TESTS

**Phase 5: Documentation**
- Add timeout guidelines to `docs/PLAYWRIGHT_BEST_PRACTICES.md`
- Document getTestTimeout() usage in test helper docs

## Testing

**Test Commands:**
```bash
# Verify individual tests still run fast
cd frontend && npx playwright test e2e/tests/04-content-generation.spec.ts
# Should complete in ~2 minutes (not slower than before)

# Verify comprehensive tests use extended timeouts
./helper-scripts/run-comprehensive-tests.sh --e2e-only --skip-builds
# Should have 0 timeout-related failures

# Check specific timeout values during run (add temp logging to helper)
grep "timeout" test-results/*.txt
```

**Verification:**
- [ ] Individual test runs don't slow down (use base timeouts)
- [ ] Comprehensive test runs use extended timeouts (1.5x multiplier)
- [ ] All 20 test.setTimeout() calls updated
- [ ] No timeout-related failures in comprehensive run
- [ ] Backend health check timeout extended to 45s

## Status History

- 2025-11-20: ISSUE created during ISSUE-056 investigation
- 2025-11-20: Comprehensive audit completed - found 138+ timeouts, only 3.6% load-aware
- 2025-11-20: Option 1 (systematic load-aware timeouts) recommended

## Notes

**Key Insight from ISSUE-056**:
> "If we found 3 different timeout configurations that needed fixing, there are likely more hidden issues"

This proved correct - audit found 133+ additional timeouts that aren't load-aware.

**Anti-Pattern to Address Separately**:
100+ instances of `page.waitForTimeout()` should be replaced with proper state polling:
- Bad: `await page.waitForTimeout(2000)` (arbitrary wait)
- Good: `await page.waitForFunction(() => condition)` (wait for actual condition)

This is a separate refactoring effort beyond load-awareness.

**Backend Timeouts**:
Backend timeouts (HTTP clients, async ops) are currently static but reasonable:
- LLM calls: 60s (adequate for Claude API)
- Email extraction: 45s per email (reasonable)
- HTTP requests: 30s (standard)

No immediate need to make these load-aware unless failures occur.

**Future Scalability**:
If test suite grows significantly (400+ tests → 1000+ tests), may need:
- Increase `globalTimeout` (currently 20 min)
- Increase timeout multiplier from 1.5x to 2.0x
- Consider test sharding across multiple machines

## Related Files

**Playwright Config**:
- `frontend/playwright.config.ts:45` - Per-test timeout (✅ load-aware)
- `frontend/playwright.config.ts:48` - Global timeout (❌ static)
- `frontend/playwright.config.ts:76` - Action timeout (✅ load-aware)
- `frontend/playwright.config.ts:80` - Navigation timeout (✅ load-aware)
- `frontend/playwright.config.ts:133` - Web server timeout (❌ static)

**E2E Helpers**:
- `frontend/e2e/helpers/tab-navigation.ts:42-43` - Load-aware timeouts (✅ good example)

**E2E Tests** (test.setTimeout calls):
- `frontend/e2e/tests/04-content-generation.spec.ts:98,1022,1055`
- `frontend/e2e/tests/04-content-generation-integration.spec.ts:102`
- `frontend/e2e/tests/02-tab-navigation.spec.ts:130,326`
- `frontend/e2e/tests/10-performance.spec.ts:141`
- `frontend/e2e/tests/16-microsoft-email-integration.spec.ts:295,403,508,560,721,792`
- `frontend/e2e/tests/22-refresh-buttons.spec.ts:64`
- `frontend/e2e/tests/23-description-quality.spec.ts:178`
- `frontend/e2e/tests/28-rapidapi-sync-integration.spec.ts:68,210,305,369,442`

**Test Orchestrator**:
- `src/test-orchestrator/orchestrator.ts:668-684` - Backend health check timeout

**Backend Timeouts**:
- `backend/src/llm.rs:116,121` - LLM API client timeout
- `backend/src/main.rs:2900,6077` - HTTP client timeouts
- `backend/src/main.rs:4272-4273` - Email extraction async timeout
- `backend/tests/llm_integration_tests.rs:142,212,303,348,442` - Test HTTP timeouts
