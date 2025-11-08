---
id: ISSUE-033
title: Six backend tests marked as ignored - need investigation and fixes
status: open
priority: medium
severity: medium
component: backend
created: 2025-11-07
updated: 2025-11-07
affects: []
related: []
---

# ISSUE-033: Six backend tests marked as ignored - need investigation and fixes

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Affected Tests](#affected-tests)
  - [LLM Mock Tests (4 tests)](#llm-mock-tests-4-tests)
  - [Quota Tracking Test (1 test)](#quota-tracking-test-1-test)
  - [Microsoft Configuration Test (1 test)](#microsoft-configuration-test-1-test)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Investigate and Fix Each Test Individually](#option-1-investigate-and-fix-each-test-individually)
  - [Option 2: Remove Mock Tests and Keep Only Real API Tests](#option-2-remove-mock-tests-and-keep-only-real-api-tests)
  - [Option 3: Keep Tests Ignored Temporarily, Create Follow-up Issues](#option-3-keep-tests-ignored-temporarily-create-follow-up-issues)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Six backend tests are currently marked with #[ignore] due to mockito integration issues, quota tracking test isolation, and Microsoft configuration check failures

## Impact

**Who/What is affected:**
- Backend test coverage: 6 out of 170 tests (3.5%) are currently skipped
- Test reliability: Missing coverage for LLM mock interactions, quota tracking, and MS configuration
- CI/CD: Tests are skipped but not verified, reducing confidence in automated testing

**Severity:**
- Medium: Real API tests still pass, but mock tests provide faster feedback and offline testing capability
- Test isolation issues indicate potential race conditions or state leakage between tests

## Affected Tests

### LLM Mock Tests (4 tests)
**Location**: `backend/src/llm.rs`

1. `test_generate_success` - Basic LLM generation with mock server
2. `test_generate_with_system_prompt` - LLM generation with system prompt
3. `test_generate_rate_limit_retry` - Rate limit retry logic
4. `test_generate_empty_content` - Empty content handling

### Quota Tracking Test (1 test)
**Location**: `backend/tests/job_intake_tests.rs:825`

5. `test_rapidapi_quota_tracking` - RapidAPI quota tracking accuracy

### Microsoft Configuration Test (1 test)
**Location**: `backend/tests/microsoft_email_tests.rs:380`

6. `test_microsoft_source_configuration` - Microsoft Graph API configuration validation

## Steps to Reproduce

1. Run backend tests: `cd backend && cargo test`
2. Observe 162 passing tests, 8 ignored (6 are these specific tests)
3. Remove `#[ignore]` from any of the 6 tests
4. Re-run tests and observe failures

## Expected Behavior

All tests should pass without `#[ignore]` attributes, providing full test coverage for:
- LLM mock interactions
- API quota tracking
- Microsoft Graph API configuration

## Actual Behavior

**LLM Mock Tests (4 tests):**
```
Error: MockServer tests failing with `MaxRetriesExceeded(2)` error
Root cause: Mockito integration issues - mock server not responding properly
```

**Quota Tracking Test:**
```
Error: Test expects 10 API calls but gets 8
Root cause: Test isolation problem - state leaking between test runs
```

**Microsoft Configuration Test:**
```
Error: Configuration check test failing
Root cause: Unknown - needs investigation
```

## Root Cause

**LLM Mock Tests:**
- Mockito mock server not responding or timing out
- Possible version compatibility issue with mockito crate
- May need to update mock server configuration or retry logic

**Quota Tracking Test:**
- Test isolation failure: previous test runs affecting quota counts
- Missing cleanup between tests or race condition
- Need to investigate serial test execution order

**Microsoft Configuration Test:**
- Needs investigation - test failure details not yet analyzed

## Evidence

**Test output showing ignored tests:**
```bash
test result: ok. 162 passed; 0 failed; 8 ignored; 0 measured; 0 filtered out
```

**Ignored test markers in code:**
```rust
// backend/src/llm.rs
#[tokio::test]
#[ignore] // TODO: Fix mockito integration - see ISSUE-033
async fn test_generate_success() { ... }

// backend/tests/job_intake_tests.rs:825
#[tokio::test]
#[serial]
#[ignore] // TODO: Fix quota tracking count mismatch - see ISSUE-033
async fn test_rapidapi_quota_tracking() { ... }

// backend/tests/microsoft_email_tests.rs:380
#[tokio::test]
#[serial]
#[ignore] // TODO: Fix Microsoft Graph API configuration check - see ISSUE-033
async fn test_microsoft_source_configuration() { ... }
```

## Proposed Solutions

### Option 1: Investigate and Fix Each Test Individually

**Description**: Debug each failing test to understand the root cause and fix properly

**Approach**:
1. **LLM Mock Tests**: Update mockito integration, check version compatibility, fix mock server configuration
2. **Quota Tracking Test**: Add proper test cleanup, investigate serial test order, fix state isolation
3. **Microsoft Configuration Test**: Run test individually with verbose output to identify failure reason

**Pros**:
- Proper fixes that restore full test coverage
- Identifies and fixes underlying issues
- Improves test reliability overall

**Cons**:
- Time-consuming investigation required for each test
- May uncover additional issues requiring fixes
- Requires understanding mockito and test isolation patterns

**Implementation Effort**: 4-6 hours

**Maintenance**: Low - tests will be stable once fixed

### Option 2: Remove Mock Tests and Keep Only Real API Tests

**Description**: Delete the 4 LLM mock tests and rely only on real API tests

**Approach**:
1. Remove LLM mock tests entirely from `backend/src/llm.rs`
2. Keep real API tests for coverage
3. Fix the 2 other ignored tests (quota tracking, MS configuration)

**Pros**:
- Faster solution for LLM mock tests
- Real API tests provide better end-to-end validation
- Reduces maintenance burden of keeping mocks in sync

**Cons**:
- Loses fast offline testing capability
- Increases test runtime (real API calls are slower)
- Loses mock-specific test scenarios (rate limiting, error conditions)
- Still need to fix the 2 other ignored tests

**Implementation Effort**: 2-3 hours

**Maintenance**: Low for LLM tests, but lose mock testing benefits

### Option 3: Keep Tests Ignored Temporarily, Create Follow-up Issues

**Description**: Document tests as technical debt and fix later when higher priority work is complete

**Approach**:
1. Keep `#[ignore]` attributes in place
2. Update TODO comments with ISSUE-033 reference
3. Create subtasks for each test category
4. Fix when bandwidth allows

**Pros**:
- Zero time investment now
- Allows focus on higher priority work (e.g., fixing 17 frontend tests)
- Tests are documented and tracked

**Cons**:
- Test coverage gap remains
- Technical debt accumulates
- May be forgotten if not tracked properly
- Reduces confidence in automated testing

**Implementation Effort**: 0 hours (already done)

**Maintenance**: None until later fix

## Decision

**Recommendation**: Option 1 (Investigate and Fix Each Test Individually)

**Rationale**:
- Mock tests provide fast feedback and offline testing
- Test isolation issues may indicate larger problems
- 4-6 hours is manageable investment for proper test coverage
- Aligns with zero-warning, high-quality test standards

**Alternative**: If time-constrained, Option 3 (temporary) followed by Option 1 when bandwidth allows

## Implementation

Not yet started - awaiting decision

## Testing

**Test Commands:**
```bash
# Reproduce the issue
cd backend
cargo test --lib test_generate_success -- --ignored --nocapture
cargo test --test job_intake_tests test_rapidapi_quota_tracking -- --ignored --nocapture
cargo test --test microsoft_email_tests test_microsoft_source_configuration -- --ignored --nocapture

# Verify the fix (after removing #[ignore])
cd backend
cargo test test_generate_success
cargo test test_generate_with_system_prompt
cargo test test_generate_rate_limit_retry
cargo test test_generate_empty_content
cargo test test_rapidapi_quota_tracking
cargo test test_microsoft_source_configuration

# Full test suite validation
cd backend
cargo test
# Should show: test result: ok. 168 passed; 0 failed; 2 ignored
```

**Verification:**
- [ ] All 4 LLM mock tests pass without #[ignore]
- [ ] Quota tracking test passes without #[ignore]
- [ ] Microsoft configuration test passes without #[ignore]
- [ ] No new test failures introduced
- [ ] Full backend test suite passes with 168 tests (up from 162)

## Status History

- 2025-11-07: ISSUE-033 created and documented with full analysis

## Notes

**Priority Consideration:**
This issue has medium priority because:
- Real API tests still provide coverage for LLM functionality
- Frontend has 17 failing tests that may be higher priority
- Test infrastructure improvements were just completed
- Can be addressed in next test quality improvement cycle

**Related Work:**
- Test infrastructure improvements completed (separate test runner scripts)
- TESTING_STATUS.md updated with current state
- Consider addressing this issue after frontend test fixes are complete

## Related Files

**LLM Mock Tests:**
- `backend/src/llm.rs:3412` - get_microsoft_user_email function (dead code warning fixed)
- `backend/src/llm.rs` - test_generate_success, test_generate_with_system_prompt, test_generate_rate_limit_retry, test_generate_empty_content

**Quota Tracking Test:**
- `backend/tests/job_intake_tests.rs:825` - test_rapidapi_quota_tracking

**Microsoft Configuration Test:**
- `backend/tests/microsoft_email_tests.rs:380` - test_microsoft_source_configuration

**Test Infrastructure:**
- `helper-scripts/run-backend-tests.sh` - Standalone backend test runner
