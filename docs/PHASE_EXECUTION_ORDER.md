<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Phase Execution Order - JobHunter Project](#phase-execution-order---jobhunter-project)
  - [⚠️ Important Notice](#-important-notice)
  - [📊 Visual Dependency Chain](#-visual-dependency-chain)
  - [✅ Completed Phases (In Execution Order)](#-completed-phases-in-execution-order)
  - [🚀 Ready to Start (All Prerequisites Met)](#-ready-to-start-all-prerequisites-met)
    - [Phase 5: Advanced Features](#phase-5-advanced-features)
  - [⏸️ Deferred (Low Priority or Not Needed Yet)](#-deferred-low-priority-or-not-needed-yet)
    - [Phase 2.7: Microsoft Email Source](#phase-27-microsoft-email-source)
  - [🔍 Key Insights](#-key-insights)
    - [1. **Phase 2.5 Depends on Phase 3.1**](#1-phase-25-depends-on-phase-31)
    - [2. **Phase 2.X Grouping is Misleading**](#2-phase-2x-grouping-is-misleading)
    - [3. **Phase 4.1 Was Actually Layer 2**](#3-phase-41-was-actually-layer-2)
  - [📋 Feature Grouping (Alternative View)](#-feature-grouping-alternative-view)
    - [INTAKE: Get Jobs Into System](#intake-get-jobs-into-system)
    - [PROCESSING: Evaluate & Filter Jobs](#processing-evaluate--filter-jobs)
    - [APPLICATION: Submit Applications](#application-submit-applications)
    - [TRACKING: Manage Applications](#tracking-manage-applications)
    - [ADVANCED: Nice-to-Have Features](#advanced-nice-to-have-features)
  - [🎯 Recommended Next Steps](#-recommended-next-steps)
    - [Immediate (This Week)](#immediate-this-week)
    - [Short Term (Next 1-2 Weeks)](#short-term-next-1-2-weeks)
    - [Long Term (2-3 Months)](#long-term-2-3-months)
  - [📚 Related Documentation](#-related-documentation)
  - [🔄 Maintenance](#-maintenance)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Phase Execution Order - JobHunter Project

**Last Updated**: 2025-11-03 11:04:52 PST (Phase 2.5 validation complete)

---

## ⚠️ Important Notice

**Phase numbers were assigned historically as features were planned, NOT by dependency order.**

This document shows the **correct execution sequence** based on actual feature dependencies. Always refer to this document when planning what to work on next.

---

## 📊 Visual Dependency Chain

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Foundation                                        │
│  • Phase 1: Core System ✅                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Layer 2: Job Intake (Get jobs into system)                │
│  • Gmail Integration ✅ (base Phase 2)                      │
│  • Phase 4.1: RapidAPI JSearch ✅                           │
│  └─> Phase 2.7: Microsoft Email Source 📋 (deferred)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Layer 3: Job Processing (Filter, score, extract)          │
│  • Phase 2.6: LLM Job Extraction ✅                         │
│  • Job Scoring/Filtering ✅                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Layer 4: Content Generation (Make application materials)  │
│  • Phase 3.1: Resume & Cover Letter Generation ✅          │
└──────────────────────┬──────────────────────────────────────┘
                       │ [CRITICAL DEPENDENCY]
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Layer 5: Application Submission (Send applications)       │
│  • Phase 2.5: Email Composition ✅                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Layer 6: Follow-up Management (Track responses)           │
│  • Phase 2.4: Calendar & Follow-ups ✅                      │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Completed Phases (In Execution Order)

| Order | Phase | Feature | Completed | Notes |
|-------|-------|---------|-----------|-------|
| 1 | Phase 1 | Core System | ✅ | Foundation for all features |
| 2 | Phase 2 (base) | Gmail Integration | ✅ | OAuth, email sync |
| 3 | Phase 4.1 | RapidAPI JSearch (Job Intake) | ✅ 2025-10-23 | Multi-board aggregator |
| 4 | Phase 2.6 | LLM Job Extraction | ✅ 2025-10-11 | Claude-based parsing |
| 5 | Phase 3.1 | Content Generation | ✅ | Resume & cover letter with LLM |
| 6 | Phase 2.4 | Calendar & Follow-ups | ✅ 2025-11-01 | Interview scheduling, email follow-ups |
| 7 | Phase 2.5 | Email Composition | ✅ 2025-11-03 | Gmail draft creation (16/16 E2E tests passing) |

**Total Completed: 7 phases**

---

## 🚀 Ready to Start (All Prerequisites Met)

### Phase 5: Advanced Features
- **Prerequisites**: ✅ All core workflows complete
- **Features**: Analytics, mobile support, advanced scheduling
- **Priority**: Low (no blockers, nice-to-have)

---

## ⏸️ Deferred (Low Priority or Not Needed Yet)

### Phase 2.7: Microsoft Email Source
- **Status**: Not started
- **Prerequisites**: ✅ All met (can start anytime)
- **Feature**: sam@samkirk.com as job source (Microsoft Graph API)
- **Why Deferred**:
  - Already have 2 job sources working (Gmail + RapidAPI)
  - Limited job volume doesn't require more sources yet
  - Can add when scaling up job search
- **Recommendation**: Revisit when job volume increases or sam@samkirk.com becomes primary email

---

## 🔍 Key Insights

### 1. **Phase 2.5 Depends on Phase 3.1**
The biggest dependency issue: Email Composition (2.5) requires Content Generation (3.1) to work. You can't compose an email draft without generated resume/cover letter content.

**Resolution**: Both are now complete, but phase numbering implies 2.5 comes first.

### 2. **Phase 2.X Grouping is Misleading**
"Phase 2" was meant to be "Email Integration," but it includes:
- 2.4: Calendar & Follow-ups (application tracking)
- 2.5: Email Composition (application submission)
- 2.6: LLM Job Extraction (job processing)
- 2.7: Microsoft Email Source (job intake)

These are functionally different layers with different dependencies.

### 3. **Phase 4.1 Was Actually Layer 2**
RapidAPI JSearch (4.1) is a job intake feature, functionally similar to Gmail integration (base Phase 2). It should have been numbered closer to Phase 2, but was planned later.

---

## 📋 Feature Grouping (Alternative View)

If we were to reorganize by feature group instead of historical phase numbers:

### INTAKE: Get Jobs Into System
- ✅ INTAKE-1: Gmail (base Phase 2)
- ✅ INTAKE-2: RapidAPI JSearch (Phase 4.1)
- 📋 INTAKE-3: Microsoft Email (Phase 2.7) - deferred

### PROCESSING: Evaluate & Filter Jobs
- ✅ PROC-1: LLM Extraction (Phase 2.6)
- ✅ PROC-2: Scoring/Filtering (built-in)

### APPLICATION: Submit Applications
- ✅ APP-1: Content Generation (Phase 3.1)
- ✅ APP-2: Email Composer (Phase 2.5)

### TRACKING: Manage Applications
- ✅ TRACK-1: Calendar & Follow-ups (Phase 2.4)

### ADVANCED: Nice-to-Have Features
- 📋 ADV-1: Analytics (Phase 5)
- 📋 ADV-2: Mobile Support (Phase 5)

---

## 🎯 Recommended Next Steps

**🎉 All Core Workflows Complete!** All 6 dependency layers are now implemented and validated.

### Immediate (This Week)
1. **Begin Using the Application**: All features are ready for real job search
   - Email intake from Gmail working
   - RapidAPI JSearch for multi-board job search
   - LLM-based job extraction and scoring
   - Content generation (resume & cover letter)
   - Email draft creation (validated with E2E tests)
   - Calendar integration for interview scheduling
   - Follow-up email system

### Short Term (Next 1-2 Weeks)
2. **Phase 5 Planning**: Define analytics and advanced features
   - Application success rate tracking
   - Response time analytics
   - Interview conversion metrics

3. **Phase 2.7 Re-evaluation**: Decide if Microsoft email source is needed
   - Monitor job volume from current sources
   - Defer if current sources sufficient

### Long Term (2-3 Months)
4. **Optimization**: Improve existing features
   - LLM cost optimization
   - Job deduplication refinement
   - Calendar integration enhancements

---

## 📚 Related Documentation

- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Current state and overall progress
- [PROJECT_HISTORY.md](PROJECT_HISTORY.md) - Historical record of implementations
- Individual phase plans: [PHASE_*.md](.) - Detailed implementation plans

---

## 🔄 Maintenance

This document should be updated whenever:
- A new phase is planned (add to appropriate layer)
- A phase is completed (update status)
- Dependencies change (update dependency chain)
- New dependencies are discovered (document here)

**Last Reviewed**: 2025-11-03 by Claude Code (Phase 2.5 validation complete)
