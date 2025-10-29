<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: ISSUE-026
title: CRA Deprecation - RSBuild Migration (Phase 4/5)
status: open
priority: low
severity: medium
component: infrastructure
created: 2025-10-28
updated: 2025-10-28
affects: [build-system, frontend-infrastructure]
related: [ISSUE-025, ISSUE-021, ISSUE-022]](#id-issue-026%0Atitle-cra-deprecation---rsbuild-migration-phase-45%0Astatus-open%0Apriority-low%0Aseverity-medium%0Acomponent-infrastructure%0Acreated-2025-10-28%0Aupdated-2025-10-28%0Aaffects-build-system-frontend-infrastructure%0Arelated-issue-025-issue-021-issue-022)
- [ISSUE-026: CRA Deprecation - RSBuild Migration (Phase 4/5)](#issue-026-cra-deprecation---rsbuild-migration-phase-45)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Context: Why Migration Is Necessary](#context-why-migration-is-necessary)
    - [CRA Deprecation (February 14, 2025)](#cra-deprecation-february-14-2025)
    - [What CRA Actually Does (Important Distinction)](#what-cra-actually-does-important-distinction)
    - [Alternatives Considered](#alternatives-considered)
  - [Proposed Solution: RSBuild Migration](#proposed-solution-rsbuild-migration)
    - [Why RSBuild (Recommended)](#why-rsbuild-recommended)
  - [Implementation Plan](#implementation-plan)
    - [Phase 1: Research & Preparation (4-6 hours)](#phase-1-research--preparation-4-6-hours)
    - [Phase 2: Migration Execution (8-12 hours)](#phase-2-migration-execution-8-12-hours)
    - [Phase 3: Verification & Documentation (3-5 hours)](#phase-3-verification--documentation-3-5-hours)
    - [Phase 4: Deployment (1-2 hours)](#phase-4-deployment-1-2-hours)
  - [Risk Mitigation Strategies](#risk-mitigation-strategies)
  - [Success Criteria](#success-criteria)
  - [Timeline & Effort Estimate](#timeline--effort-estimate)
  - [Why This Plan Avoids the Vitest Disaster](#why-this-plan-avoids-the-vitest-disaster)
  - [Testing](#testing)
  - [Strategic Timing Analysis: When to Execute This Migration?](#strategic-timing-analysis-when-to-execute-this-migration)
    - [Critical Clarification: What Benefits Does RSBuild Actually Provide?](#critical-clarification-what-benefits-does-rsbuild-actually-provide)
    - [Arguments FOR Doing It NOW (vs Phase 4/5)](#arguments-for-doing-it-now-vs-phase-45)
      - [1. **"Technical Debt Interest" - The Cost Compounds**](#1-technical-debt-interest---the-cost-compounds)
      - [2. **Current Stability is IDEAL Migration Conditions**](#2-current-stability-is-ideal-migration-conditions)
      - [3. **There's Never a "Perfect Time"**](#3-theres-never-a-perfect-time)
      - [4. **Modern Tooling Benefits Start Immediately**](#4-modern-tooling-benefits-start-immediately)
      - [5. **Risk Mitigation is Lower NOW**](#5-risk-mitigation-is-lower-now)
    - [Arguments AGAINST Doing It NOW (Why Original Plan Said Phase 4/5)](#arguments-against-doing-it-now-why-original-plan-said-phase-45)
      - [1. **Opportunity Cost: 15-25 Hours**](#1-opportunity-cost-15-25-hours)
      - [2. **No Immediate Pain Point**](#2-no-immediate-pain-point)
      - [3. **Context Switching Cost**](#3-context-switching-cost)
      - [4. **ISSUE-026 Original Recommendation**](#4-issue-026-original-recommendation)
    - [The "Third Option": Hybrid Approach](#the-third-option-hybrid-approach)
    - [Recommendation: Hybrid Approach (Finish 2.4, Then Migrate, Before 2.5)](#recommendation-hybrid-approach-finish-24-then-migrate-before-25)
    - [Decision Framework: Questions to Determine Best Path](#decision-framework-questions-to-determine-best-path)
      - [**Primary Motivation Questions**](#primary-motivation-questions)
      - [**Practical Constraint Questions**](#practical-constraint-questions)
      - [**Risk Tolerance Questions**](#risk-tolerance-questions)
    - [Recommendation Summary Table](#recommendation-summary-table)
  - [Migration Execution Log](#migration-execution-log)
    - [Phase 1: Research & Preparation ✅ COMPLETED (2025-10-29)](#phase-1-research--preparation--completed-2025-10-29)
  - [Status History](#status-history)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: ISSUE-026
title: CRA Deprecation - RSBuild Migration (Phase 4/5)
status: open
priority: low
severity: medium
component: infrastructure
created: 2025-10-28
updated: 2025-10-28
affects: [build-system, frontend-infrastructure]
related: [ISSUE-025, ISSUE-021, ISSUE-022]
---

# ISSUE-026: CRA Deprecation - RSBuild Migration (Phase 4/5)

## Summary

Create React App (CRA) was officially deprecated by the React team on February 14, 2025. While the current system works fine with CRA + webpack deprecation warnings suppressed (ISSUE-025 Plan A), we should migrate to a modern, actively maintained build tool (RSBuild) in Phase 4/5 to address underlying technical debt.

**Status**: Low priority - current workaround (NODE_NO_WARNINGS=1) is acceptable for short-term feature development.

**Timeline**: Phase 4/5 (3-6 months out)

**Effort**: 15-25 hours (spread over 1-2 weeks)

## Impact

**Current State**:
- ✅ System works fine with CRA (warnings suppressed via ISSUE-025 Plan A)
- ✅ All 481 Jest unit tests passing
- ✅ All E2E tests running cleanly (no console warnings)
- ❌ CRA is unmaintained (last update September 2022)
- ❌ No security patches or webpack-dev-server updates coming
- ⚠️ Technical debt accumulating (deprecated dependencies)

**Future Risks** (if not addressed):
- Security vulnerabilities in unmaintained dependencies
- Incompatibility with future Node.js versions
- Inability to upgrade React or other dependencies
- Webpack-dev-server breaking changes

**Severity**: Medium long-term, Low short-term

## Context: Why Migration Is Necessary

### CRA Deprecation (February 14, 2025)

- React team officially deprecated CRA for all new and existing projects
- No active maintainers since September 2022
- No security patches or webpack-dev-server updates coming
- Official recommendation: Migrate to frameworks (Next.js, Remix) or build tools (Vite, Parcel, RSBuild)

### What CRA Actually Does (Important Distinction)

- ✅ CRA builds the React APPLICATION (webpack bundling, dev server, hot reload)
- ❌ CRA does NOT handle test infrastructure (Jest, Playwright run independently)
- Migration changes APPLICATION build, but test infrastructure (481 Jest + 318 Playwright tests) remains UNCHANGED

### Alternatives Considered

| Tool | Type | Pros | Cons | Risk Level |
|------|------|------|------|------------|
| **RSBuild** | Build Tool | Webpack-compatible (easy CRA migration), Rust-based (fast), Official CRA migration guide, React team endorsed, NOT Vite ecosystem | Newer tool, smaller community | **MEDIUM** (Recommended) |
| **Vite** | Build Tool | Official React recommendation, Fast, Large community | ISSUE-021/022 Vitest disaster (3 days lost), Vite ecosystem concerns | **MEDIUM-HIGH** |
| **Parcel** | Build Tool | Zero-config (like CRA), Actively maintained | Smaller community, Less webpack compatibility | **MEDIUM** |
| **Next.js** | Framework | Full-stack, SSR, React team primary recommendation | Overkill for SPA, Architectural change | **HIGH** |
| **Eject CRA** | DIY | Expose webpack config | **WRONG APPROACH** - maintaining abandoned code | **DO NOT DO** |

## Proposed Solution: RSBuild Migration

### Why RSBuild (Recommended)

**1. Webpack Compatibility**:
- Built on Rspack (Rust-based webpack replacement)
- "Maximizes webpack compatibility" (official Rspack goal)
- CRA uses webpack → RSBuild uses webpack-compatible bundler
- Lower migration risk than switching to completely different architecture (Vite)

**2. Avoids Vitest Disaster Pattern**:
- **ISSUE-021/022 Problem**: Vitest (Vite-native) + CRA (webpack) = incompatibility
- **RSBuild Advantage**: Webpack-compatible architecture reduces mismatch risk
- Test infrastructure (Jest, Playwright) remains UNCHANGED
- No test runner migration required (unlike Vitest disaster)

**3. Modern Performance**:
- Rust-based (like Vite speed, but webpack-compatible)
- React team officially recommends it as CRA alternative
- Active maintenance (unlike CRA)

**4. Official Migration Support**:
- Official CRA → RSBuild migration guide: https://rsbuild.rs/guide/migration/cra
- Community reports: "fairly seamless" migrations
- Explicit documentation for CRA projects

**5. Application Build Only** (Critical Distinction):
- Changes how React app is built/served (`npm start`, `npm run build`)
- Test infrastructure UNCHANGED:
  - ✅ 481 Jest unit tests (same)
  - ✅ 318 Playwright E2E tests (same)
  - ✅ jest.config.js (same)
  - ✅ playwright.config.ts (same)
- **This is why RSBuild migration is lower risk than Vitest migration**

## Implementation Plan

### Phase 1: Research & Preparation (4-6 hours)

**Step 1: Deep-Dive Research (2-3 hours)**
- [ ] Read official RSBuild documentation: https://rsbuild.dev
- [ ] Read CRA migration guide: https://rsbuild.rs/guide/migration/cra
- [ ] Review community migration stories (search "CRA to RSBuild migration 2025")
- [ ] Verify Jest compatibility (should be automatic - Jest is independent)
- [ ] Verify Playwright compatibility (should be automatic - Playwright is independent)
- [ ] Check if any frontend dependencies have RSBuild-specific considerations

**Step 2: Create Migration Branch (30 min)**
```bash
git checkout -b migration/rsbuild-cra-replacement
git push -u origin migration/rsbuild-cra-replacement
```

**Step 3: Backup Current State (30 min)**
- [ ] Tag current working state: `git tag pre-rsbuild-migration`
- [ ] Document current build times (baseline for comparison)
- [ ] Run full test suite (481 Jest + 318 Playwright) - verify 100% passing
- [ ] Take screenshots of working application
- [ ] Document all npm scripts in package.json

**Step 4: Create Rollback Plan (1-2 hours)**
- [ ] Document exact steps to revert migration if it fails
- [ ] Test rollback procedure on feature branch
- [ ] Identify "point of no return" in migration
- [ ] Define success/failure criteria for each migration step

---

### Phase 2: Migration Execution (8-12 hours)

**Step 1: Install RSBuild Dependencies (30 min)**

```bash
cd frontend

# Remove CRA
npm uninstall react-scripts

# Install RSBuild
npm install -D @rsbuild/core @rsbuild/plugin-react

# Verify installation
npx rsbuild --version
```

**Step 2: Create RSBuild Configuration (1-2 hours)**

Create `frontend/rsbuild.config.ts`:

```typescript
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  html: {
    template: './public/index.html',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080', // Backend proxy
    },
  },
  output: {
    distPath: {
      root: 'dist', // RSBuild default (was 'build' in CRA)
    },
  },
});
```

**Step 3: Update package.json Scripts (30 min)**

```json
{
  "scripts": {
    "start": "rsbuild dev",
    "build": "npm run typecheck && rsbuild build",
    "preview": "rsbuild preview",
    "typecheck": "tsc --noEmit",
    "test": "npm run typecheck && jest --watchAll=false",
    "test:e2e": "playwright test",
    // ... rest of test scripts remain unchanged
  }
}
```

**Step 4: Update Environment Variables (1 hour)**

CRA uses `REACT_APP_` prefix, RSBuild uses `PUBLIC_` prefix:

```bash
# Search for all REACT_APP_ variables in codebase
grep -r "REACT_APP_" frontend/src/

# Update all occurrences:
# REACT_APP_API_URL → PUBLIC_API_URL
# Access via: import.meta.env.PUBLIC_API_URL (instead of process.env.REACT_APP_API_URL)
```

**Step 5: Update Output Directory References (30 min)**

CRA outputs to `build/`, RSBuild outputs to `dist/`:

```bash
# Update .gitignore
- /frontend/build
+ /frontend/dist

# Update any deployment scripts that reference build/
# Update CI/CD configuration if applicable
```

**Step 6: Verify TypeScript Configuration (1 hour)**

RSBuild handles TypeScript differently - verify `frontend/tsconfig.json` compatibility:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler", // RSBuild recommendation
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    // ... rest of config
  }
}
```

**Step 7: Test Application Build (2-3 hours)**

```bash
# Start development server
npm start

# Verify in browser:
# - http://localhost:3000 loads correctly
# - All tabs work (Intake, Content Generation, etc.)
# - API calls to backend work (proxy configuration)
# - Hot reload works (edit a file, see changes)
# - No console errors
# - DevTools work correctly

# Test production build
npm run build
npm run preview

# Verify production build works correctly
```

**Step 8: Verify Test Infrastructure (2-3 hours)**

```bash
# Jest unit tests (should work unchanged)
cd frontend
npm test

# Expected: 481 tests passing (same as before)
# If failures: investigate, fix, verify unrelated to RSBuild

# Playwright E2E tests (should work unchanged)
npm run test:e2e

# Expected: 318 active tests running (same as before)
# Verify no new failures introduced by RSBuild migration
```

**Step 9: Performance Benchmarking (1 hour)**

```bash
# Measure build times
time npm run build

# Compare to CRA baseline (documented in Phase 1 Step 3)
# Expected: RSBuild should be 2-5x faster than CRA

# Measure dev server startup
time (npm start & sleep 10 && pkill -f rsbuild)

# Compare to CRA baseline
# Expected: RSBuild should start faster
```

---

### Phase 3: Verification & Documentation (3-5 hours)

**Step 1: Comprehensive Testing (2-3 hours)**

```bash
# Run all test suites multiple times to verify stability
npm test                 # Jest (3 times)
npm run test:e2e         # Playwright (2 times)

# Test all npm scripts
npm run typecheck
npm run test:coverage
npm run test:e2e:headed
npm run test:e2e:report

# Manual testing checklist:
# - [ ] All application features work (Intake, Content Gen, Job Details, etc.)
# - [ ] Backend API integration works
# - [ ] State management works (React context)
# - [ ] Routing works (if applicable)
# - [ ] Forms submit correctly
# - [ ] Modals open/close
# - [ ] All visual elements render correctly
# - [ ] No console errors in browser
# - [ ] Performance is acceptable (not slower than CRA)
```

**Step 2: Update Documentation (1-2 hours)**

- [ ] Update `frontend/README.md` with RSBuild information
- [ ] Update `CLAUDE.md` (remove CRA references, add RSBuild)
- [ ] Document new build commands
- [ ] Update environment variable documentation (PUBLIC_ prefix)
- [ ] Update deployment documentation if affected
- [ ] Document output directory change (build/ → dist/)

**Step 3: Create Migration Summary (1 hour)**

Document in ISSUE-026:
- Migration date
- Before/after comparison (build times, bundle sizes)
- Any issues encountered and how they were resolved
- Verification results (test pass rates)
- Performance improvements observed
- Lessons learned

---

### Phase 4: Deployment (1-2 hours)

**Step 1: Merge to Main**

```bash
# Verify all tests passing on migration branch
npm test && npm run test:e2e

# Merge to main
git checkout main
git merge migration/rsbuild-cra-replacement
git push origin main

# Tag the migration
git tag rsbuild-migration-complete-$(date +%Y-%m-%d)
git push --tags
```

**Step 2: Monitor Production** (if applicable)

- [ ] Deploy to staging environment first
- [ ] Verify application works in staging
- [ ] Monitor for errors/performance issues
- [ ] Deploy to production
- [ ] Monitor production logs for 24-48 hours

---

## Risk Mitigation Strategies

**Risk 1: Migration breaks application functionality**
- **Mitigation**: Comprehensive testing at every step (Phase 2 Step 7-9)
- **Rollback**: `git checkout pre-rsbuild-migration` tag
- **Timeline**: Can rollback in 5-10 minutes if caught early

**Risk 2: Test infrastructure breaks**
- **Mitigation**: Jest/Playwright should be unaffected (they're independent)
- **Validation**: Test after each major step
- **Likelihood**: LOW (tests don't depend on build tool)

**Risk 3: Environment variables break**
- **Mitigation**: Comprehensive search for REACT_APP_ prefix, systematic replacement
- **Testing**: Verify all API calls work after migration
- **Likelihood**: MEDIUM (requires careful search/replace)

**Risk 4: Build configuration edge cases**
- **Mitigation**: Follow official RSBuild migration guide closely
- **Community**: Search for "CRA to RSBuild" issues on GitHub
- **Support**: RSBuild has active Discord community for questions

**Risk 5: Unknown unknowns (like Vitest disaster)**
- **Mitigation**: Phased approach with rollback points
- **Learning**: ISSUE-021/022 taught us to validate compatibility early
- **Advantage**: RSBuild's webpack compatibility reduces this risk vs Vite

---

## Success Criteria

Before marking RSBuild migration complete, verify:

- [ ] Application builds successfully (`npm run build`)
- [ ] Development server runs (`npm start`)
- [ ] All 481 Jest unit tests pass (same as pre-migration)
- [ ] All 318 Playwright E2E tests pass (same as pre-migration)
- [ ] All application features work (manual testing)
- [ ] No webpack deprecation warnings (root cause fixed)
- [ ] Build times improved or equivalent to CRA
- [ ] Bundle sizes equivalent or smaller than CRA
- [ ] Hot reload works in development
- [ ] Production build works correctly
- [ ] All documentation updated
- [ ] Team can run application without issues

---

## Timeline & Effort Estimate

**Total Effort**: 15-25 hours (spread over 1-2 weeks)

| Phase | Effort | Timeline |
|-------|--------|----------|
| Phase 1: Research & Preparation | 4-6 hours | Week 1, Days 1-2 |
| Phase 2: Migration Execution | 8-12 hours | Week 1-2, Days 3-5 |
| Phase 3: Verification & Documentation | 3-5 hours | Week 2, Day 6 |
| Phase 4: Deployment | 1-2 hours | Week 2, Day 7 |

**Recommended Schedule**:
- **Phase 4/5 timeframe** (after core features stabilize)
- **Not during active feature development** (requires focus)
- **When you have 2 consecutive weeks** to commit to migration
- **After all E2E tests stable** (ISSUE-025 complete)

---

## Why This Plan Avoids the Vitest Disaster

**ISSUE-021/022 Lessons Applied**:

1. ✅ **Validate architectural compatibility FIRST** (Phase 1 research)
2. ✅ **Webpack-compatible tool** (RSBuild/Rspack vs Vite-native Vitest)
3. ✅ **Application build change, NOT test runner change** (lower risk)
4. ✅ **Comprehensive rollback plan** (learned from 3-day Vitest struggle)
5. ✅ **Phased approach with validation checkpoints** (not all-at-once)
6. ✅ **Community validation** (RSBuild has CRA migration guide, Vitest did not)
7. ✅ **Test infrastructure unchanged** (Jest/Playwright stay, avoiding Vitest mistake)

**Key Difference from Vitest Migration**:
- **Vitest**: Changed test runner (Jest → Vitest) + Vite-native tool + CRA incompatibility = DISASTER
- **RSBuild**: Changes build tool (CRA webpack → RSBuild webpack-compatible) + tests unchanged = LOWER RISK

---

## Testing

**Pre-Migration Baseline**:
- Run full test suite and document pass rates
- Measure build times and bundle sizes
- Document all npm scripts and their behavior

**During Migration**:
- Test after each major step
- Compare test pass rates to baseline
- Verify no regressions

**Post-Migration Verification**:
- All tests pass at same or better rates
- Application features work identically
- Performance is same or better

---

## Strategic Timing Analysis: When to Execute This Migration?

### Critical Clarification: What Benefits Does RSBuild Actually Provide?

**Common Misconception**: "RSBuild migration will improve testing"

**Reality from ISSUE-026 Analysis**:
- ❌ Jest stays unchanged (481 tests remain identical)
- ❌ Playwright stays unchanged (318 E2E tests remain identical)
- ❌ Test runners are completely independent of the build tool
- ✅ Only "testing improvement" is removing webpack warnings (already suppressed via NODE_NO_WARNINGS=1)

**Actual Benefits**:
- Faster builds (Rust-based, 2-5x faster than CRA webpack)
- Faster dev server startup
- Active maintenance (security patches, future compatibility)
- Modern React ecosystem alignment (React team recommendation)
- Eliminates technical debt (CRA unmaintained since Sept 2022)

---

### Arguments FOR Doing It NOW (vs Phase 4/5)

#### 1. **"Technical Debt Interest" - The Cost Compounds**

Every week you delay, the migration gets riskier:
- **Current state**: 8,500 LOC backend + 8,429 LOC frontend
- **After Phase 2.4**: +500-800 LOC (Calendar components, OAuth logic)
- **After Phase 2.5**: +300-500 LOC (Email composer)
- **After Phase 4.2-4.6**: +1,000+ LOC (Job board extensions)

**More code = More to verify post-migration = Higher risk of edge cases**

#### 2. **Current Stability is IDEAL Migration Conditions**

Right now (as of 2025-10-28):
- ✅ 481 Jest tests passing (98.3%)
- ✅ 318 E2E tests passing (90.2%)
- ✅ All core features working
- ✅ Clean baseline to compare against

This is the **best possible state** for infrastructure work. After migration:
- Same 481 tests should pass → Easy to verify
- Same 318 E2E tests should pass → Easy to verify
- If something breaks, you know it's the migration (not a feature bug)

**Compare to migrating after Phase 2.4/2.5:**
- NEW Calendar OAuth code (untested at scale)
- NEW Email composer integration (potential API issues)
- NEW Google Calendar sync (external dependency)
- If something breaks post-migration: Is it RSBuild? Or the new feature? **Harder to isolate.**

#### 3. **There's Never a "Perfect Time"**

The issue says "not during active feature development" - but **you're ALWAYS in active development**:
- Phase 2.4 in progress (60% done)
- Phase 2.5 planned
- Phase 4.2-4.6 extensions available
- Bugs to fix
- Future phases planned

**Waiting for "between phases" is a myth.** There's never downtime. The question is: **when is the LEAST BAD time?**

**Answer: Now is actually pretty good:**
- You just completed major testing work (ISSUE-018, 023, 024, 025 closed last week)
- System is stable and well-tested
- You have momentum and context
- No major deadline pressure visible

#### 4. **Modern Tooling Benefits Start Immediately**

RSBuild provides:
- **Faster builds** (Rust-based, 2-5x faster than CRA webpack)
- **Faster dev server startup**
- **Active maintenance** (security patches, future compatibility)
- **Modern React ecosystem alignment** (React team recommendation)
- **No more technical debt guilt** (CRA unmaintained since Sept 2022)

These benefits compound over time - every feature you build, every test you run, every deploy you do will be faster.

#### 5. **Risk Mitigation is Lower NOW**

From ISSUE-026: "15-25 hours spread over 1-2 weeks"

**Current position advantages:**
- Small, focused codebase (easier to verify)
- Comprehensive test coverage (easy to validate)
- No external deadlines mentioned
- You have rollback plan (`pre-rsbuild-migration` tag)
- Official RSBuild CRA migration guide exists
- Avoids the "Vitest disaster" pattern (ISSUE-021/022 lessons learned)

**If you wait until Phase 4/5:**
- Larger codebase (more complexity)
- More dependencies (Calendar OAuth, Email APIs, RapidAPI)
- More state to manage (Calendar events, Draft tracking)
- Higher chance of edge cases

---

### Arguments AGAINST Doing It NOW (Why Original Plan Said Phase 4/5)

#### 1. **Opportunity Cost: 15-25 Hours**

What could you accomplish instead?

| Option | Effort | Value |
|--------|--------|-------|
| **RSBuild Migration** | 15-25 hours | Future-proofing, faster builds, technical debt elimination |
| **Complete Phase 2.4** | ~2-3 weeks | Calendar & Follow-ups feature (60% done already!) |
| **Complete Phase 2.5** | 2-3 days | Email composition (completes end-to-end workflow) |
| **Fix all 6 open bugs** | 3-8 hours total | Clean up technical debt (BUG-0003, 0004, ISSUE-006, 010, 012, 026) |

**Finishing Phase 2.4** might be more valuable - it's 60% done, delivers user-facing features, and completes interview management.

#### 2. **No Immediate Pain Point**

Current system works fine:
- NODE_NO_WARNINGS=1 suppresses webpack warnings
- Build times are acceptable (no complaints)
- Tests run cleanly
- No blockers for feature development

**"If it ain't broke, why fix it now?"** argument has merit when features are flowing.

#### 3. **Context Switching Cost**

RSBuild migration requires:
- Deep focus on infrastructure (not features)
- Learning RSBuild configuration
- Debugging webpack compatibility issues (if any)
- Verifying every component post-migration

**This breaks your current feature development momentum.**

Phase 2.4 is 60% done - context switching now means:
- Losing mental model of Calendar/OAuth implementation
- Having to rebuild context when you return
- Possible forgotten edge cases

#### 4. **ISSUE-026 Original Recommendation**

This issue explicitly recommended (lines 467-470):
> **Recommended Schedule**:
> - **Phase 4/5 timeframe** (after core features stabilize)
> - **Not during active feature development** (requires focus)
> - **When you have 2 consecutive weeks** to commit to migration
> - **After all E2E tests stable** (ISSUE-025 complete)

E2E tests ARE stable now (ISSUE-025 just closed), but "after core features stabilize" suggests waiting until Phase 2.4, 2.5 are complete.

---

### The "Third Option": Hybrid Approach

**Complete Phase 2.4 First, THEN Migrate (Before Phase 2.5)**

Timeline:
1. **Weeks 1-3**: Finish Phase 2.4 (Calendar & Follow-ups) - 60% → 100%
2. **Weeks 4-5**: RSBuild migration (15-25 hours)
3. **Week 6+**: Phase 2.5 (Email composition) starts with modern tooling

**Advantages:**
- ✅ Finishes what you started (Phase 2.4 at 60%)
- ✅ Migrates before codebase grows further (Phase 2.5, 4.2+)
- ✅ Still captures "small codebase" benefits
- ✅ Delivers Calendar feature before infrastructure work
- ✅ Phase 2.5 built on modern foundation (no migration debt)

**This might be the sweet spot.**

---

### Recommendation: Hybrid Approach (Finish 2.4, Then Migrate, Before 2.5)

If making this decision today (2025-10-28), the hybrid approach makes the most strategic sense:

1. **Finish Phase 2.4** (2-3 weeks) - You're 60% done, finish the Calendar feature
2. **RSBuild Migration** (1-2 weeks) - Clear the technical debt before adding more features
3. **Phase 2.5** (2-3 days) - Build email composition on modern foundation

**Total timeline**: ~6-7 weeks to have Calendar + Email + Modern build system

**Why this works:**
- Respects your current momentum (Phase 2.4 in progress)
- Gets infrastructure upgrade done relatively early (not Phase 4/5 = months away)
- Prevents further technical debt accumulation
- Phase 2.5+ built on solid modern foundation
- Small enough codebase to validate easily (but with Calendar feature complete)

---

### Decision Framework: Questions to Determine Best Path

Before deciding when to execute this migration, answer these questions:

#### **Primary Motivation Questions**

1. **What's driving this question?**
   - Are you feeling "technical debt anxiety" about CRA deprecation?
   - Are you frustrated with webpack warnings (even though suppressed)?
   - Do you want faster build times for development?
   - Are you looking for a reason to pause Phase 2.4 (Calendar)?
   - Do you just want a clean foundation before building more?

2. **What's more valuable RIGHT NOW?**
   - User-facing features (Calendar, Email composition)?
   - Infrastructure cleanliness (modern build tool, no technical debt)?
   - Development experience (faster builds, modern tooling)?
   - Peace of mind (knowing CRA is deprecated)?

#### **Practical Constraint Questions**

3. **Can you commit 2 focused weeks to infrastructure work?**
   - Without feature development pressure?
   - Without context switching to other projects?
   - With patience for debugging edge cases?

4. **How do you feel about Phase 2.4 being 60% complete?**
   - Must finish it first (honor the commitment)?
   - Okay pausing it for infrastructure work?
   - Eager for a break from Calendar OAuth complexity?

5. **How important is development velocity vs code quality RIGHT NOW?**
   - Need to ship features quickly (wait on migration)?
   - Want a solid foundation even if it takes time (migrate now)?
   - Balanced approach (hybrid: finish 2.4, then migrate)?

#### **Risk Tolerance Questions**

6. **How risk-averse are you?**
   - Very cautious: Migrate NOW while codebase is small and well-tested
   - Moderate: Hybrid approach (finish 2.4, then migrate)
   - Risk-accepting: Wait until Phase 4/5 as originally planned

7. **If the migration takes 25 hours instead of 15, how would you feel?**
   - Frustrated (should have waited)?
   - Okay (worth it for modern foundation)?
   - Depends on what features were delayed?

---

### Recommendation Summary Table

| Timing Option | Best If... | Risk Level | Feature Delivery Impact |
|---------------|-----------|------------|------------------------|
| **NOW (Immediate)** | You value infrastructure over features, can commit 2 weeks, okay pausing Phase 2.4 | LOW (small codebase, stable tests) | HIGH (delays Calendar 2-3 weeks) |
| **Hybrid (After Phase 2.4, Before 2.5)** | You want to finish what you started, but migrate before codebase grows | LOW-MEDIUM | MEDIUM (adds 2 weeks before Phase 2.5 starts) |
| **Phase 4/5 (Original Plan)** | Feature velocity is paramount, technical debt acceptable short-term | MEDIUM-HIGH (larger codebase, more dependencies) | NONE (no immediate impact) |

**Claude's Pick**: **Hybrid Approach** - Finish Phase 2.4, then migrate, then start Phase 2.5 on modern foundation.

---

## Migration Execution Log

### Phase 1: Research & Preparation ✅ COMPLETED (2025-10-29)

**Phase 1.1: Research RSBuild Documentation** ✅
- Read official RSBuild CRA migration guide: https://rsbuild.rs/guide/migration/cra
- Reviewed RSBuild main documentation: https://rsbuild.rs/
- Confirmed Jest/Playwright compatibility (both run independently of build tool)
- **Key Finding**: No `REACT_APP_*` environment variables in codebase (simplifies migration)
- **Key Finding**: No `%PUBLIC_URL%` references in HTML templates
- **Key Finding**: Clean tsconfig.json with minimal required changes

**Phase 1.2: Create Migration Branch** ✅
- Branch created: `migration/rsbuild-cra-replacement`
- Tag created: `pre-rsbuild-migration` (rollback point)

**Phase 1.3: Backup Current State** ✅

Pre-Migration Baselines (2025-10-29):
- **Jest Tests**: 512 passing, 8 skipped (520 total) - 98.5% pass rate
- **Test Time**: 15.5 seconds
- **Production Build Time**: 15.2 seconds (CRA baseline)
- **Bundle Size**: 79.72 kB (main.js gzipped), 327 B (CSS)
- **Expected RSBuild Improvement**: 2-5x faster build times

**Phase 1.4: Rollback Plan** ✅

If migration fails at any point:

**Immediate Rollback (any time during migration):**
```bash
git checkout pre-rsbuild-migration
git branch -D migration/rsbuild-cra-replacement
# System returns to exact state before migration started
```

**Partial Rollback (if caught mid-migration):**
```bash
git reset --hard HEAD
git checkout samkirk  # or main branch
# Abandons all uncommitted changes on migration branch
```

**Point of No Return**: After merging to main branch (Phase 4.1)
- After merge: Use `git revert` instead of branch deletion
- All changes are committed incrementally, allowing selective reversion

**Success Criteria Before Proceeding to Each Phase:**
- Phase 2: Application builds and runs without errors
- Phase 3: All tests pass at baseline rates (512 Jest, E2E tests)
- Phase 4: Comprehensive testing complete, documentation updated

---

## Status History

- 2025-10-28: ISSUE-026 created (extracted from ISSUE-025 Plan B)
- 2025-10-28: Status: Open, Priority: Low, Timeline: Phase 4/5 (3-6 months)
- 2025-10-28: Added Strategic Timing Analysis section with pros/cons comparison and decision framework
  - Claude's recommendation: Hybrid approach (finish Phase 2.4, then migrate, before Phase 2.5)
  - Analysis added at user request to support timing decision
- 2025-10-29: **Migration Started** - Moved to IMMEDIATE priority in PROJECT_STATUS.md
- 2025-10-29: Phase 1 COMPLETED - Research, branch creation, baselines documented, rollback plan established

---

## Notes

**Related Context**:
- Originated from ISSUE-025 (E2E Test Suite Health)
- Plan A (webpack warning suppression) is sufficient short-term
- This migration addresses long-term technical debt
- Not urgent - system works fine with current workaround

**Lessons Learned From**:
- ISSUE-021: Vitest migration attempt (Jest → Vitest, tests hung)
- ISSUE-022: Vitest rollback (3 days lost, reverted to Jest)
- Key insight: Validate architectural compatibility before investing effort

**References**:
- React CRA Deprecation Announcement: https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- RSBuild Official Docs: https://rsbuild.dev
- RSBuild CRA Migration Guide: https://rsbuild.rs/guide/migration/cra
- Rspack (RSBuild's bundler): https://rspack.rs

**Related Files**:
- `frontend/package.json` (dependencies)
- `frontend/playwright.config.ts` (webServer command with NODE_NO_WARNINGS=1)
- Future: `frontend/rsbuild.config.ts` (new config file after migration)
