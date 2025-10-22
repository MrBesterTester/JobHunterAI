<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: ISSUE-006
title: Brittle Placeholder Validation in Description Checking
status: open
priority: medium
severity: medium
component: frontend
created: 2025-10-22
updated: 2025-10-22
affects: [Job Description Validation, Filtered Tab, Ranking Logic]
related: [ISSUE-005]](#id-issue-006%0Atitle-brittle-placeholder-validation-in-description-checking%0Astatus-open%0Apriority-medium%0Aseverity-medium%0Acomponent-frontend%0Acreated-2025-10-22%0Aupdated-2025-10-22%0Aaffects-job-description-validation-filtered-tab-ranking-logic%0Arelated-issue-005)
- [ISSUE-006: Brittle Placeholder Validation in Description Checking](#issue-006-brittle-placeholder-validation-in-description-checking)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Backend Validation Flag](#option-1-backend-validation-flag)
    - [Option 2: Semantic Analysis with Heuristics](#option-2-semantic-analysis-with-heuristics)
    - [Option 3: Regex Pattern Matching](#option-3-regex-pattern-matching)
  - [Decision](#decision)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: ISSUE-006
title: Brittle Placeholder Validation in Description Checking
status: open
priority: medium
severity: medium
component: frontend
created: 2025-10-22
updated: 2025-10-22
affects: [Job Description Validation, Filtered Tab, Ranking Logic]
related: [ISSUE-005]
---

# ISSUE-006: Brittle Placeholder Validation in Description Checking

## Summary

The current fix for ISSUE-005 uses hardcoded string matching to identify placeholder messages from the LLM (e.g., "No job description to be extracted."). This approach is brittle and will break if the Haiku model's output changes even slightly, or if the prompt changes to produce semantically equivalent but differently worded messages.

## Impact

**Who is affected**: All users, especially as the system evolves over time

**Severity**: Medium - currently works but creates technical debt and future maintenance burden

- **Current state**: Working as expected with current prompt
- **Future risk**: Will silently break if LLM output changes
- **Maintenance burden**: Requires manual updates to hardcoded strings
- **Silent failures**: No warning when new placeholder variants appear
- **Scalability issue**: Cannot handle variations in LLM responses

## Steps to Reproduce

The issue is latent but can be demonstrated by:

1. Modify `prompts/job_condensed_description.md` to output a different placeholder message
2. Change "No job description to be extracted." to "Unable to extract job description."
3. Run job condensation for a job with no valid description
4. Observe: Frontend still shows "Loading description..." instead of warning badge
5. Result: Job ranks incorrectly (stays at top instead of falling to bottom)

## Expected Behavior

The system should robustly identify ALL placeholder/error messages from the LLM, regardless of exact wording:
- Semantically equivalent messages should be treated the same
- System should be resilient to prompt changes
- Should handle variations in LLM output (common with generative models)
- Should detect new/unknown placeholder patterns

## Actual Behavior

The system only recognizes these exact hardcoded strings:
```javascript
const invalidDescriptions = [
  'Loading description...',
  'No job description to be extracted.',
  'No description available.',
  ''
];
```

Any variation (e.g., "No job description found", "Cannot extract description", "Job description unavailable") will be treated as a VALID description, causing:
- Job to rank at top instead of bottom
- No warning badge displayed
- User confusion about incomplete job data

## Root Cause

**Technical Explanation**:

1. **Hardcoded String Matching** (`frontend/src/App.tsx:1249-1263`)
   - `hasValidDescription()` uses exact string matching with `includes()`
   - No fuzzy matching, pattern matching, or semantic analysis
   - Assumes LLM output is perfectly consistent

2. **No Backend Validation**
   - Backend endpoint (`/api/jobs/{id}/condense-description`) returns LLM output directly
   - No validation of whether the response is a placeholder vs. real content
   - Backend doesn't signal "extraction failed" - just returns whatever string the LLM provides

3. **LLM Output Variability**
   - Even with strict prompts, LLMs can vary output slightly
   - Different model versions may phrase things differently
   - Prompt engineering changes can alter placeholder messages
   - No way to distinguish "short but valid description" from "placeholder message"

4. **Tight Coupling to Prompt**
   - Current solution is tightly coupled to `prompts/job_condensed_description.md` line 4 & 8
   - Any prompt modification breaks the validation logic
   - No documentation linking prompt to validation code

**Location**:
- Frontend validation: `frontend/src/App.tsx:1249-1263` (hasValidDescription)
- Backend endpoint: `backend/src/main.rs:2354-2383` (condense-description)
- Prompt definition: `prompts/job_condensed_description.md`

## Evidence

- User feedback: "If the 'No job description to be extracted.' from the Haiku ever changes to something semantically equivalent but worded different, the code may interpret it differently."
- Current prompt specifies exact wording: `prompts/job_condensed_description.md:4,8`
- No test coverage for placeholder message variations
- No monitoring/alerting for unrecognized placeholder patterns
- History shows this already happened once: Initial implementation failed because it didn't check for placeholders at all

## Proposed Solutions

### Option 1: Backend Validation Flag

**Description**: Modify backend to return a structured response with a `has_valid_description` boolean flag instead of just returning the raw LLM text.

**Pros**:
- Single source of truth for validation logic (backend)
- Frontend doesn't need to parse/interpret LLM output
- Can apply sophisticated validation logic in backend (length checks, keyword detection, etc.)
- Easier to maintain - only one place to update
- Can add logging/metrics for placeholder detection

**Cons**:
- Requires backend API change (breaking change)
- Frontend needs update to handle new response format
- More complex backend logic

**Implementation Effort**: 4-6 hours
- Backend: Modify `/api/jobs/{id}/condense-description` response schema
- Backend: Add validation logic (check for known placeholders, length, etc.)
- Frontend: Update API call to use new `has_valid_description` field
- Frontend: Remove hardcoded string list
- Update any API documentation
- Add backend tests for validation logic

**Example Response**:
```json
{
  "condensed_description": "No job description to be extracted.",
  "has_valid_description": false,
  "extraction_failed_reason": "placeholder_message"
}
```

### Option 2: Semantic Analysis with Heuristics

**Description**: Use multiple heuristics to identify placeholder messages: length, common words, sentence structure, etc.

**Pros**:
- More flexible than exact string matching
- Can handle variations in wording
- No backend changes required
- Can evolve heuristics over time

**Cons**:
- Complex logic, harder to maintain
- False positives possible (short but valid descriptions)
- False negatives possible (new placeholder patterns)
- Still frontend-only validation
- No single source of truth

**Implementation Effort**: 3-4 hours
- Define heuristics (length < 50 chars, contains "no"/"unable"/"cannot", etc.)
- Implement multi-criteria validation function
- Test against edge cases
- Document heuristics for future maintainers

**Example Heuristics**:
```javascript
const hasValidDescription = (jobId: string): boolean => {
  const desc = condensedDescriptions[jobId];
  if (!desc) return false;

  // Heuristic 1: Too short (likely placeholder)
  if (desc.trim().length < 50) return false;

  // Heuristic 2: Contains failure keywords
  const failureKeywords = /\b(no|unable|cannot|failed|unavailable|not found)\b.*\b(description|extract|condense)\b/i;
  if (failureKeywords.test(desc)) return false;

  // Heuristic 3: Just one sentence with no job details
  const sentences = desc.split(/[.!?]+/);
  if (sentences.length <= 1) return false;

  return true;
};
```

### Option 3: Regex Pattern Matching

**Description**: Use regex patterns to match placeholder message structures instead of exact strings.

**Pros**:
- More flexible than exact matching
- Can handle variations in wording
- Easy to extend with new patterns
- No backend changes

**Cons**:
- Regex can be complex and error-prone
- Still requires updating frontend when patterns change
- Doesn't solve root cause (backend not signaling failures)
- Can have false positives/negatives

**Implementation Effort**: 2-3 hours
- Design regex patterns for common placeholder structures
- Test patterns against known messages
- Update `hasValidDescription()` to use regex

**Example Patterns**:
```javascript
const placeholderPatterns = [
  /^loading description/i,
  /^no .* (description|content|information)/i,
  /^(unable|cannot|failed) to (extract|find|condense)/i,
  /^description (not available|unavailable|not found)/i,
  /^\s*$/  // empty or whitespace only
];
```

## Decision

**Status**: Pending user/developer decision

**Recommendation**: **Option 1** (Backend Validation Flag) is strongly recommended because:
- Provides single source of truth for validation
- Backend can apply more sophisticated validation logic
- Frontend doesn't need to interpret LLM output semantics
- Easier to maintain long-term
- Can add metrics/monitoring for extraction failures
- Aligns with separation of concerns (backend handles data validation)
- Prevents silent failures when prompt/LLM changes

**Alternative**: If backend changes are not feasible, **Option 2** (Semantic Analysis) is the next best choice, as it's more robust than current hardcoded strings and more flexible than regex patterns.

## Implementation

[To be filled after decision is made]

## Testing

**Test Cases for Chosen Solution**:
1. ✅ Known placeholder messages are correctly identified
2. ✅ Variations of placeholder messages are correctly identified
3. ✅ Short but valid descriptions (50-100 words) are NOT flagged as placeholders
4. ✅ Valid descriptions with "no" or "unable" in job requirements are NOT flagged
5. ✅ System handles new/unknown placeholder patterns gracefully
6. ✅ Metrics/logging capture placeholder detection (if backend solution)

**Prompt Modification Test**:
```bash
# 1. Change prompt placeholder message
sed -i 's/No job description to be extracted./Unable to extract valid job description./' prompts/job_condensed_description.md

# 2. Run condensation for job with no description
curl http://localhost:8080/api/jobs/{job_id}/condense-description

# 3. Verify frontend still handles it correctly
# Expected: Job should rank last, warning badge should show
```

## Status History

- 2025-10-22 13:15: Initial ISSUE-005 fix implemented with hardcoded string matching
- 2025-10-22 13:45: User identified brittleness in hardcoded string approach
- 2025-10-22 14:00: ISSUE-006 filed to track technical debt and propose robust solutions

## Notes

- **Critical User Feedback**: "If the 'No job description to be extracted.' from the Haiku ever changes to something semantically equivalent but worded different, the code may interpret it differently. It depends on how rigidly that output from the Haiku model using the prompts/job_condensed_description.md remains."
- This is a **technical debt issue** rather than an immediate bug
- Current implementation works but is fragile
- Priority should be elevated if prompt changes are planned
- Consider this issue when planning any LLM prompt modifications
- Related to broader question: How should system handle LLM output variability?
- May want to implement backend response versioning to allow for future schema changes

## Related Files

- `frontend/src/App.tsx:1249-1263` - Current `hasValidDescription()` function with hardcoded strings
- `backend/src/main.rs:2354-2383` - Backend `/api/jobs/{id}/condense-description` endpoint
- `prompts/job_condensed_description.md` - LLM prompt that defines placeholder message wording
- `bugs/fixed/ISSUE-005-missing-job-descriptions-ranking.md` - Related issue that introduced current validation approach
