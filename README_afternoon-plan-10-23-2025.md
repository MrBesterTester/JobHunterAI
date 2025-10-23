<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Afternoon Work Plan - October 23, 2025](#afternoon-work-plan---october-23-2025)
  - [Prompt](#prompt)
  - [Prioritized Action Items](#prioritized-action-items)
    - [1. **ISSUE-007: Resolve Phase Documentation Naming Conflict** 🔴 HIGH PRIORITY](#1-issue-007-resolve-phase-documentation-naming-conflict--high-priority)
    - [2. **ISSUE-008: Split README.md for Token Efficiency** 🟡 MEDIUM-HIGH PRIORITY](#2-issue-008-split-readmemd-for-token-efficiency--medium-high-priority)
    - [3. **ISSUE-009: Add Session Management Reminders to CLAUDE.md** 🟢 MEDIUM PRIORITY](#3-issue-009-add-session-management-reminders-to-claudemd--medium-priority)
    - [4. **Phase 4.1: Revise Backend Implementation for JSearch API** 🟡 MEDIUM PRIORITY](#4-phase-41-revise-backend-implementation-for-jsearch-api--medium-priority)
    - [5. **Phase 2.7: Begin Prerequisites for Microsoft Email Integration** 🔵 LOWER PRIORITY](#5-phase-27-begin-prerequisites-for-microsoft-email-integration--lower-priority)
  - [Recommended Afternoon Schedule](#recommended-afternoon-schedule)
  - [Success Criteria for Today](#success-criteria-for-today)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Afternoon Work Plan - October 23, 2025

**Generated from**: Morning work summary (README_work-summary-10-23-2025-am.md)

## Prompt

> Now using that document, create a prioritized plan with the most important first that I can use this afternoon when I resume work with you.

---

## Prioritized Action Items

### 1. **ISSUE-007: Resolve Phase Documentation Naming Conflict** 🔴 HIGH PRIORITY

**Why First**: This is a blocker for proper project organization. Phase 2.7 was numbered anticipating this resolution, and continuing without resolving this will compound the confusion.

**Action Items**:
- [ ] Review the 5 proposed solutions in `bugs/open/ISSUE-007-phase-documentation-naming-conflict.md`
- [ ] Make decision on approach:
  - **Option 1 (Recommended)**: Rename Phase 5.x files to Phase 2.4, 2.5, 2.6
  - **Option 5 (Alternative)**: Archive Phase 5.x files and keep Phase 5 available
  - Other options available if preferred
- [ ] Execute the chosen solution (1-3 hours depending on option)
- [ ] Update all cross-references in markdown files
- [ ] Regenerate bug index
- [ ] Commit changes
- [ ] Move ISSUE-007 to `bugs/fixed/`

**Estimated Time**: 1.5-3 hours

**Impact**: Unblocks proper phase numbering, reduces ongoing confusion, enables Phase 2.7 work to proceed with correct context

---

### 2. **ISSUE-008: Split README.md for Token Efficiency** 🟡 MEDIUM-HIGH PRIORITY

**Why Second**: Quick win for token efficiency that affects every Claude Code session going forward. Morning's work identified this as a significant pain point.

**Action Items**:
- [ ] Decide between Option 1 (3-file split) or Option 2 (2-file split)
- [ ] Execute the split:
  - [ ] Create `README_dev.md` with technical content
  - [ ] Create `README_archive.md` (if Option 1)
  - [ ] Rewrite `README.md` for end-user focus
  - [ ] Add cross-references between files
- [ ] Update CLAUDE.md if it references README structure
- [ ] Test all markdown links
- [ ] Commit changes
- [ ] Move ISSUE-008 to `bugs/fixed/`

**Estimated Time**: 1-2 hours

**Impact**: ~70% reduction in README token usage, better documentation navigation, improved developer and end-user experience

---

### 3. **ISSUE-009: Add Session Management Reminders to CLAUDE.md** 🟢 MEDIUM PRIORITY

**Why Third**: Improves ongoing workflow efficiency. Quick implementation that pays dividends in future sessions.

**Action Items**:
- [ ] Decide on approach (Option 1: Add to CLAUDE.md is recommended)
- [ ] Add new section to CLAUDE.md:
  - Session restart guidelines (token thresholds, context scatter)
  - Documentation update workflow (git log review first)
- [ ] Test in next session to ensure reminders are helpful
- [ ] Move ISSUE-009 to `bugs/mitigated/` (since it requires validation over time)

**Estimated Time**: 30-45 minutes

**Impact**: Proactive session management, better documentation updates, systematic use of git history

---

### 4. **Phase 4.1: Revise Backend Implementation for JSearch API** 🟡 MEDIUM PRIORITY

**Why Fourth**: Morning work updated the plan, but the code implementation (completed 10-22) still uses Indeed API. Need to align code with revised plan.

**Action Items**:
- [ ] Review current implementation in `backend/src/main.rs` (lines 3332-3635)
- [ ] Update API client for JSearch instead of Indeed:
  - Change endpoint from `job-search15.p.rapidapi.com` to `jsearch.p.rapidapi.com`
  - Update `RapidApiJobListing` struct for JSearch response format
  - Change search parameters (num_pages, query format)
  - Update rate limits (200/month instead of 500/month)
- [ ] Update tests in `backend/tests/job_intake_tests.rs`
- [ ] Update environment variables (.env, .env.example)
- [ ] Build and test backend
- [ ] Update Phase 4.1 status section with completion notes
- [ ] Commit changes

**Estimated Time**: 2-3 hours

**Impact**: Backend aligns with revised plan, ready for RapidAPI signup and live testing

**Note**: This assumes you want to proceed with Phase 4.1 implementation. Alternatively, you could defer this and move to Phase 2.7 planning/prerequisites instead.

---

### 5. **Phase 2.7: Begin Prerequisites for Microsoft Email Integration** 🔵 LOWER PRIORITY

**Why Fifth**: This is future work that's currently blocked by ISSUE-007 resolution (per the plan document). However, some preparatory work can begin.

**Action Items** (if time permits):
- [ ] Review `docs/PHASE_2.7_samkirk-email-source-plan.md` in detail
- [ ] Create Azure Portal account (if not already done)
- [ ] Begin Azure AD App Registration:
  - Name: "JobHunter Email Integration"
  - Redirect URI: `http://localhost:8080/api/email/microsoft/callback`
  - API permissions: Mail.Read, Mail.ReadWrite
- [ ] Note Client ID and Client Secret
- [ ] Add credentials to `backend/.env` (as placeholders initially)

**Estimated Time**: 30-60 minutes

**Impact**: Unblocks Phase 2.7 implementation when ISSUE-007 is resolved and Phase 4.1 is complete

**Note**: Phase 2.7 plan explicitly states it's "awaiting ISSUE-007 resolution and Phase 4.1 completion" so this is preparatory only.

---

## Recommended Afternoon Schedule

**If you have 4-6 hours of focused work time:**

```
1. ISSUE-007 (1.5-3 hours)         ← MUST DO - Blocker
2. ISSUE-008 (1-2 hours)           ← SHOULD DO - High value
3. ISSUE-009 (30-45 min)           ← SHOULD DO - Quick win
4. Phase 4.1 Revision (2-3 hours)  ← IF TIME - Active work
5. Phase 2.7 Prep (30-60 min)      ← IF TIME - Future prep
```

**If you have 2-3 hours:**

```
1. ISSUE-007 (1.5-3 hours)         ← Focus here, highest impact
2. ISSUE-008 (1-2 hours)           ← If time after ISSUE-007
```

**If you have 1 hour:**

```
1. ISSUE-007 decision + partial execution
   OR
   ISSUE-008 + ISSUE-009 (both quick wins for token efficiency)
```

---

## Success Criteria for Today

**Minimum Success** (2-3 hours):
- ✅ ISSUE-007 resolved and phase documentation properly organized
- ✅ Working tree clean with changes committed

**Target Success** (4-5 hours):
- ✅ ISSUE-007 resolved
- ✅ ISSUE-008 resolved (README split complete)
- ✅ ISSUE-009 resolved (CLAUDE.md updated)
- ✅ All changes committed

**Stretch Success** (6+ hours):
- ✅ All issues resolved
- ✅ Phase 4.1 backend revised for JSearch API
- ✅ Backend tests passing
- ✅ Ready for RapidAPI signup and live testing

---

## Notes

**Token Efficiency Focus**: Items 1-3 directly improve token efficiency and documentation quality, which was the theme of this morning's work.

**Blockers First**: ISSUE-007 is blocking proper organization and should be resolved before continuing significant new development work.

**Quick Wins**: ISSUE-008 and ISSUE-009 are relatively quick but high-impact improvements.

**Code Work**: Phase 4.1 revision is more substantial but necessary to align implementation with the revised plan.

**Context Preservation**: This plan document will help you resume work with minimal context rebuilding. Consider running `claude --continue` to resume this session if you're within a few hours.

---

**Generated**: October 23, 2025 (Morning session with Claude Code)
