---
id: ISSUE-061
title: Derive comprehensive test runtime estimate from historical test runs
status: fixed
priority: medium
severity: enhancement
component: frontend
created: 2025-11-20
updated: 2025-11-21
fixed: 2025-11-21
affects:
  - helper-scripts/run-comprehensive-tests.sh
related:
  - ISSUE-060
---

# ISSUE-061: Derive comprehensive test runtime estimate from historical test runs

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Current Implementation](#current-implementation)
- [Proposed Enhancement](#proposed-enhancement)
  - [Data Source](#data-source)
  - [Implementation Considerations](#implementation-considerations)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Parse JSON Reports (Recommended)](#option-1-parse-json-reports-recommended)
  - [Option 2: Parse Testing History Markdown Files](#option-2-parse-testing-history-markdown-files)
  - [Option 3: Manual Adjustment (Current State)](#option-3-manual-adjustment-current-state)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Currently, `helper-scripts/run-comprehensive-tests.sh` hardcodes the estimated runtime (15-20 minutes) in configuration variables. While these values are now defined once (ISSUE-061 Phase 1), they should ideally be derived dynamically from historical test run data stored in `testing-history/`.

## Impact

**Who/What is affected:**
- Developers running comprehensive tests who need accurate completion time estimates
- Test runtime estimation accuracy as the test suite grows or performance improves

**Severity:**
- Low priority enhancement
- Current hardcoded estimate works fine but becomes stale over time
- Better estimates improve developer workflow planning

## Current Implementation

As of the Phase 1 refactoring:

```bash
# Estimated runtime configuration (in minutes)
# TODO: Derive from historical test runs (see ISSUE-061)
ESTIMATED_MIN_MINUTES=15
ESTIMATED_MAX_MINUTES=20
```

These values are used to:
1. Calculate completion time range (e.g., "4:16 PM-4:21 PM")
2. Display estimated duration message

**Benefits of current approach:**
- Simple, predictable
- Single source of truth (no duplication)
- Easy to manually adjust

**Limitations:**
- Requires manual updates as test suite changes
- May drift from actual performance over time
- Doesn't account for machine-specific variations

## Proposed Enhancement

Dynamically calculate runtime estimates from historical test runs:

### Data Source

Use `testing-history/TEST_STATUS_*.md` files and/or `test-results/comprehensive-report.json`:
- Parse recent test run durations (last 5-10 runs)
- Calculate average or percentile-based estimates
- Use min/max from recent history as range

### Implementation Considerations

1. **Where to parse:**
   - Option A: Parse markdown files in `testing-history/`
   - Option B: Parse JSON reports if available
   - Option C: Maintain separate runtime history file

2. **Fallback behavior:**
   - Keep hardcoded defaults if no history available
   - Require minimum N runs before using dynamic estimates

3. **Performance:**
   - Parsing should be fast (<1 second)
   - Cache/memoize results if needed

## Proposed Solutions

### Option 1: Parse JSON Reports (Recommended)

**Description**: Parse `test-results/comprehensive-report.json` from recent test runs to extract duration data. Create a lightweight bash/TypeScript utility that:
1. Checks for JSON report file from previous run
2. Extracts duration field
3. Maintains simple history file (last 10 runs)
4. Calculates P25/P75 percentiles for min/max estimate

**Pros**:
- JSON parsing is reliable and structured
- Test orchestrator already generates JSON reports
- Can be implemented in TypeScript (consistent with project)
- Easy to add to test orchestrator workflow

**Cons**:
- Requires JSON report from previous run (won't work on first run)
- Need to maintain separate history file
- Adds complexity to test startup

**Implementation Effort**: 2-3 hours

**Maintenance**: Low - JSON format is stable

### Option 2: Parse Testing History Markdown Files

**Description**: Parse `testing-history/TEST_STATUS_*.md` files using regex/grep to extract duration information from historical test runs.

**Pros**:
- Leverages existing comprehensive documentation
- No need for separate history file
- Works with all historical data

**Cons**:
- Markdown parsing is brittle (format changes break parsing)
- Slower than JSON parsing
- Durations are in various formats (mm:ss, "X minutes", etc.)
- Need to scan multiple files

**Implementation Effort**: 3-4 hours

**Maintenance**: Medium - fragile to documentation format changes

### Option 3: Manual Adjustment (Current State)

**Description**: Keep current hardcoded values, update manually when test suite changes significantly.

**Pros**:
- Zero implementation cost
- Simple, predictable
- No parsing overhead

**Cons**:
- Requires manual monitoring and updates
- Estimates drift over time
- No machine-specific adaptation

**Implementation Effort**: 0 hours (already done)

**Maintenance**: Low - occasional manual updates

## Decision

Not yet decided - awaiting user prioritization.

**Recommendation**: Option 1 (Parse JSON Reports) for best balance of reliability and implementation effort.

## Implementation

**Phase 1 (COMPLETED - 2025-11-20)**:
- Refactored hardcoded values to single-source configuration variables
- Added `ESTIMATED_MIN_MINUTES` and `ESTIMATED_MAX_MINUTES` at top of script
- Updated TODO comment to reference this issue

**Phase 2 (NOT STARTED)**:
- Dynamic estimation from historical data
- Awaiting decision on which option to implement

## Testing

**Test Commands:**
```bash
# Test current implementation (Phase 1)
./helper-scripts/run-comprehensive-tests.sh
# Observe the "Estimated runtime" and "Tests will complete around" messages

# After Phase 2 implementation, test with:
# 1. No history (should use fallback defaults)
# 2. Limited history (1-4 runs)
# 3. Full history (5+ runs)
```

**Verification:**
- [x] Phase 1: Single-source configuration works correctly
- [x] Phase 1: Time calculation uses variables (not hardcoded)
- [x] Phase 1: Message displays correct estimates
- [ ] Phase 2: Dynamic calculation from history (if implemented)
- [ ] Phase 2: Graceful fallback to defaults when no history
- [ ] Phase 2: Estimates update as test suite performance changes

## Status History

- 2025-11-20: ISSUE created and documented
- 2025-11-20: Phase 1 completed (single-source configuration)

## Notes

**Context**: User requested that the comprehensive test announcement show completion time range (e.g., "4:16 PM-4:21 PM") instead of just duration. While implementing this, we realized the estimate was hardcoded in two places, so we:
1. Refactored to single-source (Phase 1 - completed)
2. Filed this issue for dynamic estimation (Phase 2 - future enhancement)

**Trade-offs**: Current Phase 1 implementation is good enough for now. Phase 2 is a "nice to have" that improves accuracy but isn't critical to functionality.

## Related Files

- `helper-scripts/run-comprehensive-tests.sh:53-56` - Runtime configuration variables
- `helper-scripts/run-comprehensive-tests.sh:112-120` - Time calculation and display
- `testing-history/TEST_STATUS_*.md` - Historical test run data (potential data source)
- `test-results/comprehensive-report.json` - JSON test report (potential data source)
