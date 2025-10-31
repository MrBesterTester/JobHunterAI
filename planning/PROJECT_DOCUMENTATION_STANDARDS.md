<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Project Documentation Standards](#project-documentation-standards)
  - [Table of Contents](#table-of-contents)
  - [Core Principle: Living Documents vs Historical Archives](#core-principle-living-documents-vs-historical-archives)
  - [Proposed Documentation Structure Standards](#proposed-documentation-structure-standards)
    - [1. PROJECT_STATUS.md - The "Dashboard" (Target: 200-300 lines)](#1-project_statusmd---the-dashboard-target-200-300-lines)
    - [2. PROJECT_HISTORY.md - The Archive (NEW FILE)](#2-project_historymd---the-archive-new-file)
    - [3. TESTING_STATUS.md - Current Testing State (Target: < 250 lines)](#3-testing_statusmd---current-testing-state-target--250-lines)
  - [Update Workflow Standards](#update-workflow-standards)
    - [Daily/Per-Session Updates:](#dailyper-session-updates)
    - [Weekly Archive Process (Friday or end of work week):](#weekly-archive-process-friday-or-end-of-work-week)
    - [Archive Decision Matrix:](#archive-decision-matrix)
  - [Document Length Guidelines](#document-length-guidelines)
  - [Special Rule: "Next Steps" Positioning](#special-rule-next-steps-positioning)
  - [Proposed New File Structure](#proposed-new-file-structure)
  - [Implementation Plan](#implementation-plan)
    - [Phase 1: Create PROJECT_HISTORY.md (30 minutes)](#phase-1-create-project_historymd-30-minutes)
    - [Phase 2: Trim PROJECT_STATUS.md (45 minutes)](#phase-2-trim-project_statusmd-45-minutes)
    - [Phase 3: Trim TESTING_STATUS.md (30 minutes)](#phase-3-trim-testing_statusmd-30-minutes)
    - [Phase 4: Update CLAUDE_WORKFLOWS.md (15 minutes)](#phase-4-update-claude_workflowsmd-15-minutes)
  - [Proposed Addition to CLAUDE_WORKFLOWS.md](#proposed-addition-to-claude_workflowsmd)
  - [Research Foundation](#research-foundation)
    - [Living Documents](#living-documents)
    - [Status Reports Best Practices](#status-reports-best-practices)
    - [Documentation Organization](#documentation-organization)
    - [Document Lifecycle](#document-lifecycle)
    - [Version Control & History](#version-control--history)
  - [Key Takeaways](#key-takeaways)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Project Documentation Standards

**Status**: Proposal (Under Review)
**Created**: 2025-10-31
**Purpose**: Establish rigorous standards for project documentation organization and maintenance

**Problem Statement**: Current status documents suffer from "documentation debt" - accumulation of historical information that obscures current status and makes next steps hard to find. Guidelines exist in CLAUDE.md but aren't enforced strongly enough.

---

## Table of Contents

- [Core Principle: Living Documents vs Historical Archives](#core-principle-living-documents-vs-historical-archives)
- [Proposed Documentation Structure Standards](#proposed-documentation-structure-standards)
  - [1. PROJECT_STATUS.md - The "Dashboard"](#1-project_statusmd---the-dashboard)
  - [2. PROJECT_HISTORY.md - The Archive](#2-project_historymd---the-archive)
  - [3. TESTING_STATUS.md - Current Testing State](#3-testing_statusmd---current-testing-state)
- [Update Workflow Standards](#update-workflow-standards)
- [Document Length Guidelines](#document-length-guidelines)
- [Special Rule: "Next Steps" Positioning](#special-rule-next-steps-positioning)
- [Proposed New File Structure](#proposed-new-file-structure)
- [Implementation Plan](#implementation-plan)
- [Proposed Addition to CLAUDE_WORKFLOWS.md](#proposed-addition-to-claude_workflowsmd)
- [Research Foundation](#research-foundation)
- [Key Takeaways](#key-takeaways)

---

## Core Principle: Living Documents vs Historical Archives

**Industry Standard** (from 2025 documentation best practices research):
- **Status Documents** = Living, continuously updated, **current state only**
- **History Documents** = Archive of completed work, **rarely updated**
- **Git History** = Detailed change tracking (we already use this!)

**Your Current State**:
- ❌ PROJECT_STATUS.md: 563 lines (target: 200-300)
- ❌ TESTING_STATUS.md: 537 lines (should be < 250)
- ✅ TESTING_HISTORY.md exists but pattern not applied project-wide

**The Problem**: Status documents accumulate historical information, making current status hard to find. Research shows status reports should be "brief" and "consumable" - large amounts of data chopped down into easily digestible format.

---

## Proposed Documentation Structure Standards

### 1. PROJECT_STATUS.md - The "Dashboard" (Target: 200-300 lines)

**REQUIRED STRUCTURE** (strict order):

```markdown
# Project Status

**Last Updated**: YYYY-MM-DD HH:MM:SS TZ

---

## Current State (< 10 lines)
- Phase/milestone
- Key metric snapshot (test pass rate, coverage, bug count)
- Overall health indicator

---

## ⭐ NEXT STEPS (TOP 3-5 ITEMS) ← MUST BE SECTION #2!

**1. [High Priority Item]** (Estimated: X hours)
   - Why: [Business justification]
   - Blocks: [What it unblocks]

**2. [Medium Priority Item]** (Estimated: X hours)
   - Why: [Business justification]

**3. [Optional Item]** (Estimated: X hours)

**Total Estimated Time to Next Milestone**: X hours/days

---

## Development Phases (Overview Only)
- Phase table with status/progress only
- NO detailed descriptions (link to PHASE_X.md files)

---

## Current Sprint/Focus (Last 7-10 Days)
- Recent completions (last 7-10 days only)
- Move older items to PROJECT_HISTORY.md weekly

---

## Open Issues (Blockers Only)
- Critical/High priority bugs only
- Link to bugs/open/ directory for full list

---

## Key Metrics (Current Snapshot)
- Test counts, coverage, bug counts
- NO historical comparisons (use PROJECT_HISTORY.md)

---

## Related Documentation
- Links to other docs

---

**Last Updated**: YYYY-MM-DD HH:MM:SS TZ
**Archive Note**: Completed work older than 10 days → PROJECT_HISTORY.md
```

**STRICT RULES:**
1. ⭐ **"NEXT STEPS" MUST BE SECTION #2** (after Current State, before everything else)
2. Maximum 300 lines (if longer, archive content!)
3. Only last 7-10 days of activity (move rest to history)
4. NO detailed implementation logs (those go in history or git commits)

**Rationale**:
- User needs to see priorities immediately (no scrolling)
- Status documents are action-oriented, not just informational
- Industry best practice: "Top 3-5 priorities" visible at top
- Brief reports are more consumable and actionable

---

### 2. PROJECT_HISTORY.md - The Archive (NEW FILE)

**Purpose**: Archive of completed milestones, historical metrics, resolved issues

**Structure**:
```markdown
# Project History & Completed Work

**Purpose**: Historical archive of project milestones and completed work
**For current status**: See [PROJECT_STATUS.md](PROJECT_STATUS.md)

---

## Table of Contents
- [2025-10 October](#2025-10-october)
- [2025-09 September](#2025-09-september)

---

## 2025-10 October

### Week of 2025-10-28 (Oct 28 - Nov 3)
**Focus**: Phase 2.4 Testing & Validation

**Completed**:
- ✅ Phase 2.4: E2E testing (65/69 tests passing = 94.2%)
- ✅ Phase 2.4: Backend unit test analysis (23 tests verified)
- ✅ RSBuild migration validation (5x build speed improvement)

**Metrics Snapshot** (2025-10-31):
- Backend: 158/158 tests passing
- Frontend: 516/517 tests passing (99.8%)
- E2E: 402/547 passing (73.5%)
- Coverage: 78.3%

**Key Decisions**:
- Decided to proceed with Phase 2.5 after OAuth testing
- Deferred 4 frontend UX issues to future work

[Detailed logs: git commits, work summary docs]

---

### Week of 2025-10-21 (Oct 21-27)
...
```

**Archive Triggers** (when to move content from STATUS → HISTORY):
- Phase/sub-phase completes
- Major milestone achieved
- Week ends (move completed work from last week)
- Metrics snapshots (weekly/bi-weekly)
- Resolved issues/bugs (summary only, link to bug files)

**Benefits**:
- Keeps status document focused on "what's next"
- Preserves historical context for future reference
- Enables trend analysis without bloating status docs
- Supports audits and knowledge sharing

---

### 3. TESTING_STATUS.md - Current Testing State (Target: < 250 lines)

**REQUIRED STRUCTURE**:
```markdown
# Testing Status

**Last Updated**: YYYY-MM-DD HH:MM:SS TZ
**Purpose**: Current testing state and open issues
**For completed work**: See [TESTING_HISTORY.md](TESTING_HISTORY.md)

---

## Latest Test Run (Most Recent Only)
- Date/time of last comprehensive run
- Quick summary table (pass/fail/skip counts)
- Comparison to previous run (1-2 lines)

---

## Open Testing Issues (Blockers Only)
- List current testing blockers
- Link to bug files for details

---

## Test Suite Overview (Current Snapshot)
- Backend: X passing, Y failing
- Frontend: X passing, Y skipped
- E2E: X passing, Y failing
- Coverage: X%

---

## Quick Commands Reference
[Keep this - it's useful]

---

**Archive Note**: Detailed test investigations → TESTING_HISTORY.md
**Archive Note**: Historical test runs → TESTING_HISTORY.md
```

**What Gets ARCHIVED to TESTING_HISTORY.md**:
- Detailed test investigation logs (like Phase 2.4 E2E analysis)
- Historical test run results (older than last 2 runs)
- Completed test improvement work (ISSUE-018, 023, 024, etc.)
- Performance trend analysis (keep current snapshot only)

**Example of Content to Archive**: The detailed "Phase 2.4 E2E Test Results" section (currently 136 lines in TESTING_STATUS.md) should move to TESTING_HISTORY.md, leaving only a 5-10 line summary with link to history.

---

## Update Workflow Standards

### Daily/Per-Session Updates:
1. Update timestamp on EVERY edit
2. Add completed items to "Current Sprint/Focus" section
3. Update "Next Steps" if priorities change
4. Keep "Next Steps" at section #2 position ALWAYS

### Weekly Archive Process (Friday or end of work week):
```bash
# 1. Review PROJECT_STATUS.md
# 2. Move completed work older than 7 days to PROJECT_HISTORY.md
# 3. Move detailed test logs to TESTING_HISTORY.md
# 4. Update metrics snapshots
# 5. Verify "Next Steps" is current and at top
# 6. Check document length (PROJECT_STATUS < 300 lines)
```

### Archive Decision Matrix:

| Content Type | Keep in Status If... | Archive If... |
|--------------|---------------------|---------------|
| Completed work | < 7-10 days old | > 10 days old |
| Test runs | Last 2 runs | Older runs |
| Bugs/Issues | Open or recently closed | Closed > 7 days ago |
| Phase details | Currently active | Phase complete |
| Implementation logs | Never (too detailed) | Always |
| Metrics | Current snapshot only | Historical comparisons |
| Next Steps | Always (section #2!) | Never |

**Rationale**: Research on document lifecycle management indicates obsolete content should be archived when no longer needed for day-to-day work. This maintains organized systems and reduces clutter.

---

## Document Length Guidelines

**Maximum Target Lengths** (based on "brief status report" best practice):

| Document | Target | Current | Action Needed |
|----------|--------|---------|---------------|
| PROJECT_STATUS.md | 200-300 lines | 563 lines | ⚠️ Archive 250+ lines |
| TESTING_STATUS.md | 150-250 lines | 537 lines | ⚠️ Archive 300+ lines |
| PROJECT_HISTORY.md | Unlimited | N/A (new) | ✅ Create |
| TESTING_HISTORY.md | Unlimited | 673 lines | ✅ Good |

**Why Length Matters**:
- Research shows status reports should be "brief" and "consumable"
- Users shouldn't have to scroll past 3-4 screens to find what to do next
- Large amounts of data should be "chopped down" into digestible format
- Action items should be immediately visible

**Enforcement**:
- Claude should warn when status docs exceed max length
- Weekly archive process is mandatory, not optional
- Reject documentation updates that violate length limits

---

## Special Rule: "Next Steps" Positioning

**STRICT REQUIREMENT**: "Next Steps" or "Recommended Next Steps" MUST be section #2 in all status documents (immediately after "Current State").

**Rationale**:
- User needs to see priorities immediately (no scrolling)
- Status documents are action-oriented, not just informational
- Industry best practice: "Top 3-5 priorities" visible at top
- **User feedback**: Constantly having to insist on this placement

**Enforcement**:
- Add this to CLAUDE_WORKFLOWS.md as a required check
- Claude should verify "Next Steps" position on every status update
- Automated check: grep for section headers, verify "Next Steps" is second

**Non-Negotiable**: This is not a suggestion or guideline. This is a hard requirement. If "Next Steps" is not section #2, the document update is incomplete.

---

## Proposed New File Structure

```
docs/
├── PROJECT_STATUS.md          # Living (200-300 lines max)
├── PROJECT_HISTORY.md         # Archive (NEW - unlimited)
├── TESTING_STATUS.md          # Living (150-250 lines max)
├── TESTING_HISTORY.md         # Archive (existing, good!)
├── PHASE_X.md                 # Phase plans (detailed, static)
└── TESTING_GUIDE.md           # How-to guide (static)

bugs/
├── README.md                  # Auto-generated index
├── open/                      # Active bugs
├── mitigated/                 # Partial fixes
└── fixed/                     # Resolved (archive)

planning/                      # Feature designs (static)

Root level:
├── CLAUDE.md                  # Project guidance (static)
├── CLAUDE_WORKFLOWS.md        # Workflow standards (static)
├── README.md                  # User guide (static)
├── README_dev.md              # Developer guide (static)
└── README_work-summary-*.md   # Session summaries (archive, dated)
```

**Key Changes**:
- **NEW**: `docs/PROJECT_HISTORY.md` - Missing archive file
- **Existing**: `docs/TESTING_HISTORY.md` - Good pattern to replicate

---

## Implementation Plan

### Phase 1: Create PROJECT_HISTORY.md (30 minutes)
1. Create new `docs/PROJECT_HISTORY.md`
2. Move completed Phase 2.4 work from PROJECT_STATUS.md
3. Move historical "Major Updates" section
4. Organize by month/week

### Phase 2: Trim PROJECT_STATUS.md (45 minutes)
1. Keep only last 7-10 days of activity
2. Move detailed Phase 2.4 logs to history
3. Simplify Development Phases section (table only, link to PHASE docs)
4. Verify "Next Steps" is section #2
5. Target: < 300 lines

### Phase 3: Trim TESTING_STATUS.md (30 minutes)
1. Move Phase 2.4 E2E detailed analysis to TESTING_HISTORY.md
2. Keep only latest test run results
3. Remove redundant summaries
4. Target: < 250 lines

### Phase 4: Update CLAUDE_WORKFLOWS.md (15 minutes)
1. Add "Status Document Update Standards" section
2. Include "Next Steps positioning" requirement
3. Add weekly archive process

**Total Estimated Time**: 2 hours

**Success Criteria**:
- PROJECT_STATUS.md < 300 lines
- TESTING_STATUS.md < 250 lines
- "Next Steps" is section #2 in both
- Historical content preserved in history files
- Updated workflow standards in CLAUDE_WORKFLOWS.md

---

## Proposed Addition to CLAUDE_WORKFLOWS.md

```markdown
## Status Document Update Standards

### Required Structure

**All status documents** (PROJECT_STATUS.md, TESTING_STATUS.md) MUST follow this structure:

1. Last Updated (timestamp)
2. **⭐ NEXT STEPS** ← MUST BE SECTION #2
3. Current State
4. [Other sections as appropriate]
5. Last Updated (bottom timestamp)

### Length Limits

| Document | Max Lines | Archive If Exceeds |
|----------|-----------|-------------------|
| PROJECT_STATUS.md | 300 lines | Move to PROJECT_HISTORY.md |
| TESTING_STATUS.md | 250 lines | Move to TESTING_HISTORY.md |

### Archive Triggers

Move content from status → history when:
- Completed work > 7-10 days old
- Phase/milestone completes
- Bug/issue closes (keep link in status for 7 days, then archive)
- Weekly documentation review (Fridays)

### Update Checklist

On EVERY status document update:
- [ ] Update timestamp (full format: YYYY-MM-DD HH:MM:SS TZ)
- [ ] Verify "Next Steps" is section #2
- [ ] Check document length (< max lines)
- [ ] Move completed items older than 7-10 days to history
- [ ] Update "Last Updated" at bottom with description

### Enforcement

Claude Code MUST:
- Warn when status docs exceed max line count
- Verify "Next Steps" is section #2 before completing update
- Suggest archiving when completed work > 10 days old
- Reject updates that violate these standards

User MAY:
- Reject PRs/updates if "Next Steps" not at top
- Request immediate archiving if doc length exceeds limits
```

---

## Research Foundation

This proposal is based on industry research and best practices from multiple sources:

### Living Documents
- **Definition**: Electronic documents continuously revised and updated (not created once and finalized)
- **Key Practice**: Regular reviews ensure relevancy, accuracy, compliance
- **Version Control**: System maintains each draft's history (what changed, when)
- **Archive Management**: Outdated versions archived for record-keeping while recent version stays active

### Status Reports Best Practices
- **Purpose**: Outline current state of project
- **Format**: "Brief" documents that "chop down large amounts of data into more consumable document"
- **Frequency**: Weekly or monthly creation by project managers
- **Content**: Key milestones, tasks, updates, decisions, activities, issues, risks, blockers

### Documentation Organization
- **Structure**: "Documentation loaded with helpful information but lacking logical structure is counterproductive"
- **Best Practice**: "Create broad topics and sub-categories to fit all project details"
- **File Management**: "Group files by phase or category and use clear labels"

### Document Lifecycle
- **Obsolescence**: "Occurs when a document is no longer needed for day-to-day work and should be archived or deleted"
- **Archive Benefits**: "Maintain organized system, reduce clutter, meet regulatory/legal requirements"
- **Knowledge Preservation**: "Preserve knowledge and experience gained, provide proof of successes/difficulties, facilitate audits"

### Version Control & History
- **Tracking**: "Powerful system that tracks document changes over time"
- **Benefits**: "Ensuring clarity, enhancing collaboration, providing historical tracking"
- **Best Practice**: "Record lifecycle management - records no longer in current use rarely/never needed for reference should be archived"

**Sources**: Research conducted 2025-10-31 across multiple project management, documentation, and agile methodology resources.

---

## Key Takeaways

1. **Separation of Concerns**: Status = current/actionable, History = archive/reference
2. **"Next Steps" Positioning**: Always section #2 (non-negotiable!)
3. **Length Management**: Status docs should be brief (< 300 lines)
4. **Weekly Archive Process**: Move completed work to history every week
5. **Timestamp Discipline**: Update on EVERY change (accountability)
6. **Create PROJECT_HISTORY.md**: Missing piece to complete the pattern
7. **Enforcement Required**: Current guidelines exist but aren't followed rigorously enough

**Bottom Line**: Your instinct about needing PROJECT_HISTORY.md is correct! The pattern that works for TESTING_STATUS/TESTING_HISTORY should apply project-wide. Current guidelines aren't working because they don't enforce brevity, archiving, or "Next Steps" positioning strictly enough.

**User Feedback Validated**: "I keep on having to insist on putting Next Steps and Next Steps Summaries at the top of the status docs where I can see them" - This proposal makes that positioning a strict, non-negotiable requirement.

---

**Next Steps for This Proposal**:
1. User review and feedback
2. Refinement based on feedback
3. Implementation decision (proceed or defer)
4. If approved: Execute 4-phase implementation plan (2 hours)

**Status**: Under Review (2025-10-31)
