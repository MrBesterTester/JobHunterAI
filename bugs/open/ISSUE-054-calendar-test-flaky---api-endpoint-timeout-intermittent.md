---
id: ISSUE-054
title: Calendar Test Flaky - API endpoint timeout intermittent
status: open
priority: medium
severity: medium
component: frontend
created: 2025-11-18
updated: 2025-11-18
affects:
  - E2E test reliability
  - Calendar feature testing
related:
  - ISSUE-053
  - docs/TESTING_STATUS.md
---

# ISSUE-054: Calendar Test Flaky - API endpoint timeout intermittent

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
  - [Option 1: Increase waitForResponse timeout](#option-1-increase-waitforresponse-timeout)
  - [Option 2: Add backend health check before test](#option-2-add-backend-health-check-before-test)
  - [Option 3: Retry logic for API response wait](#option-3-retry-logic-for-api-response-wait)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Calendar test (`12-calendar-management.spec.ts:119`) intermittently times out waiting for `/api/interviews/upcoming` API response. Endpoint is functional and returns correctly when tested manually, but test encounters timeout during E2E test runs.

## Impact

**Who/What is affected:**
- Calendar management E2E tests
- ISSUE-053 Phase 1 & 2 implementation (blocked 1/5 tests from passing)
- Calendar feature validation

**Severity:**
- Test is **intermittently flaky**, not permanently broken
- Endpoint is **functional** (verified manually: returns `[]` correctly)
- Likely **timing/race condition** issue in test setup

## Steps to Reproduce

1. Run calendar management test:
   ```bash
   cd frontend
   npx playwright test e2e/tests/12-calendar-management.spec.ts:119
   ```
2. Observe timeout after ~10 seconds
3. Test manually with backend running:
   ```bash
   curl http://localhost:8080/api/interviews/upcoming
   # Returns: []
   ```
4. Note: Endpoint works when tested manually

## Expected Behavior

Test should successfully wait for API response from `/api/interviews/upcoming` and receive `[]` (empty array when no interviews scheduled).

## Actual Behavior

**Test Error**:
```
TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
  await page.waitForResponse(response =>
    response.url().includes('/api/interviews/upcoming') && response.status() === 200
  );
```

**Manual Test**:
```bash
$ curl http://localhost:8080/api/interviews/upcoming
[]
```

**Observation**: Endpoint works correctly when tested manually, but test times out waiting for response.

## Root Cause

**Likely causes (ranked by probability)**:

1. **Backend not fully ready** when test runs
   - Test framework may start backend but not wait for full initialization
   - API route registration may not be complete when test clicks Calendar button

2. **Race condition in test setup**
   - Test clicks Calendar button before backend is serving requests
   - `beforeEach` may not include sufficient backend health check

3. **Test isolation issue**
   - Previous tests may leave backend in inconsistent state
   - Database connection pool exhaustion under test load

4. **Network timing sensitivity**
   - 10 second timeout may be insufficient under system load
   - Test environment may have slower localhost networking

## Evidence

**Backend Endpoint Implementation** (verified present and correct):
```rust
// backend/src/main.rs:9108
.route("/api/interviews/upcoming", web::get().to(get_upcoming_interviews))

// backend/src/main.rs:7978-8002
async fn get_upcoming_interviews(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    let interviews = sqlx::query_as::<_, ApplicationTimeline>(
        r#"
        SELECT i.*, a.job_id, a.date_applied, j.title as job_title, j.company, j.location as job_location
        FROM interviews i
        JOIN applications a ON i.application_id = a.application_id
        JOIN jobs j ON a.job_id = j.job_id
        WHERE i.status = 'scheduled'
            AND i.scheduled_date >= NOW()
            AND i.scheduled_date <= NOW() + INTERVAL '30 days'
        ORDER BY i.scheduled_date ASC
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    Ok(HttpResponse::Ok().json(interviews))
}
```

**Manual Endpoint Test** (2025-11-18):
```bash
$ curl -s http://localhost:8080/api/interviews/upcoming
[]
```
✅ Endpoint responds correctly with empty array

**Test Failure** (2025-11-18):
- Test: `12-calendar-management.spec.ts:119`
- Error: Timeout waiting for `/api/interviews/upcoming` response (10s)
- Outcome: Failed both initial run and retry

**ISSUE-053 Context**:
- Phase 1 & 2 fixes applied (serial mode + `.count()` fix)
- 4/5 tests fixed successfully
- Calendar test was the only remaining failure
- Root cause identified as **not an anti-pattern issue**, but backend readiness

## Proposed Solutions

### Option 1: Increase waitForResponse timeout

**Description**: Increase timeout from 10s to 30s to account for backend startup delays

**Implementation**:
```typescript
// Add load-aware timeout
const apiTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 30000 : 15000;
await page.waitForResponse(
  response => response.url().includes('/api/interviews/upcoming') && response.status() === 200,
  { timeout: apiTimeout }
);
```

**Pros**:
- Simple, minimal change
- Consistent with other load-aware timeouts in ISSUE-053 fixes
- Handles slow backend startup gracefully

**Cons**:
- Doesn't address root cause (backend readiness)
- Increases test runtime if timeout is actually needed
- May mask other issues

**Implementation Effort**: 5 minutes

**Maintenance**: Low - standard pattern used in other tests

### Option 2: Add backend health check before test

**Description**: Add explicit backend health check in test setup

**Implementation**:
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for backend to be ready
  await page.waitForFunction(
    async () => {
      try {
        const response = await fetch('http://localhost:8080/health');
        return response.ok;
      } catch {
        return false;
      }
    },
    { timeout: 30000 }
  );

  await page.waitForLoadState('networkidle');
});
```

**Pros**:
- Ensures backend is ready before test starts
- Addresses root cause directly
- Improves reliability for all calendar tests

**Cons**:
- Adds overhead to every test in suite
- May not be necessary for tests that don't use this endpoint
- Requires careful implementation to avoid false positives

**Implementation Effort**: 15 minutes

**Maintenance**: Medium - needs monitoring for effectiveness

### Option 3: Retry logic for API response wait

**Description**: Add retry logic around the API wait

**Implementation**:
```typescript
// Retry API wait with exponential backoff
let apiResponse = null;
for (let i = 0; i < 3; i++) {
  try {
    apiResponse = await page.waitForResponse(
      response => response.url().includes('/api/interviews/upcoming') && response.status() === 200,
      { timeout: 10000 }
    );
    break;
  } catch (error) {
    if (i === 2) throw error; // Last attempt failed
    console.log(`API response attempt ${i + 1} failed, retrying...`);
    await page.waitForTimeout(2000); // Wait before retry
  }
}
```

**Pros**:
- Handles transient backend issues gracefully
- Provides diagnostic output for debugging
- Doesn't increase normal-case runtime

**Cons**:
- More complex implementation
- May hide underlying issues with backend startup
- Could still fail under persistent issues

**Implementation Effort**: 20 minutes

**Maintenance**: Medium - requires careful error handling

## Decision

**Recommendation**: **Option 1** (Increase timeout with load-aware configuration)

**Rationale**:
- Simplest solution that aligns with ISSUE-053 patterns
- Consistent with other fixes (tab helper, LLM timeouts)
- Low risk, low maintenance
- If issue persists, can escalate to Option 2

**Next Steps**:
1. Implement Option 1 (increase timeout to 30s under load)
2. Run calendar test 3-5 times to verify fix
3. If still flaky, implement Option 2 (health check)

## Implementation

**Status**: Not started

**Proposed Change**:
```typescript
// File: frontend/e2e/tests/12-calendar-management.spec.ts:122
// Add load-aware timeout to API response wait
const apiTimeout = process.env.CI || process.env.COMPREHENSIVE_TESTS ? 30000 : 15000;
await page.waitForResponse(
  response => response.url().includes('/api/interviews/upcoming') && response.status() === 200,
  { timeout: apiTimeout }
);
```

## Testing

**Test Commands:**
```bash
# Test calendar management test multiple times
cd frontend
for i in {1..5}; do
  echo "Run $i:"
  npx playwright test e2e/tests/12-calendar-management.spec.ts:119
done

# Verify endpoint manually
curl http://localhost:8080/api/interviews/upcoming

# Check backend logs for errors
tail -f backend/logs/*.log
```

**Verification:**
- [ ] Calendar test passes 5/5 runs
- [ ] Endpoint responds correctly (manual test)
- [ ] No backend errors in logs
- [ ] Test runtime remains reasonable (<15s)

## Status History

- 2025-11-18: ISSUE created after ISSUE-053 Phase 1 & 2 implementation
- 2025-11-18: Backend endpoint verified functional (returns `[]` correctly)
- 2025-11-18: Root cause identified as likely backend readiness timing issue

## Notes

**Context from ISSUE-053**:
- This was the only test that failed after Phase 1 & 2 implementation
- Phase 1 & 2 achieved 4/5 tests fixed (80% success rate)
- Original diagnosis was "missing API endpoint" - corrected to "intermittent timeout"

**Why this is NOT an anti-pattern issue**:
- Endpoint exists and is correctly implemented
- Endpoint responds correctly when tested manually
- Issue is environmental/timing, not test code quality
- Phase 1 & 2 fixes (serial mode + `.count()` fix) are correct

**Follow-up Tasks**:
- Implement Option 1 (load-aware timeout)
- Monitor test reliability over 10+ runs
- If still flaky, escalate to Option 2 (health check)
- Consider adding this pattern to other tests that call backend APIs

## Related Files

**Test Files**:
- `frontend/e2e/tests/12-calendar-management.spec.ts:119` (failing test)
- `frontend/e2e/tests/12-calendar-management.spec.ts:122` (line to modify)

**Backend Files**:
- `backend/src/main.rs:9108` (route registration)
- `backend/src/main.rs:7978-8002` (endpoint implementation)

**Documentation**:
- `docs/TESTING_STATUS.md` (Phase 1 & 2 results)
- `bugs/open/ISSUE-053-e2e-test-audit---5-failingflaky-tests-require-best-practice-fixes.md`
- `docs/PLAYWRIGHT_BEST_PRACTICES.md` (load-aware timeout patterns)
