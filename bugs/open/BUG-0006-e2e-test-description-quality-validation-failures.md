<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: BUG-0006
title: E2E Test - Description Quality Validation Failures
status: open
priority: high
severity: medium
component: frontend
created: 2025-10-30
updated: 2025-10-30
affects: [e2e-tests, job-descriptions, llm-integration]
related: [ISSUE-006]](#id-bug-0006%0Atitle-e2e-test---description-quality-validation-failures%0Astatus-open%0Apriority-high%0Aseverity-medium%0Acomponent-frontend%0Acreated-2025-10-30%0Aupdated-2025-10-30%0Aaffects-e2e-tests-job-descriptions-llm-integration%0Arelated-issue-006)
- [BUG-0006: E2E Test - Description Quality Validation Failures](#bug-0006-e2e-test---description-quality-validation-failures)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Update LLM Prompt](#option-1-update-llm-prompt)
    - [Option 2: Adjust Test Expectations](#option-2-adjust-test-expectations)
    - [Option 3: Implement Backend Validation](#option-3-implement-backend-validation)
  - [Decision](#decision)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: BUG-0006
title: E2E Test - Description Quality Validation Failures
status: open
priority: high
severity: medium
component: frontend
created: 2025-10-30
updated: 2025-10-30
affects: [e2e-tests, job-descriptions, llm-integration]
related: [ISSUE-006]
---

# BUG-0006: E2E Test - Description Quality Validation Failures

## Summary

Seven E2E tests in `23-description-quality.spec.ts` are failing. These tests validate that LLM-generated job descriptions meet quality standards (no apologetic language, no meta-commentary, concise length, etc.).

## Impact

**Affected Tests**: 7 failing tests
- All tests in `frontend/e2e/tests/23-description-quality.spec.ts`

**User Impact**: High - May indicate users are seeing poor quality job descriptions
**Development Impact**: High - Tests validate critical user-facing content quality

## Steps to Reproduce

1. Run E2E tests: `cd frontend && npm run test:e2e`
2. Observe tests in file `23-description-quality.spec.ts`
3. All 7 tests fail with various quality issues

## Expected Behavior

LLM-generated job descriptions should:
- Not contain apologetic language ("I apologize")
- Not contain verbose meta-commentary
- Be concise (under 200 words)
- Not be just "No job description"
- Generate unique content after prompt changes
- Not contain error messages
- Be to-the-point without meta-commentary

## Actual Behavior

Tests are failing, suggesting descriptions may contain:
- Apologetic language
- Meta-commentary
- Excessive length
- Generic/placeholder text
- Error messages

## Root Cause

**Needs Investigation**. Possible causes:
1. LLM prompt not properly constraining output
2. Backend validation not enforcing quality standards
3. Test expectations misaligned with actual LLM behavior
4. ISSUE-006 backend validation flag not fully addressing quality

## Evidence

**Test output** (from test run 2025-10-30):
```
test-results/23-description-quality-Con-646ec--language-like-I-apologize--chromium/test-failed-1.png
test-results/23-description-quality-Con-0fe14-ain-verbose-meta-commentary-chromium/test-failed-1.png
test-results/23-description-quality-Con-f7f5e-ly-concise-under-200-words--chromium/test-failed-1.png
test-results/23-description-quality-Con-e4b50-ot-just-No-job-description--chromium/test-failed-1.png
test-results/23-description-quality-Con-aec66-ontent-after-prompt-change--chromium/test-failed-1.png
test-results/23-description-quality-Con-9dfef-ror-messages-in-description-chromium/test-failed-1.png
test-results/23-description-quality-Con-79a92--point-not-meta-commentary--chromium/test-failed-1.png
```

**Related Work**:
- ISSUE-006: Backend validation flag for placeholder detection
- May need expansion to cover broader quality issues

## Proposed Solutions

### Option 1: Update LLM Prompt

**Description**: Revise the LLM prompt to be more explicit about quality requirements

**Pros**:
- Addresses root cause
- Improves quality for all users
- No code changes needed

**Cons**:
- LLM behavior can be unpredictable
- May need multiple iterations
- Harder to enforce consistently

**Implementation Effort**: 2-3 hours (prompt iteration + testing)

### Option 2: Adjust Test Expectations

**Description**: Relax test assertions to match actual LLM behavior

**Pros**:
- Quick fix
- Tests pass immediately
- Acknowledges LLM limitations

**Cons**:
- Doesn't improve user experience
- Allows poor quality content
- Not recommended for user-facing features

**Implementation Effort**: 1 hour

### Option 3: Implement Backend Validation

**Description**: Add backend validation similar to ISSUE-006 to detect and flag quality issues

**Pros**:
- Reliable enforcement
- Can provide user feedback
- Extends ISSUE-006 pattern

**Cons**:
- More complex implementation
- Requires backend changes
- Harder to define all quality rules

**Implementation Effort**: 4-6 hours

## Decision

**Selected**: TBD - Requires investigation

**Next Steps**:
1. Run tests individually and capture actual LLM output
2. Review LLM prompts for description generation
3. Determine if this is:
   - Prompt issue (fix prompt)
   - Test issue (adjust expectations)
   - Validation issue (implement backend checks)

## Implementation

[To be completed after investigation]

## Testing

1. Run description quality tests individually
2. Capture and analyze actual LLM output
3. Compare against test expectations
4. Verify fix addresses root cause

**Success Criteria**: All 7 tests pass with high-quality descriptions

## Status History

- 2025-10-30: Bug discovered during E2E test investigation
- 2025-10-30: Initial analysis - requires deeper investigation

## Notes

- **Priority: High** - This affects user-facing content quality
- Related to ISSUE-006 (backend validation flag)
- May want to expand ISSUE-006 solution to cover broader quality checks
- Consider adding quality scoring similar to content generation tests
- Test file: `frontend/e2e/tests/23-description-quality.spec.ts`
