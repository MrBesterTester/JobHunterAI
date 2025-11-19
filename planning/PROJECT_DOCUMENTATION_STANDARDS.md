<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Project Documentation Standards](#project-documentation-standards)
  - [Core Pattern: Plans → Results → Archive](#core-pattern-plans-%E2%86%92-results-%E2%86%92-archive)
    - [Development Track](#development-track)
    - [Testing Track](#testing-track)
  - [Document Purposes (Not Rigid Rules)](#document-purposes-not-rigid-rules)
    - [Plans (Static, Reference)](#plans-static-reference)
    - [Results (Living, Workspace)](#results-living-workspace)
    - [Archives (Append-Only, Permanent)](#archives-append-only-permanent)
    - [Guides (Static, Reference)](#guides-static-reference)
  - [Practical Guidelines (Not Rules)](#practical-guidelines-not-rules)
    - [1. **When to Archive** (Flexible, Not Scheduled)](#1-when-to-archive-flexible-not-scheduled)
    - [2. **"Next Steps" Positioning** (User Preference, Not Law)](#2-next-steps-positioning-user-preference-not-law)
    - [3. **Document Length** (Practical, Not Prescriptive)](#3-document-length-practical-not-prescriptive)
    - [4. **Timestamp Standards** (Accountability)](#4-timestamp-standards-accountability)
  - [Document Relationships](#document-relationships)
    - [Current State (Where to look for what)](#current-state-where-to-look-for-what)
    - [Reference in CLAUDE.md](#reference-in-claudemd)
  - [What Makes This Pattern Work](#what-makes-this-pattern-work)
    - [1. **Clear Separation of Concerns**](#1-clear-separation-of-concerns)
    - [2. **Natural Growth**](#2-natural-growth)
    - [3. **Flexible, Not Rigid**](#3-flexible-not-rigid)
    - [4. **Purpose-Driven**](#4-purpose-driven)
  - [Examples of What's Working](#examples-of-whats-working)
    - [TESTING_STATUS.md + TESTING_HISTORY.md (The Model)](#testing_statusmd--testing_historymd-the-model)
    - [PROJECT_STATUS.md + PROJECT_HISTORY.md (Same Pattern)](#project_statusmd--project_historymd-same-pattern)
  - [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
    - [❌ Rigid Rules](#-rigid-rules)
    - [❌ Process Overhead](#-process-overhead)
    - [❌ Missing the Point](#-missing-the-point)
  - [Guiding Principles](#guiding-principles)
  - [When to Revise This Document](#when-to-revise-this-document)
  - [Summary: What Actually Matters](#summary-what-actually-matters)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Project Documentation Standards

**Status**: Living Document
**Last Updated**: 2025-11-19
**Purpose**: Document the patterns that work for organizing project documentation

---

## Core Pattern: Plans → Results → Archive

**What's Working** (from CLAUDE.md "Quick Reference: Where to Find Things"):

### Development Track
```
Plans → Results → Archive
PHASE_X.md → PROJECT_STATUS.md → PROJECT_HISTORY.md
(detailed plan) → (current + recent) → (completed milestones)
```

### Testing Track
```
Plan → Results → Archive + Guide
README_auto-test-plan.md → TESTING_STATUS.md → TESTING_HISTORY.md + TESTING_GUIDE.md
(strategy) → (current + recent) → (completed work) + (how-to)
```

**Key Insight**: "Results" documents are **workspaces** that contain:
- Current state (what's happening now)
- Terse recent history (last few completions for context)
- Links to detailed plans and archives

---

## Document Purposes (Not Rigid Rules)

### Plans (Static, Reference)
**Examples**: `docs/PHASE_X.md`, `README_auto-test-plan.md`, `planning/*.md`

**Purpose**: Detailed implementation plans, strategies, designs

**Characteristics**:
- Created once, rarely updated (static)
- Comprehensive and detailed
- Length: As long as needed to explain the plan
- Archived: Never (they're reference docs)

---

### Results (Living, Workspace)
**Examples**: `docs/PROJECT_STATUS.md`, `docs/TESTING_STATUS.md`

**Purpose**: Current state + terse recent history

**Characteristics**:
- Updated frequently (living documents)
- Balance: Current enough to be useful, not so detailed it's overwhelming
- Contains "what's next" prominently (user preference: near top)
- Length: As long as useful, archive when unwieldy
- Pattern: Keep current state + last few weeks of context

**What to keep**:
- Current phase/milestone
- Recent completions (provides context)
- Open issues/blockers
- Next steps (prominently positioned)
- Current metrics

**What to archive** (when Results docs get too long):
- Completed phases/milestones
- Detailed investigation logs
- Historical comparisons (keep current snapshot only)
- Resolved issues older than ~2 weeks

---

### Archives (Append-Only, Permanent)
**Examples**: `docs/PROJECT_HISTORY.md`, `docs/TESTING_HISTORY.md`

**Purpose**: Permanent record of completed work

**Characteristics**:
- Append-only (rarely modified, only added to)
- Organized by date (month/week)
- Detailed historical records
- Length: Unlimited (grows over time)
- Archived: Never (this IS the archive)

**Content**:
- Completed phases/milestones with dates
- Detailed work logs from Results docs
- Historical metrics snapshots
- Resolved issues summaries
- Lessons learned

---

### Guides (Static, Reference)
**Examples**: `docs/TESTING_GUIDE.md`, `docs/PLAYWRIGHT_BEST_PRACTICES.md`

**Purpose**: How-to, investigation workflows, best practices

**Characteristics**:
- Reference material (static, updated when new patterns emerge)
- Case studies and examples
- Reusable checklists
- Length: As long as needed to explain patterns
- Archived: Never (they're reference docs)

---

## Practical Guidelines (Not Rules)

### 1. **When to Archive** (Flexible, Not Scheduled)

Archive content from Results → Archive when:
- ✅ Results doc gets unwieldy (hard to find current state)
- ✅ Phase/milestone completes
- ✅ Major work finished and documented
- ✅ User requests it

**Don't archive**:
- ❌ On arbitrary schedule (no "weekly archive Fridays")
- ❌ Just because line count hit some number
- ❌ If the content is still actively referenced

### 2. **"Next Steps" Positioning** (User Preference, Not Law)

**User preference**: Next Steps near the top of Results documents

**Why**: Quick visibility of priorities without scrolling

**How**: Place "Next Steps" or "Recommended Next Steps" as section #2 or #3 (after "Current State" or "Last Updated")

**Note**: This is a preference, not a rigid requirement. If a different structure makes more sense for a particular document, that's fine.

### 3. **Document Length** (Practical, Not Prescriptive)

**Guideline**: If a Results document is so long that current state is hard to find, consider archiving older content.

**Not a rule**: There's no magic number (300 lines, 500 lines, etc.). If the document serves its purpose, length is fine.

**Signal to archive**: When you (or user) has to scroll multiple screens to find current state or next steps.

### 4. **Timestamp Standards** (Accountability)

**Required** (this one IS strict): Use full timestamps in format `YYYY-MM-DD HH:MM:SS TZ`

**Why**: Precise point-in-time references for all documentation

**Command**: `date "+%Y-%m-%d %H:%M:%S %Z"`

**Applies to**:
- PROJECT_STATUS.md - "Last Updated" (top and bottom)
- TESTING_STATUS.md - All timestamp fields
- TESTING_HISTORY.md - All timestamp fields
- Bug tracking files - created, updated, fixed fields
- Work summaries - Date headers

---

## Document Relationships

### Current State (Where to look for what)

| Need | Document | Type |
|------|----------|------|
| What's the current phase? | PROJECT_STATUS.md | Results |
| What should I work on next? | PROJECT_STATUS.md (Next Steps) | Results |
| What's the plan for Phase X? | docs/PHASE_X.md | Plans |
| What was completed last month? | PROJECT_HISTORY.md | Archive |
| What's the current test status? | TESTING_STATUS.md | Results |
| How do I investigate test failures? | TESTING_GUIDE.md | Guide |
| What are the E2E best practices? | PLAYWRIGHT_BEST_PRACTICES.md | Guide |
| What tests ran last week? | TESTING_HISTORY.md | Archive |
| What bugs are open? | bugs/README.md (index) | Index |
| What's the detailed bug info? | bugs/open/BUG-NNN.md | Details |

### Reference in CLAUDE.md

This pattern is documented in CLAUDE.md under "Quick Reference: Where to Find Things":

**Development Track:**
- **Plans**: `docs/PHASE_*.md` - Detailed development plans
- **Results**: `docs/PROJECT_STATUS.md` - Summary results + terse recent history
- **Archive**: `docs/PROJECT_HISTORY.md` - Detailed milestone history (permanent record)

**Testing Track:**
- **Plan**: `README_auto-test-plan.md` - Comprehensive testing strategy
- **Results**: `docs/TESTING_STATUS.md` - Latest test run + workspace for next round
- **Archive**: `docs/TESTING_HISTORY.md` - Completed testing work history (permanent record)
- **Guide**: `docs/TESTING_GUIDE.md` - Testing principles and investigation workflows

**Key Pattern**: Plans → Results → Archive (with Results keeping only current state + terse history)

---

## What Makes This Pattern Work

### 1. **Clear Separation of Concerns**
- Plans = "What we're going to do"
- Results = "Where we are now + what we just did"
- Archives = "What we've accomplished historically"
- Guides = "How to do things"

### 2. **Natural Growth**
- Plans grow as designs evolve
- Results stay manageable by archiving completed work
- Archives grow indefinitely (that's fine, they're archives)
- Guides grow as new patterns emerge

### 3. **Flexible, Not Rigid**
- Archive when documents get unwieldy, not on schedule
- Length limits are guidelines, not laws
- Structure preferences (like "Next Steps near top") are helpful, not mandatory
- Adapt the pattern to what works for your workflow

### 4. **Purpose-Driven**
- Each document has a clear purpose
- If a document serves its purpose, it's working
- If users can't find what they need, reorganize
- Focus on utility, not arbitrary rules

---

## Examples of What's Working

### TESTING_STATUS.md + TESTING_HISTORY.md (The Model)

**What works**:
- ✅ TESTING_STATUS.md keeps latest test run + current issues
- ✅ Older test runs archived to TESTING_HISTORY.md
- ✅ Easy to find current state (top of TESTING_STATUS.md)
- ✅ Historical context preserved (TESTING_HISTORY.md)
- ✅ Documents serve their purpose

**What doesn't matter**:
- ❌ Exact line count (462 lines in TESTING_STATUS.md - fine!)
- ❌ Whether "Next Steps" is section #2 vs #3
- ❌ Whether archiving happens weekly vs monthly

### PROJECT_STATUS.md + PROJECT_HISTORY.md (Same Pattern)

**What works**:
- ✅ PROJECT_STATUS.md shows current phase + recent work
- ✅ Completed milestones archived to PROJECT_HISTORY.md
- ✅ Links to detailed PHASE_X.md plans
- ✅ User can find priorities and current state

**What doesn't matter**:
- ❌ Exact line count (980 lines - if it works, it works!)
- ❌ Perfect structure adherence
- ❌ Rigid archiving schedules

---

## Anti-Patterns to Avoid

### ❌ Rigid Rules
- "MUST be section #2" - too prescriptive
- "Max 300 lines" - arbitrary limits
- "Archive every Friday" - creates busywork
- "Reject updates that violate standards" - enforcement theater

### ❌ Process Overhead
- Weekly mandatory archiving
- Complex approval workflows
- Strict formatting requirements
- Automated enforcement

### ❌ Missing the Point
- Focusing on structure instead of purpose
- Optimizing for rules compliance instead of utility
- Creating work for the sake of process
- Forgetting that docs serve users, not vice versa

---

## Guiding Principles

1. **Purpose over Process**: Does the document serve its purpose?
2. **Utility over Uniformity**: Does it help users find what they need?
3. **Flexible over Fixed**: Adapt the pattern to what works
4. **Natural over Scheduled**: Archive when needed, not on calendar
5. **Simple over Complex**: Fewer rules, more common sense

---

## When to Revise This Document

Update this document when:
- ✅ New patterns emerge that work well
- ✅ Current patterns stop serving their purpose
- ✅ User feedback indicates confusion about document organization
- ✅ Case studies demonstrate better approaches

Don't update when:
- ❌ Someone violates an arbitrary rule (there aren't many)
- ❌ Line counts exceed guidelines (if docs still work, they're fine)
- ❌ Structure doesn't match some ideal (utility > structure)

---

## Summary: What Actually Matters

**The Pattern**: Plans → Results → Archive (+ Guides)

**The Purposes**:
- Plans: Detailed designs (reference)
- Results: Current state + recent work (workspace)
- Archives: Historical record (permanent)
- Guides: How-to and best practices (reference)

**The Practices**:
- Archive when Results docs get unwieldy
- Keep Next Steps prominently visible (user preference)
- Use full timestamps for accountability
- Focus on utility over rules

**The Philosophy**:
- Patterns over processes
- Flexibility over rigidity
- Purpose over perfection
- What works over what's prescribed

---

**Status**: This version reflects what's actually working as of 2025-11-19.

**Related**: See CLAUDE.md "Quick Reference: Where to Find Things" for the canonical reference.
