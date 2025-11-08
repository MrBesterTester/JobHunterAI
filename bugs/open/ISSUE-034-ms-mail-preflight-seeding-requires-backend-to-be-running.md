---
id: ISSUE-034
title: MS Mail preflight seeding requires backend to be running
status: open
priority: medium
severity: medium
component: infrastructure
created: 2025-11-07
updated: 2025-11-07
affects: []
related: []
---

# ISSUE-034: MS Mail preflight seeding requires backend to be running

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
  - [Option 1: Seed MS Mail via Graph API Directly (Best)](#option-1-seed-ms-mail-via-graph-api-directly-best)
  - [Option 2: Start Backend Temporarily During Preflight](#option-2-start-backend-temporarily-during-preflight)
  - [Option 3: Move MS Mail Seeding to Test Setup](#option-3-move-ms-mail-seeding-to-test-setup)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

The setup-msmail-state.sh script calls backend API endpoint but preflight checks stop all processes first, creating a chicken-and-egg problem

## Impact

**Who/What is affected:**
- Comprehensive test suite: Cannot run MS Mail preflight checks without manual workaround
- E2E tests: Require `--skip-preflight` flag to run, reducing test reliability
- CI/CD: Automated testing cannot set up MS Mail test state properly

**Severity:**
- Medium: Workaround exists (`--skip-preflight` flag) but requires manual intervention
- Reduces confidence in E2E test results due to skipped preflight validation
- Makes automated test runs more fragile

## Steps to Reproduce

1. Run comprehensive test suite: `./helper-scripts/run-comprehensive-tests.sh`
2. Observe preflight checks run (including `setup-msmail-state.sh`)
3. Script fails at MS Mail seeding step with connection refused error:
   ```
   ✗ Failed to seed test emails
   Response: curl: (7) Failed to connect to localhost port 8080
   ```

## Expected Behavior

Preflight checks should be able to set up MS Mail test state without requiring backend to be running. The seeding script should either:
1. Start backend temporarily during preflight
2. Seed emails directly via MS Graph API without backend
3. Run as part of test setup rather than preflight

## Actual Behavior

**Line 167 of `helper-scripts/setup-msmail-state.sh`:**
```bash
SEED_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/test/seed-msmail")
```

This line calls a backend API endpoint to seed test emails, but:
- Preflight checks run BEFORE starting the backend
- `system-health-check.sh` explicitly stops all jobhunter processes before preflight
- Backend is not available at `localhost:8080` during preflight

**Result**: Chicken-and-egg problem - can't seed MS Mail state without backend, but can't start tests without seeding MS Mail state.

## Root Cause

**Architectural Issue**: Preflight checks are designed to validate system state BEFORE starting application processes, but MS Mail seeding requires the backend API to be running.

**Design Conflict**:
1. `system-health-check.sh` stops all jobhunter processes
2. Preflight checks run (including MS Mail state setup)
3. MS Mail seeding calls backend API endpoint
4. Backend not running → seeding fails
5. Preflight fails → tests cannot run

**Current Workaround**: Use `--skip-preflight` flag to bypass preflight checks entirely, but this:
- Skips all preflight validation (not just MS Mail)
- Reduces test confidence
- Makes test results less reliable

## Evidence

**Setup script calling backend API:**
```bash
# helper-scripts/setup-msmail-state.sh:167
SEED_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/test/seed-msmail")
```

**Preflight sequence in comprehensive test suite:**
```bash
# helper-scripts/run-comprehensive-tests.sh
./system-health-check.sh    # Stops all processes
./setup-gmail-state.sh       # Uses Gmail API directly (works)
./setup-msmail-state.sh      # Calls backend API (fails)
```

**Error output:**
```
✓ Clearing JobOps folder...
✓ JobOps folder already empty
✓ Seeding JobOps folder with test emails...
✗ Failed to seed test emails
Response: curl: (7) Failed to connect to localhost port 8080: Connection refused
```

## Proposed Solutions

### Option 1: Seed MS Mail via Graph API Directly (Best)

**Description**: Rewrite `setup-msmail-state.sh` to seed test emails directly using MS Graph API, without calling backend

**Approach**:
1. Move test email generation logic from backend to shell script
2. Use MS Graph API to create emails directly in JobOps folder
3. Use same test email payloads but send via Graph API POST requests
4. Remove dependency on backend `/api/test/seed-msmail` endpoint

**Pros**:
- Removes chicken-and-egg problem entirely
- Preflight can run completely independently
- Consistent with `setup-gmail-state.sh` (which uses Gmail API directly)
- More reliable - no backend dependency
- Faster - no need to start/stop backend

**Cons**:
- Need to duplicate test email payloads from backend
- More complex shell scripting (JSON payload construction)
- Two places to maintain test email data

**Implementation Effort**: 2-3 hours

**Maintenance**: Medium - need to keep shell script in sync with backend test data

### Option 2: Start Backend Temporarily During Preflight

**Description**: Have preflight start backend temporarily, seed emails, then stop backend

**Approach**:
1. Modify `setup-msmail-state.sh` to start backend before seeding
2. Wait for backend to be ready (health check)
3. Call `/api/test/seed-msmail` endpoint
4. Stop backend after seeding completes
5. Continue with rest of preflight checks

**Pros**:
- Reuses existing backend seeding logic
- Single source of truth for test email data
- Minimal changes to existing code

**Cons**:
- Adds complexity to preflight process
- Slower - need to start/stop backend
- Race condition risk if backend doesn't start in time
- Breaks preflight independence model
- More fragile - backend startup issues affect preflight

**Implementation Effort**: 1-2 hours

**Maintenance**: Low - reuses existing backend code

### Option 3: Move MS Mail Seeding to Test Setup

**Description**: Remove MS Mail seeding from preflight, move it to E2E test setup phase

**Approach**:
1. Remove `setup-msmail-state.sh` from preflight checks
2. Add MS Mail seeding to E2E test global setup/beforeAll
3. Seed happens after backend is started but before tests run
4. Use backend API endpoint as currently designed

**Pros**:
- Minimal code changes
- Preserves backend as single source of truth
- Aligns seeding with backend lifecycle
- Simpler preflight checks

**Cons**:
- MS Mail state not validated in preflight
- Seeding happens later in test cycle
- E2E tests take longer to start
- Each test run must seed (can't reuse state)

**Implementation Effort**: 1 hour

**Maintenance**: Low - minimal changes

## Decision

**Recommendation**: Option 1 (Seed MS Mail via Graph API Directly)

**Rationale**:
- Best aligns with preflight independence model
- Consistent with existing Gmail seeding approach
- More reliable and faster than starting backend
- Worth the maintenance cost for cleaner architecture

**Alternative**: Option 3 if time-constrained, as it requires minimal changes

## Implementation

Not yet started - awaiting decision

## Testing

**Test Commands:**
```bash
# Reproduce the issue
./helper-scripts/run-comprehensive-tests.sh
# Observe preflight failure at MS Mail seeding step

# Current workaround
./helper-scripts/run-comprehensive-tests.sh --skip-preflight
# Tests run but preflight validation is skipped

# Verify the fix (Option 1: Direct Graph API seeding)
./helper-scripts/setup-msmail-state.sh
# Should seed MS Mail without backend running

# Verify the fix (Option 2: Temporary backend startup)
./helper-scripts/setup-msmail-state.sh
# Should start backend, seed, then stop backend

# Verify the fix (Option 3: Test setup seeding)
./helper-scripts/run-comprehensive-tests.sh
# Preflight should skip MS Mail, seeding happens in E2E setup

# Full comprehensive test suite
./helper-scripts/run-comprehensive-tests.sh
# Should complete without --skip-preflight flag
```

**Verification:**
- [ ] Preflight checks complete without errors
- [ ] MS Mail seeding works without backend running (Option 1/2) OR seeding removed from preflight (Option 3)
- [ ] JobOps folder populated with correct number of test emails
- [ ] JobOps-OLD folder cleared successfully
- [ ] E2E tests can access seeded emails
- [ ] Comprehensive test suite runs end-to-end without manual intervention

## Status History

- 2025-11-07: ISSUE-034 created and documented with full analysis

## Notes

**Current Workaround**: Use `--skip-preflight` flag when running comprehensive tests
```bash
./helper-scripts/run-comprehensive-tests.sh --skip-preflight
```

**Related Issue**: This issue blocks the ability to run comprehensive tests without manual intervention, reducing CI/CD automation potential

**Implementation Priority**: Medium - workaround exists but affects test reliability and automation

## Related Files

**MS Mail Setup Script:**
- `helper-scripts/setup-msmail-state.sh:167` - Backend API call that fails during preflight

**Backend Seeding Endpoint:**
- `backend/src/main.rs` - `/api/test/seed-msmail` endpoint (search for "seed-msmail")

**Comprehensive Test Suite:**
- `helper-scripts/run-comprehensive-tests.sh` - Calls preflight checks before tests

**System Health Check:**
- `helper-scripts/system-health-check.sh` - Stops all processes before preflight

**Comparison (works correctly):**
- `helper-scripts/setup-gmail-state.sh` - Seeds Gmail via API directly (no backend dependency)
