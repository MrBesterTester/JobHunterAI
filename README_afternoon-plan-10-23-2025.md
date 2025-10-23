<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Afternoon Work Plan - October 23, 2025](#afternoon-work-plan---october-23-2025)
  - [Prompt](#prompt)
  - [Prioritized Action Items](#prioritized-action-items)
    - [1. **ISSUE-007: Resolve Phase Documentation Naming Conflict** ✅ **COMPLETE**](#1-issue-007-resolve-phase-documentation-naming-conflict--complete)
    - [2. **ISSUE-008: Split README.md for Token Efficiency** ✅ **COMPLETE**](#2-issue-008-split-readmemd-for-token-efficiency--complete)
    - [3. **ISSUE-009: Add Session Management Reminders to CLAUDE.md** ✅ **COMPLETE**](#3-issue-009-add-session-management-reminders-to-claudemd--complete)
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

### 1. **ISSUE-007: Resolve Phase Documentation Naming Conflict** ✅ **COMPLETE**

**Why First**: This is a blocker for proper project organization. Phase 2.7 was numbered anticipating this resolution, and continuing without resolving this will compound the confusion.

**Action Items**:
- [x] Review the 5 proposed solutions in `bugs/open/ISSUE-007-phase-documentation-naming-conflict.md`
- [x] Make decision on approach:
  - **Option 1 (Selected)**: Rename Phase 5.x files to Phase 2.4, 2.5, 2.6
- [x] Execute the chosen solution
- [x] Update all cross-references in markdown files (file paths)
- [x] Update all internal content references (section headers, TOC, inline text - 236 refs)
- [x] Comprehensive verification of all 58 project markdown files
- [x] Regenerate bug index
- [x] Commit changes
- [x] Move ISSUE-007 to `bugs/fixed/`
- [x] Document comprehensive verification in ISSUE-007

**Actual Time**: ~45 minutes (file renames + cross-refs) + ~30 minutes (content refs) = 1.25 hours

**Completion Summary**:
- ✅ Files renamed: Phase 5.1 → 2.4, Phase 5.2 → 2.5, Phase 5.3 → 2.6
- ✅ File path cross-references updated (6 files)
- ✅ Internal content references updated (236 refs across 9 files)
- ✅ Comprehensive verification: 0 Phase 5.x refs remain in active docs
- ✅ Phase 5 namespace now available for "Advanced Features"
- ✅ Commits: 65d13c9, 261d766, e9591d9, 79db04b, cc00850

**Impact**: ✅ Unblocked proper phase numbering, eliminated confusion, Phase 2.7 work can proceed with correct context

---

### 2. **ISSUE-008: Split README.md for Token Efficiency** ✅ **COMPLETE**

**Why Second**: Quick win for token efficiency that affects every Claude Code session going forward. Morning's work identified this as a significant pain point.

**Action Items**:
- [x] Decide between Option 1 (3-file split) or Option 2 (2-file split) - **Selected Option 1**
- [x] Execute the split:
  - [x] Create `README_dev.md` with technical content
  - [x] Create `README_archive.md` (if Option 1)
  - [x] Rewrite `README.md` for end-user focus
  - [x] Add cross-references between files
- [x] Update CLAUDE.md if it references README structure - **No updates needed**
- [x] Test all markdown links - **All working**
- [x] Commit changes
- [x] Move ISSUE-008 to `bugs/fixed/`

**Follow-up Improvements** (based on user feedback):
- [x] Add workflow diagram to README.md for better end-user UX
- [x] Create README_master-plan.md for project implementation history
- [x] Move Implementation Status from README_dev.md to master plan (33% token savings)
- [x] Add cross-references to PHASE docs (avoiding duplication)

**Actual Time**: ~2 hours (initial split + follow-up improvements)

**Impact Achieved**:
- **Initial**: 97% token reduction for end users (45K → 1.4K tokens)
- **Follow-up**: 33% token reduction for developers (45K → 30K tokens)
- **New**: 15K token dedicated project status document (README_master-plan.md)
- Better documentation navigation with clear audience separation
- Workflow diagram improves end-user understanding

**Commits**:
- `3df3098` - Initial README split (97% token savings)
- `2ccbe88` - Mark ISSUE-008 complete
- `94b2e6c` - Add master plan + workflow diagram (33% dev savings)
- `0b07724` - Update ISSUE-008 with follow-up details

---

### 3. **ISSUE-009: Add Session Management Reminders to CLAUDE.md** ✅ **COMPLETE**

**Why Third**: Improves ongoing workflow efficiency. Quick implementation that pays dividends in future sessions.

**Action Items**:
- [x] Decide on approach (Option 1: Add to CLAUDE.md is recommended) - **Selected Option 1**
- [x] Add new section to CLAUDE.md:
  - [x] Session restart guidelines (token thresholds, context scatter)
  - [x] Documentation update workflow (git log review first)
- [x] Add clarification to ISSUE-009 about automatic Claude behavior vs user prompts
- [x] Create backup: CLAUDE.md.backup-2025-10-23
- [x] Move ISSUE-009 to `bugs/mitigated/` (since it requires validation over time)

**Actual Time**: ~30 minutes

**Completion Summary**:
- ✅ Backup created: CLAUDE.md.backup-2025-10-23 for safety
- ✅ Section added to CLAUDE.md (lines 102-152, 51 lines)
- ✅ Token efficiency: Claude will proactively monitor token usage and suggest restarts at 100K-150K tokens
- ✅ Documentation workflow: Claude will automatically review git log before updating PHASE/README docs
- ✅ ISSUE-009 clarified: These guide Claude's automatic behavior, not user prompts
- ✅ Moved to bugs/mitigated/ (requires validation over time)
- ✅ Commit: 8b68a79

**Impact**: ✅ Automatic proactive session management, systematic git history review for docs, reduced cognitive load for user

**Testing Notes**: Will be validated over subsequent sessions to ensure reminders are helpful and appropriately timed. Can adjust thresholds in CLAUDE.md if needed. Backup available for rollback if necessary.

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
