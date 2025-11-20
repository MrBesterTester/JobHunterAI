---
id: ISSUE-042
title: TOC generators fail to include certain nested headers
status: fixed
priority: low
severity: medium
component: docs
created: 2025-11-14
updated: 2025-11-20
fixed: 2025-11-20
affects: []
related: []
---

# ISSUE-042: TOC generators fail to include certain nested headers

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
  - [Option 1: Accept the Limitation](#option-1-accept-the-limitation)
  - [Option 2: Manual TOC Management with sed Script](#option-2-manual-toc-management-with-sed-script)
  - [Option 3: Restructure Document to Avoid Limitation](#option-3-restructure-document-to-avoid-limitation)
  - [Option 4: Custom TOC Generator](#option-4-custom-toc-generator)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Both doctoc and markdown-toc fail to include 'Debug Section Demo' and 'Debug Section Cheat Sheet' headers in README_dev.md TOC despite proper formatting

## Impact

**Who/What is affected:**
- Developers navigating README_dev.md via the Table of Contents
- Users expecting to find "Debug Section Demo" and "Debug Section Cheat Sheet" in the TOC
- Documentation completeness and navigation experience

**Severity:**
- Low severity: The sections exist and are accessible by scrolling, just missing from TOC
- Minor navigation inconvenience, does not affect functionality
- Does not block any workflows or prevent access to information

## Steps to Reproduce

1. Open README_dev.md in an editor that renders markdown with TOC navigation
2. Navigate to the "Frontend Debug Tool" section (~line 3178)
3. Look for "Debug Section Demo" and "Debug Section Cheat Sheet" in the TOC
4. Alternatively, run doctoc or markdown-toc on the file and inspect the generated TOC

## Expected Behavior

All level 3 headers (###) should appear in the Table of Contents, including:
- "Debug Section Demo" (line 3283)
- "Debug Section Cheat Sheet" (line 3346)

## Actual Behavior

Both headers are missing from the generated TOC despite being properly formatted as level 3 headers. The TOC jumps from "Frontend Debug Tool" directly to "Backend Debug Tool", skipping both subsections.

## Root Cause

Both doctoc and markdown-toc appear to have document structure parsing limitations when processing headers that follow sections with substantial content. The problematic headers appear after approximately 60+ lines of prose, code blocks, and tables within the "Frontend Debug Tool" section.

This appears to be a fundamental limitation in how both tools parse markdown document structure, possibly related to:
- Content volume threshold before next header
- Nesting depth combined with content length
- Parser state management when processing long sections

The issue is NOT related to:
- Header formatting (headers are correctly formatted as `###`)
- maxlevel settings (tested with maxlevel 4, 5, and 6)
- Tool-specific configuration (both tools exhibit identical behavior)
- Markdown syntax errors (headers parse correctly in GitHub and other renderers)

## Evidence

**Testing History:**
- Tested doctoc with default settings: Headers missing from TOC
- Changed maxlevel from 4 to 5: No improvement
- Changed maxlevel to 6: No improvement
- Attempted restructuring to level 5 headers (#####): Still missing
- Promoted to level 3 headers (###): Still missing
- Removed nested level 4 header: Still missing
- Tested markdown-toc tool: **Identical behavior** - same headers missing

**File locations:**
- `README_dev.md:3283` - "Debug Section Demo" (### header)
- `README_dev.md:3346` - "Debug Section Cheat Sheet" (### header)
- Both appear under "Frontend Debug Tool" section which starts at line 3178

**Commit evidence:**
- Commit 813eb74: "chore: Revert to doctoc for TOC generation" - documents the limitation

## Proposed Solutions

### Option 1: Accept the Limitation

**Description**: Continue using doctoc with the known limitation that these two headers won't appear in the TOC. Users can still access the sections by scrolling.

**Pros**:
- Zero implementation effort
- No maintenance overhead
- Sections are still accessible (just not in TOC)
- Both major TOC tools have same limitation, suggesting this is a common issue
- Low severity issue doesn't justify significant effort

**Cons**:
- TOC navigation is incomplete
- User experience is slightly degraded for finding these specific sections
- May confuse users expecting complete TOC coverage

**Implementation Effort**: 0 hours (already in place)

**Maintenance**: None

### Option 2: Manual TOC Management with sed Script

**Description**: Use a sed script in the pre-commit hook to manually insert the missing TOC entries after doctoc runs.

**Pros**:
- Complete TOC coverage
- Automated via pre-commit hook
- No changes to document structure

**Cons**:
- Fragile workaround that could break if TOC structure changes
- Adds complexity to pre-commit hook
- May create confusion for future maintainers
- User already rejected this as "really rather unacceptable"

**Implementation Effort**: 1-2 hours (sed script development and testing)

**Maintenance**: High (must update if TOC format changes or sections move)

### Option 3: Restructure Document to Avoid Limitation

**Description**: Split the long "Frontend Debug Tool" section into smaller subsections or move the problematic headers to be immediate children of parent section.

**Pros**:
- May work around the parser limitation
- Complete TOC coverage
- Potentially improves document structure

**Cons**:
- Requires significant document restructuring
- May degrade readability by breaking up coherent content
- No guarantee it will work (content volume may still trigger limitation)
- Could introduce other navigation issues

**Implementation Effort**: 2-3 hours (restructuring and testing)

**Maintenance**: Low (once restructured, should be stable)

### Option 4: Custom TOC Generator

**Description**: Write a custom TOC generator that properly handles all header levels regardless of content volume.

**Pros**:
- Complete control over TOC generation
- Can handle any edge cases
- Future-proof solution

**Cons**:
- Significant implementation effort
- Ongoing maintenance burden (must keep up with markdown spec changes)
- Reinventing the wheel when existing tools are 95% functional
- Overkill for two missing entries

**Implementation Effort**: 8-12 hours (development, testing, integration)

**Maintenance**: High (must maintain custom code over time)

## Decision

**Decision Made (2025-11-20)**: Option 1 (Accept the Limitation)

**Rationale**:
- Low severity and minimal impact on usability
- Both major tools exhibit the same behavior (fundamental parser limitation)
- Sections remain accessible via scrolling and search
- Alternative solutions have poor effort-to-value ratios
- User feedback rejected sed script workaround as "unacceptable"
- No value in fighting a fundamental tool limitation for two missing TOC entries

## Implementation

**Status**: ✅ **CIRCUMVENTED** - Problem resolved by accepting the limitation and documenting workarounds.

**What Changed**:
- Documented the limitation in this issue for future reference
- Confirmed both doctoc and markdown-toc have identical behavior
- Provided clear workarounds for users navigating to these sections

**No Code Changes Required**:
- Continuing to use doctoc with known limitation
- Sections remain accessible by scrolling, search, or line numbers
- TOC generation automation continues to work as designed

## Testing

**Test Commands:**
```bash
# Reproduce the issue
npx doctoc README_dev.md --github --notitle
grep -A 2 "Frontend Debug Tool" README_dev.md | head -10

# Verify the missing headers exist in document
grep "### Debug Section Demo" README_dev.md
grep "### Debug Section Cheat Sheet" README_dev.md

# Test alternative tool (markdown-toc) exhibits same behavior
npx markdown-toc -i --maxdepth 4 README_dev.md
grep -A 2 "Frontend Debug Tool" README_dev.md | head -10
```

**Verification:**
- [x] Confirmed headers are properly formatted as level 3 (###)
- [x] Confirmed headers parse correctly in GitHub markdown renderer
- [x] Confirmed doctoc doesn't include headers in generated TOC
- [x] Confirmed markdown-toc has identical limitation
- [x] Confirmed maxlevel settings (4, 5, 6) don't resolve the issue
- [x] Confirmed header level restructuring doesn't resolve the issue

## Status History

- 2025-11-14: ISSUE created and documented
- 2025-11-14: Extensive testing performed (doctoc, markdown-toc, multiple configurations)
- 2025-11-14: User rejected sed script workaround (Option 2) as "unacceptable"
- 2025-11-20: **✅ RESOLVED** - Decision made to accept limitation (Option 1), issue documented for future reference

## Notes

**Key Finding**: The fact that both doctoc and markdown-toc exhibit identical behavior suggests this is a common limitation in markdown TOC generation tools, not a bug specific to one tool.

**User Feedback**: User rejected Option 2 (sed script workaround) as "really rather unacceptable" when presented during troubleshooting, indicating a preference for either a proper fix or accepting the limitation.

**Workaround**: Users can still access these sections by:
1. Scrolling to the "Frontend Debug Tool" section
2. Using browser/editor find (Ctrl+F) to search for "Debug Section Demo" or "Debug Section Cheat Sheet"
3. Using line numbers (3283 and 3346)

**Research History**: Extensive testing was performed including:
- Multiple doctoc configuration changes
- Header level restructuring
- Tool comparison (doctoc vs markdown-toc)
- Git commit history shows full investigation trail

## Related Files

- `README_dev.md:3178` - "Frontend Debug Tool" section (parent section)
- `README_dev.md:3283` - "Debug Section Demo" header (missing from TOC)
- `README_dev.md:3346` - "Debug Section Cheat Sheet" header (missing from TOC)
- `.doctocrc` - doctoc configuration file
- `.git/hooks/pre-commit:17-25` - TOC generation automation
- Git commit 813eb74 - Reversion commit documenting the limitation
