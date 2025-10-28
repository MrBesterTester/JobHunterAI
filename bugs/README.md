<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Bug Tracking Index](#bug-tracking-index)
  - [Summary](#summary)
  - [Priority Breakdown](#priority-breakdown)
  - [Component Breakdown](#component-breakdown)
  - [Open Bugs](#open-bugs)
    - [Open (5)](#open-5)
  - [Mitigated Bugs](#mitigated-bugs)
    - [Mitigated (3)](#mitigated-3)
  - [Fixed Bugs](#fixed-bugs)
    - [Fixed (20)](#fixed-20)
  - [How to Use This System](#how-to-use-this-system)
    - [Reporting a New Bug](#reporting-a-new-bug)
    - [Moving a Bug Between States](#moving-a-bug-between-states)
    - [Regenerating This Index](#regenerating-this-index)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Bug Tracking Index

This directory contains the project's bug tracking system with individual files per bug.

## Summary

**Total Bugs**: 28
- **Open**: 5
- **Mitigated**: 3
- **Fixed**: 20

**Last Updated**: 2025-10-28 16:07:19

## Priority Breakdown

- **Critical**: 1
- **High**: 6
- **Medium**: 14
- **Low**: 5
- **Unknown**: 2

## Component Breakdown

- **backend**: 4
- **backend, frontend, database**: 1
- **docs**: 5
- **frontend**: 11
- **frontend/testing**: 3
- **infrastructure**: 3
- **unknown**: 1

---

## Open Bugs

### Open (5)

| ID | Title | Priority | Component | Created | Updated |
|----|-------|----------|-----------|---------|---------|
| BUG-0003 | [Content Generation Modal Doesn't Reopen After Closing](open/BUG-0003-modal-doesnt-reopen-after-closing.md) | medium | frontend | 2025-10-22 | 2025-10-24 |
| BUG-0004 | ["All" tab not rendering job cards in E2E tests](open/BUG-0004-all-tab-not-rendering-job-cards-in-e2e-tests.md) | high | frontend | 2025-10-23 | 2025-10-24 |
| ISSUE-006 | [Brittle Placeholder Validation in Description Checking](open/ISSUE-006-brittle-placeholder-validation.md) | medium | frontend | 2025-10-22 | 2025-10-22 |
| ISSUE-010 | [CLAUDE.md Size and Token Usage Monitoring](open/ISSUE-010-claude-md-size-token-usage.md) | low | docs | 2025-10-23 | 2025-10-23 |
| ISSUE-012 | [Zero-Warning Clean Build Policy for Rust and TypeScript](open/ISSUE-012-zero-warning-clean-build-policy.md) | medium | infrastructure | 2025-10-24 | 2025-10-24 |

## Mitigated Bugs

### Mitigated (3)

| ID | Title | Priority | Component | Created | Updated |
|----|-------|----------|-----------|---------|---------|
| ISSUE-009 | [Session Management and Documentation Best Practices](mitigated/ISSUE-009-session-reminders.md) | low | docs | 2025-10-23 | 2025-10-23 |
| ISSUE-013 | [TAP Testing Infrastructure Planned But Unused - E2E-Only Strategy](mitigated/ISSUE-013-tap-infrastructure-unused-e2e-only.md) | low | frontend | 2025-10-24 | 2025-10-24 |
| ISSUE-017 | [New Badge System E2E Test Failures](mitigated/ISSUE-017-new-badge-system-e2e-test-failures.md) | medium | frontend | 2025-10-24 | 2025-10-24 |

## Fixed Bugs

### Fixed (20)

| ID | Title | Priority | Component | Created | Updated |
|----|-------|----------|-----------|---------|---------|
| N/A | [Untitled](fixed/ISSUE-019-macos-nearly-chokes-to-death-during-test-runs.md) | N/A | N/A | N/A | N/A |
| BUG-0001 | [Stale React State in Filtered Tab - No Auto-Refresh Mechanism](fixed/BUG-0001-stale-react-state-filtered-tab.md) | medium | frontend | 2025-10-21 | 2025-10-21 |
| BUG-0002 | [Missing Scores on Some Job Cards](fixed/BUG-0002-missing-scores-on-job-cards.md) | high | backend | 2025-10-22 | 2025-10-22 |
| ISSUE-001 | [LLM extraction fails on HTML-heavy Dice emails](fixed/ISSUE-001-html-preprocessing-llm-extraction.md) | medium | backend | 2025-10-20 | 2025-10-21 |
| ISSUE-002 | [Gmail emails missing body content due to Base64 decoding failure](fixed/ISSUE-002-gmail-base64-decoding-email-bodies.md) | high | backend | 2025-10-19 | 2025-10-19 |
| ISSUE-003 | [Duplicate Gmail emails not linked to existing jobs](fixed/ISSUE-003-duplicate-emails-not-linked-to-jobs.md) | high | backend | 2025-10-19 | 2025-10-19 |
| ISSUE-004 | [Multi-Criteria Weighted Job Scoring System](fixed/ISSUE-004-multi-criteria-job-scoring-system.md) | high | backend, frontend, database | 2025-10-21 | 2025-10-22 |
| ISSUE-005 | [Jobs with Missing Descriptions Not Ranked Appropriately](fixed/ISSUE-005-missing-job-descriptions-ranking.md) | medium | frontend | 2025-10-22 | 2025-10-22 |
| ISSUE-007 | [Phase Documentation Naming Conflict](fixed/ISSUE-007-phase-documentation-naming-conflict.md) | medium | docs | 2025-10-23 | 2025-10-23 |
| ISSUE-008 | [README.md Token Bloat - Bifurcate Developer and End-User Documentation](fixed/ISSUE-008-readme-token-bloat-bifurcate-docs.md) | medium | docs | 2025-10-23 | 2025-10-23 |
| ISSUE-011 | [File Path Prefix Conventions (./) - When Required vs Optional](fixed/ISSUE-011-file-path-prefix-conventions.md) | low | docs | 2025-10-24 | 2025-10-24 |
| ISSUE-014 | [Work Session Tagging Convention](fixed/ISSUE-014-work-session-tagging-convention.md) | low | infrastructure | 2025-10-24 | 2025-10-24 |
| ISSUE-015 | [E2E LLM Generation Test Inefficiency](fixed/ISSUE-015-e2e-llm-generation-test-inefficiency.md) | critical | frontend | 2025-10-24 | 2025-10-24 |
| ISSUE-016 | [Content Generation Error Handling Gaps](fixed/ISSUE-016-content-generation-error-handling-gaps.md) | medium | frontend | 2025-10-24 | 2025-10-24 |
| ISSUE-018 | [Frontend Unit Test Implementation](fixed/ISSUE-018-frontend-unit-test-implementation.md) | medium | frontend | 2025-10-24 | 2025-10-28 |
| ISSUE-019 | [Migrate Jest to Vitest with TypeScript-First Testing](fixed/ISSUE-019-migrate-jest-to-vitest-typescript-first.md) | medium | frontend | 2025-10-24 | 2025-10-24 |
| ISSUE-020 | [SessionStart Hook Working Directory Enforcement](fixed/ISSUE-020-sessionstart-hook-working-directory-enforcement.md) | medium | infrastructure | 2025-10-25 | 2025-10-25 |
| ISSUE-021 | [Vitest Execution Reliability Problems](fixed/ISSUE-021-vitest-execution-reliability-problems.md) | N/A | frontend/testing | 2025-10-27 | 2025-10-27 |
| ISSUE-022 | [Falling back from Vitest to Jest](fixed/ISSUE-022-falling-back-from-vitest-to-jest.md) | high | frontend/testing | 2025-10-27 | 2025-10-27 |
| ISSUE-023 | [Frontend test failures - Content Generation state propagation issues](fixed/ISSUE-023-frontend-test-failures---content-generation-state-propagation-issues.md) | medium | frontend/testing | 2025-10-27 | 2025-10-28 |

---

## How to Use This System

### Reporting a New Bug

1. Copy `BUG-TEMPLATE.md` to `bugs/open/BUG-XXXX-short-description.md`
2. Increment the bug ID (check existing bugs for next number)
3. Fill out all sections of the template
4. Run `./scripts/generate-bug-index.py` to update this index
5. Commit the new bug file and updated README.md

### Moving a Bug Between States

- **Open → Mitigated**: Move file from `bugs/open/` to `bugs/mitigated/`, update `status: mitigated` in frontmatter
- **Mitigated → Fixed**: Move file from `bugs/mitigated/` to `bugs/fixed/`, update `status: fixed` and add `fixed: YYYY-MM-DD`
- **Open → Fixed**: Move file from `bugs/open/` to `bugs/fixed/`, update `status: fixed` and add `fixed: YYYY-MM-DD`

After moving, run `./scripts/generate-bug-index.py` to update this index.

### Regenerating This Index

```bash
./scripts/generate-bug-index.py
# or
python3 scripts/generate-bug-index.py
```

---

**Auto-generated by**: `scripts/generate-bug-index.py`
**Generated on**: 2025-10-28 16:07:19
