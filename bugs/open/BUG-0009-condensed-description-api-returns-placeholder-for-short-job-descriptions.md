---
id: BUG-0009
title: Condensed description API returns placeholder for short job descriptions
status: open
priority: medium
severity: low
component: backend
created: 2025-11-03
updated: 2025-11-03
affects: []
related: []
---

# BUG-0009: Condensed description API returns placeholder for short job descriptions

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
  - [Option 1: Pre-check Length Before LLM Call ⭐ **RECOMMENDED**](#option-1-pre-check-length-before-llm-call--recommended)
  - [Option 2: Update Prompt to Handle Short Descriptions](#option-2-update-prompt-to-handle-short-descriptions)
  - [Option 3: Hybrid Approach](#option-3-hybrid-approach)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

LLM returns 'No job description to be extracted' placeholder instead of condensing short descriptions, causing warning icon on job cards

## Impact

**Who/What is affected:**
- Users viewing job cards with short but valid descriptions
- Jobs with concise descriptions (less than ~100 words)
- UI displays warning icon when condensed description matches placeholder text

**Severity:**
- Low - Cosmetic issue, doesn't affect functionality
- UX degradation - users see unnecessary warning icons
- Content is still accessible in full description

## Steps to Reproduce

1. Sync or create a job with a short but valid description (e.g., 50-100 words)
2. UI triggers condensed description API: `GET /api/jobs/{job_id}/condensed-description`
3. LLM processes the short description with condensation prompt
4. LLM returns "No job description to be extracted." because description is too short to condense
5. Frontend detects placeholder text and shows warning icon

## Expected Behavior

**For short but valid descriptions**:
- If description is already concise (< 150 words), return it as-is without LLM processing
- If description is 150-300 words, condense to ~100 words
- If description is > 300 words, condense to ~100 words
- Only return placeholder for truly empty/invalid descriptions

## Actual Behavior

**Current behavior**:
- LLM prompt instructs Claude to return "No job description to be extracted." for non-meaningful text
- Short but valid descriptions (50-100 words) trigger this placeholder incorrectly
- Frontend treats this as invalid and shows warning icon

**Code Analysis Findings (2025-11-04)**:
- Condensation logic: `backend/src/main.rs:2521-2579`
- Prompt loading: `main.rs:2557-2563` (loads from `../prompts/job_condensed_description.md`)
- Fallback prompt (if file missing): `main.rs:2561` contains instruction to return placeholder

## Root Cause

**IDENTIFIED**: Prompt design issue

**Problem Flow**:
1. API receives short description (e.g., 75 words)
2. Prompt asks Claude to "condense to approximately 100 words"
3. Prompt also says: "If text does not contain meaningful job description... respond ONLY with: 'No job description to be extracted.'"
4. Claude interprets short descriptions as "not meaningful enough to condense" (already shorter than target!)
5. Returns placeholder instead of returning original text

**Root Issue**: No pre-check for description length before calling LLM

**Inefficiency**: Wasting API calls on descriptions that don't need condensing

## Evidence

**Code References**:
- Condensation endpoint: `backend/src/main.rs:2467-2518` (`get_job_condensed_description`)
- Helper function: `backend/src/main.rs:2521-2579` (`condense_text_with_claude`)
- Prompt file reference: `main.rs:2557` (`../prompts/job_condensed_description.md`)
- Fallback prompt with placeholder: `main.rs:2561`
- No length check before LLM call (missing optimization)

**Related**:
- Validation function: `is_valid_description()` checks if response equals placeholder
- Frontend: Likely in job card component (checking `has_valid_description` flag)

## Proposed Solutions

### Option 1: Pre-check Length Before LLM Call ⭐ **RECOMMENDED**

**Description**:
- Count words in description before calling LLM
- If < 150 words: Return description as-is (already concise)
- If 150-300 words: Call LLM to condense
- If > 300 words: Call LLM to condense
- Only return placeholder if description is truly empty/invalid

**Pros**:
- Saves API costs (no unnecessary LLM calls for short descriptions)
- Faster response for short descriptions (no API roundtrip)
- Fixes the issue completely
- Simple logic, easy to understand

**Cons**:
- Need to define "word count" threshold (can adjust based on testing)
- Slightly more complex endpoint logic

**Implementation Effort**: 1-2 hours

**Maintenance**: Minimal, self-documenting logic

### Option 2: Update Prompt to Handle Short Descriptions

**Description**:
- Modify the LLM prompt to instruct Claude: "If description is already concise (< 150 words), return it unchanged"
- Keep calling LLM for all descriptions, but give it better instructions

**Pros**:
- Minimal code changes
- Prompt-based solution
- Claude handles the logic

**Cons**:
- Still wastes API calls for short descriptions
- Less deterministic (relies on Claude's interpretation)
- Slower (always requires API roundtrip)
- Higher cost

**Implementation Effort**: 30 minutes (update prompt file)

**Maintenance**: May need prompt tuning over time

### Option 3: Hybrid Approach

**Description**:
- Pre-check length (like Option 1)
- Update prompt (like Option 2) for edge cases
- Best of both worlds

**Pros**:
- Most robust solution
- Saves API costs
- Handles edge cases gracefully

**Cons**:
- More implementation work

**Implementation Effort**: 2-3 hours

**Maintenance**: Minimal

## Decision

**SELECTED**: Option 1 (Pre-check Length Before LLM Call)

**Rationale**:
- Most cost-effective (saves API calls)
- Fastest for short descriptions (no API roundtrip)
- Simple, deterministic logic
- Completely fixes the issue
- 1-2 hour implementation is worth the savings

## Implementation

[Details of what was implemented - update during/after implementation]

## Testing

**Test Commands:**
```bash
# Commands to reproduce the bug
# Commands to verify the fix
```

**Verification:**
- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

## Status History

- 2025-11-03: BUG created and documented during Phase 2.7 manual testing
- 2025-11-04: Root cause identified, Option 1 selected, ready for implementation

## Notes

**From Manual Testing (Phase 2.7 validation - 2025-11-03)**:
- Observed during Microsoft Email Source testing
- Short job descriptions returned placeholder text
- Warning icons appeared on otherwise valid job cards

**Additional Benefit**: This fix will also improve performance and reduce API costs by skipping LLM calls for already-concise descriptions

**Word Count Threshold**: Using 150 words as threshold based on:
- Target condensed length is ~100 words
- 150 words is "close enough" to not need condensing
- Can be adjusted after implementation if needed

## Related Files

**Backend**:
- `backend/src/main.rs:2467-2518` - `get_job_condensed_description()` endpoint (needs word count check)
- `backend/src/main.rs:2521-2579` - `condense_text_with_claude()` helper function
- `backend/src/main.rs:2557-2563` - Prompt loading logic
- `prompts/job_condensed_description.md` - LLM prompt file (may need update for long descriptions)

**Frontend** (likely affected):
- Job card component (checks `has_valid_description` flag)
- May need to identify exact component showing warning icon
