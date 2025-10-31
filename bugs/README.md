<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Bug Tracking Index](#bug-tracking-index)
  - [Summary](#summary)
  - [Priority Breakdown](#priority-breakdown)
  - [Component Breakdown](#component-breakdown)
  - [Open Bugs](#open-bugs)
    - [Open (4)](#open-4)
  - [Mitigated Bugs](#mitigated-bugs)
    - [Mitigated (4)](#mitigated-4)
  - [Fixed Bugs](#fixed-bugs)
    - [Fixed (30)](#fixed-30)
  - [How to Use This System](#how-to-use-this-system)
    - [Reporting a New Bug](#reporting-a-new-bug)
    - [Moving a Bug Between States](#moving-a-bug-between-states)
    - [Regenerating This Index](#regenerating-this-index)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Bug Tracking Index

This directory contains the project's bug tracking system with individual files per bug.

## Summary

**Total Bugs**: 38
- **Open**: 4
- **Mitigated**: 4
- **Fixed**: 30

**Last Updated**: 2025-10-31 16:12:20

## Priority Breakdown

- **Critical**: 1
- **High**: 7
- **Medium**: 17
- **Low**: 11
- **Unknown**: 2

## Component Breakdown

- **backend**: 4
- **backend, frontend, database**: 1
- **docs**: 7
- **frontend**: 16
- **frontend, backend**: 1
- **frontend/testing**: 3
- **infrastructure**: 5
- **unknown**: 1

---

## Open Bugs

### Open (4)

| ID | Title | Priority | Component | Created | Updated |
|----|-------|----------|-----------|---------|---------|
| BUG-0007 | [Phase 5 Feature - Refresh Descriptions Button Not Implemented](open/BUG-0007-phase-5-refresh-descriptions-feature.md) | low | frontend | 2025-10-30 | 2025-10-31 |
| ISSUE-010 | [CLAUDE.md Size and Token Usage Monitoring](open/ISSUE-010-claude-md-size-token-usage.md) | low | docs | 2025-10-23 | 2025-10-23 |
| ISSUE-012 | [Zero-Warning Clean Build Policy for Rust and TypeScript](open/ISSUE-012-zero-warning-clean-build-policy.md) | medium | infrastructure | 2025-10-24 | 2025-10-24 |
| ISSUE-029 | [VSCode Mermaid Diagram Rendering Support](open/ISSUE-029-vscode-mermaid-rendering.md) | low | docs | 2025-10-31 | 2025-10-31 |

## Mitigated Bugs

### Mitigated (4)

| ID | Title | Priority | Component | Created | Updated |
|----|-------|----------|-----------|---------|---------|
| ISSUE-009 | [Session Management and Documentation Best Practices](mitigated/ISSUE-009-session-reminders.md) | low | docs | 2025-10-23 | 2025-10-23 |
| ISSUE-013 | [TAP Testing Infrastructure Planned But Unused - E2E-Only Strategy](mitigated/ISSUE-013-tap-infrastructure-unused-e2e-only.md) | low | frontend | 2025-10-24 | 2025-10-24 |
| ISSUE-017 | [New Badge System E2E Test Failures](mitigated/ISSUE-017-new-badge-system-e2e-test-failures.md) | medium | frontend | 2025-10-24 | 2025-10-24 |
| ISSUE-027 | [Low disk space on development machine](mitigated/ISSUE-027-low-disk-space-on-development-machine.md) | low | infrastructure | 2025-10-31 | 2025-10-31 |

## Fixed Bugs

### Fixed (30)

| ID | Title | Priority | Component | Created | Updated |
|----|-------|----------|-----------|---------|---------|
| N/A | [Untitled](fixed/ISSUE-019-macos-nearly-chokes-to-death-during-test-runs.md) | N/A | N/A | N/A | N/A |
| BUG-0001 | [Stale React State in Filtered Tab - No Auto-Refresh Mechanism](fixed/BUG-0001-stale-react-state-filtered-tab.md) | medium | frontend | 2025-10-21 | 2025-10-21 |
| BUG-0002 | [Missing Scores on Some Job Cards](fixed/BUG-0002-missing-scores-on-job-cards.md) | high | backend | 2025-10-22 | 2025-10-22 |
| BUG-0003 | [Content Generation Modal Doesn't Reopen After Closing](fixed/BUG-0003-modal-doesnt-reopen-after-closing.md) | medium | frontend | 2025-10-22 | 2025-10-30 |
| BUG-0004 | ["All" tab not rendering job cards in E2E tests](fixed/BUG-0004-all-tab-not-rendering-job-cards-in-e2e-tests.md) | high | frontend | 2025-10-23 | 2025-10-30 |
| BUG-0005 | [E2E Test - Debug Section Missing switchToTab Helper](fixed/BUG-0005-e2e-test-debug-section-missing-switchToTab-helper.md) | medium | frontend | 2025-10-30 | 2025-10-30 |
| BUG-0006 | [E2E Test - Description Quality Validation Failures](fixed/BUG-0006-e2e-test-description-quality-validation-failures.md) | high | frontend | 2025-10-30 | 2025-10-30 |
| BUG-0008 | [E2E Tests for Phase 2.4 Features (Calendar, Follow-ups, Timeline)](fixed/BUG-0008-e2e-tests-phase-2.4-features.md) | low | frontend | 2025-10-30 | 2025-10-31 |
| ISSUE-001 | [LLM extraction fails on HTML-heavy Dice emails](fixed/ISSUE-001-html-preprocessing-llm-extraction.md) | medium | backend | 2025-10-20 | 2025-10-21 |
| ISSUE-002 | [Gmail emails missing body content due to Base64 decoding failure](fixed/ISSUE-002-gmail-base64-decoding-email-bodies.md) | high | backend | 2025-10-19 | 2025-10-19 |
| ISSUE-003 | [Duplicate Gmail emails not linked to existing jobs](fixed/ISSUE-003-duplicate-emails-not-linked-to-jobs.md) | high | backend | 2025-10-19 | 2025-10-19 |
| ISSUE-004 | [Multi-Criteria Weighted Job Scoring System](fixed/ISSUE-004-multi-criteria-job-scoring-system.md) | high | backend, frontend, database | 2025-10-21 | 2025-10-22 |
| ISSUE-005 | [Jobs with Missing Descriptions Not Ranked Appropriately](fixed/ISSUE-005-missing-job-descriptions-ranking.md) | medium | frontend | 2025-10-22 | 2025-10-22 |
| ISSUE-006 | [Brittle Placeholder Validation in Description Checking](fixed/ISSUE-006-brittle-placeholder-validation.md) | medium | frontend, backend | 2025-10-22 | 2025-10-30 |
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
| ISSUE-024 | [Frontend Test Coverage Gaps - Components Below 60%](fixed/ISSUE-024-frontend-test-coverage-gaps---components-below-60.md) | medium | frontend | 2025-10-28 | 2025-10-28 |
| ISSUE-025 | [E2E Test Suite Health - Skipped and Failing Tests](fixed/ISSUE-025-e2e-test-suite-health---skipped-and-failing-tests.md) | medium | frontend | 2025-10-28 | 2025-10-28 |
| ISSUE-026 | [CRA Deprecation - RSBuild Migration (Phase 4/5)](fixed/ISSUE-026-cra-deprecation---rsbuild-migration.md) | low | infrastructure | 2025-10-28 | 2025-10-29 |
| ISSUE-028 | [Multiple Markdown Previews in Cursor](fixed/ISSUE-028-two-or-more-previews.md) | low | docs | 2025-10-31 | 2025-10-31 |

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
**Generated on**: 2025-10-31 16:12:20
