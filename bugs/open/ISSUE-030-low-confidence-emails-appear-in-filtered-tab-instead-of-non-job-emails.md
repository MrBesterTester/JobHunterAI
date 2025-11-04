---
id: ISSUE-030
title: Low-confidence emails appear in Filtered tab instead of Non-Job Emails
status: open
priority: medium
severity: medium
component: backend
created: 2025-11-03
updated: 2025-11-03
affects: []
related: []
---

# ISSUE-030: Low-confidence emails appear in Filtered tab instead of Non-Job Emails

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
  - [Option 1: [Solution Name]](#option-1-solution-name)
  - [Option 2: [Solution Name]](#option-2-solution-name)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Emails with confidence ≤ 0.3 get status 'filtered' instead of 'ignored', causing non-job emails to appear in wrong tab

## Impact

**Who/What is affected:**
- [Describe affected users, features, or systems]

**Severity:**
- [Describe the severity and scope of impact]

## Steps to Reproduce

1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happens]

## Root Cause

[Technical explanation of why this occurs - update after investigation]

## Evidence

- [Database queries showing the issue]
- [Log excerpts]
- [Screenshots]
- [Test results]

## Proposed Solutions

### Option 1: [Solution Name]

**Description**: [How it works]

**Pros**:
- Advantage 1
- Advantage 2

**Cons**:
- Disadvantage 1
- Disadvantage 2

**Implementation Effort**: [X hours/days]

**Maintenance**: [Ongoing maintenance requirements]

### Option 2: [Solution Name]

**Description**: [How it works]

**Pros**:
- Advantage 1
- Advantage 2

**Cons**:
- Disadvantage 1
- Disadvantage 2

**Implementation Effort**: [X hours/days]

**Maintenance**: [Ongoing maintenance requirements]

## Decision

[Which solution was chosen and why - update after decision is made]

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

- 2025-11-03: ISSUE created and documented

## Notes

[Any additional context or information]

## Related Files

[List specific file paths and line numbers relevant to this ISSUE]
- `path/to/file.rs:123`
- `path/to/other_file.tsx:456`
