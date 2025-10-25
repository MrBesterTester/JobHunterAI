---
id: ISSUE-019
title: Migrate Jest to Vitest with TypeScript-First Testing
status: open  # open | mitigated | fixed
priority: medium  # low | medium | high | critical
severity: low  # low | medium | high | critical
component: frontend  # frontend | backend | database | infrastructure | docs
created: 2025-10-24
updated: 2025-10-24
affects: [frontend-testing, ci-pipeline, build-scripts]
related: [ISSUE-018]  # Frontend unit test implementation
---

# ISSUE-019: Migrate Jest to Vitest with TypeScript-First Testing

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Relationship to ISSUE-018 (Critical Context)](#relationship-to-issue-018-critical-context)
  - [What ISSUE-018 Phase 1 Accomplished](#what-issue-018-phase-1-accomplished)
  - [Migration Impact Analysis](#migration-impact-analysis)
  - [Two Viable Paths Forward](#two-viable-paths-forward)
  - [Recommendation: Option B (Migrate to Vitest Now)](#recommendation-option-b-migrate-to-vitest-now)
- [Motivation](#motivation)
- [Current State](#current-state)
- [Desired State](#desired-state)
- [Research Findings](#research-findings)
  - [Vitest Core Properties](#vitest-core-properties)
  - [TypeScript Type Checking](#typescript-type-checking)
  - [Migration Complexity](#migration-complexity)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Full Migration to Vitest with Enforced Type Checking (RECOMMENDED)](#option-1-full-migration-to-vitest-with-enforced-type-checking-recommended)
  - [Option 2: Stay with Jest + ts-jest](#option-2-stay-with-jest--ts-jest)
- [Decision](#decision)
- [Implementation Plan](#implementation-plan)
  - [Phase 1: Setup and Configuration](#phase-1-setup-and-configuration)
  - [Phase 2: Test File Migration](#phase-2-test-file-migration)
  - [Phase 3: Verification and Cleanup](#phase-3-verification-and-cleanup)
- [Testing Strategy](#testing-strategy)
- [Rollback Plan](#rollback-plan)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

Migrate the frontend test suite from Jest (JavaScript-based test runner with ts-jest transformer) to Vitest (TypeScript-native test runner) with enforced compile-time type checking to align with "shift-left" philosophy and improve test execution performance.

## Impact

**Who/What is affected:**
- All 42 existing frontend unit tests in `frontend/src/**/*.test.tsx`
- CI/CD pipeline test execution scripts
- Developer workflow for running tests locally
- Build scripts that enforce type safety

**Benefits:**
- **10-20x faster** test execution in watch mode
- **Native TypeScript support** without transformers
- **Enforced type checking** before tests run (shift-left)
- **Modern tooling** with better DX and ESM support
- **Jest-compatible API** means minimal code changes

## Relationship to ISSUE-018 (Critical Context)

**IMPORTANT**: This migration was proposed while ISSUE-018 (Frontend Unit Test Implementation) Phase 1 was recently completed (2025-10-24). There is significant overlap that must be addressed.

### What ISSUE-018 Phase 1 Accomplished

**Infrastructure Setup** (✅ Completed 2025-10-24):
- Removed TAP infrastructure (tap, @types/tap, tap-dot, tap-junit, tap-spec)
- Installed Jest ecosystem: jest@30.2.0, ts-jest@29.4.5, jest-environment-jsdom@30.2.0
- Created `jest.config.js` (42 lines) with coverage thresholds and TypeScript configuration
- Created `setupTests.ts` with React Testing Library matchers and browser API mocks
- **Estimated effort: ~4-6 hours**

**Test Files Created** (✅ Completed 2025-10-24):
- `src/App.test.tsx`: 28 test cases covering rendering, API integration, state management, error handling
- `src/IntakeTab.test.tsx`: 14 test cases covering job sources, sync operations, UI state
- **Total: 42 passing tests (100% pass rate)**
- **Coverage: IntakeTab 45.84% (exceeds 40% target), App 31.51%**
- **Estimated effort: ~12-16 hours**

**Still Pending in ISSUE-018**:
- Phase 2: CalendarTab, RankedJobsTab, FollowupsTab, ResumeManagement, EmailComposer (~18-27 hours, ~50-80 tests)
- Phase 3: Remaining components, edge cases, comprehensive coverage (~14-32 hours, ~30-50 tests)

### Migration Impact Analysis

**If we proceed with ISSUE-019 (Vitest migration) now:**

**1. Infrastructure Rework Required:**
- Delete `jest.config.js` → Create `vitest.config.ts`
- Remove Jest packages → Install Vitest packages
- Update `setupTests.ts` if needed (likely minimal changes)
- **Wasted effort from ISSUE-018: ~4-6 hours** (sunk cost)
- **New setup effort: ~30 minutes** (Vitest config simpler)

**2. Test File Migration Required:**
- Migrate 42 existing tests (mechanical find-and-replace)
- Changes needed:
  ```typescript
  jest.fn()             → vi.fn()
  jest.Mock             → Vi.Mock
  jest.clearAllMocks()  → vi.clearAllMocks()
  jest.spyOn()          → vi.spyOn()
  (fetch as jest.Mock)  → (fetch as Vi.Mock)
  ```
- **Test logic preserved 100%** - no conceptual rewrites needed
- **Estimated migration effort: ~30 minutes** (mostly automated find-and-replace)

**3. Benefits Preserved:**
- All 42 test cases remain identical (same assertions, same coverage)
- All test patterns and mocking strategies transfer directly
- Test quality and robustness unaffected

**Total "waste" from ISSUE-018 Phase 1:**
- Infrastructure setup: ~4-6 hours (sunk cost)
- Test migration: ~30 minutes (mechanical rework)
- **Combined: ~4.5-6.5 hours of rework/waste**

### Two Viable Paths Forward

**Option A: Complete ISSUE-018 with Jest, migrate later**

**Approach:**
1. Continue ISSUE-018 Phase 2 & 3 with Jest
2. Add ~100-130 more tests using Jest
3. Defer ISSUE-019 (Vitest migration) until all tests written
4. Migrate ~180-220 total tests to Vitest later

**Pros:**
- Don't waste the Jest setup completed in ISSUE-018 Phase 1
- Familiar tooling for immediate test development
- Lower short-term friction

**Cons:**
- Larger migration later (~180-220 tests vs 42 tests)
- More time spent writing tests with slower Jest tooling
- Miss out on Vitest performance benefits during Phase 2 & 3 development
- Migration effort grows with each new test added

**Timeline:**
- ISSUE-018 Phase 2 & 3: ~32-59 hours (Jest-based)
- ISSUE-019 migration later: ~2-3 hours (for ~180-220 tests)
- **Total effort: ~34-62 hours**

---

**Option B: Migrate to Vitest now, complete ISSUE-018 with Vitest (RECOMMENDED)**

**Approach:**
1. Accept the sunk cost of Jest setup (~4-6 hours wasted)
2. Migrate 42 existing tests to Vitest (~30 mins)
3. Continue ISSUE-018 Phase 2 & 3 using Vitest
4. All future tests written with Vitest benefits

**Pros:**
- **Sunk cost fallacy avoided**: Past effort shouldn't dictate future decisions
- Small migration surface (42 tests) - easiest time to switch
- Phase 2 & 3 development benefits from Vitest speed (10-20x faster watch mode)
- Better TypeScript-first alignment from the start
- All future tests inherit Vitest benefits
- Migration effort doesn't grow with test suite

**Cons:**
- Accept ~4-6 hours of wasted Jest infrastructure effort
- Small disruption to switch tooling mid-stream

**Timeline:**
- ISSUE-019 migration: ~1-2 hours (42 tests + config)
- ISSUE-018 Phase 2 & 3: ~32-59 hours (Vitest-based, with speed benefits)
- **Total effort: ~33-61 hours** (comparable to Option A)

### Recommendation: Option B (Migrate to Vitest Now)

**Rationale:**

1. **Sunk Cost Fallacy**: The ~4-6 hours spent on Jest setup is already spent. Continuing with Jest just because we invested that time is the classic sunk cost fallacy. The question is: "What's the best path forward from here?"

2. **Minimal Migration Surface**: 42 tests is the smallest our test suite will ever be. Migrating now takes ~30 minutes. Waiting until Phase 3 completion means migrating ~180-220 tests (~2-3 hours).

3. **Developer Experience**: Phase 2 & 3 will add ~100-130 more tests over ~32-59 hours. Writing and iterating on these tests with Vitest's 10-20x faster watch mode will save significant time and improve the development experience.

4. **TypeScript-First Alignment**: The user explicitly values TypeScript-first tooling ("shift-left" philosophy). Vitest written in TypeScript aligns better than Jest written in JavaScript, even if both support TypeScript code.

5. **One-Time Disruption**: Switching now causes one small disruption (~1-2 hours). Waiting means carrying Jest through all of Phase 2 & 3, then disrupting later with a larger migration.

6. **Net Effort Comparable**: Option A (~34-62 hours) vs Option B (~33-61 hours) are nearly identical in total effort, but Option B provides better tooling for the bulk of the work.

**Updated ISSUE-019 Scope:**
- Add migration of 42 existing tests from ISSUE-018 Phase 1
- Acknowledge ~4-6 hours of sunk cost (Jest setup)
- Position as "course correction" rather than greenfield setup
- Total migration effort: ~1-2 hours (setup + test migration)

**Next Steps:**
1. User approval of Option B recommendation
2. Execute ISSUE-019 migration (~1-2 hours)
3. Resume ISSUE-018 Phase 2 with Vitest tooling
4. Complete ISSUE-018 Phase 2 & 3 using Vitest

## Motivation

User preference for TypeScript-first development philosophy:
> "I have a philosophy of TypeScript over JavaScript in order to 'shift-left,' catch problems at compile/build time rather than at runtime."

Current Jest setup uses ts-jest (JavaScript test runner + TypeScript transformer), which is slower and less aligned with native TypeScript tooling. Vitest is written in TypeScript and provides native type checking capabilities with explicit `typecheck` mode.

## Current State

**Testing Infrastructure (ISSUE-018):**
- Test runner: Jest 30.2.0 with ts-jest 29.4.5
- Test files: 2 files with 42 passing tests
- Coverage: App.tsx at 31.51%, IntakeTab.tsx at 45.84%
- Configuration: `frontend/jest.config.js` (42 lines)

**Performance:**
- ts-jest average: ~10.36ms per test
- Requires TypeScript compilation/transformation during test execution

**Type Checking:**
- ts-jest performs type checking during test execution (can be disabled)
- Separate `npm run typecheck` script exists using `tsc --noEmit`

## Desired State

**Testing Infrastructure:**
- Test runner: Vitest (latest) with native TypeScript support
- All 42 tests passing with minimal code changes
- Configuration: `frontend/vitest.config.ts` (~30 lines)

**Performance:**
- Vitest average: ~4.9ms per test (2x faster than ts-jest)
- 10-20x faster in watch mode for iterative development

**Type Checking (CRITICAL):**
- Enforced `vitest typecheck` before test execution in npm scripts
- Enforced type checking in build scripts
- Maintains "shift-left" philosophy with compile-time error detection

**Build Scripts:**
```json
"scripts": {
  "test": "vitest typecheck && vitest run",
  "test:watch": "vitest",
  "test:typecheck": "vitest typecheck",
  "test:coverage": "vitest run --coverage",
  "build": "npm run typecheck && react-scripts build",
  "typecheck": "vitest typecheck"
}
```

## Research Findings

### Vitest Core Properties

**Written in:** TypeScript (confirmed via GitHub repository analysis)

**API Compatibility:**
- Jest-compatible API (`describe`, `it`, `expect`, `beforeEach`, etc.)
- Most Jest tests work with minimal changes

**Performance Benchmarks:**
- Vitest: ~4.9ms per test
- ts-jest: ~10.36ms per test
- @swc/jest: ~1.99ms per test (fastest, but less mature)

### TypeScript Type Checking

**Vitest default behavior:**
- Uses ESBuild for transpilation (fast, but NO type checking)
- Only removes type annotations, does not validate types
- Test files not type-checked unless explicitly configured

**Vitest typecheck mode:**
- Explicit mode: `vitest typecheck`
- Under the hood: Runs `tsc --noEmit` or `vue-tsc --noEmit`
- Prints type errors in source code AND test files
- Can be enforced in npm scripts (recommended for "shift-left")

**Comparison:**

| Tool | Default Type Checking | Speed | Aligns with "Shift-Left" |
|------|----------------------|-------|-------------------------|
| **ts-jest** | ✅ Yes (can disable) | Slower | ✅ Yes |
| **Vitest** | ❌ No (must enable) | Faster | ⚠️ Only with `typecheck` mode |

### Migration Complexity

**Real-world examples:**
- 74 tests migrated in <3 hours
- 82 test files (257 tests) in 11 PRs
- Most effort in configuration, not test rewrites

**Code changes required:**
```typescript
// Find-and-replace changes:
jest.fn()                        → vi.fn()
jest.Mock                        → Vi.Mock
jest.clearAllMocks()             → vi.clearAllMocks()
jest.spyOn(console, 'error')     → vi.spyOn(console, 'error')
(fetch as jest.Mock)             → (fetch as Vi.Mock)
```

**No changes needed:**
- `describe()`, `it()`, `expect()` - identical API
- `@testing-library/react` - fully compatible
- `@testing-library/jest-dom` - compatible with Vitest
- Test logic and assertions - unchanged

## Proposed Solutions

### Option 1: Full Migration to Vitest with Enforced Type Checking (RECOMMENDED)

**Description**: Migrate test runner from Jest to Vitest, configure enforced type checking in build/test scripts to maintain "shift-left" philosophy.

**Pros**:
- 10-20x faster test execution in watch mode (better DX)
- 2x faster per-test execution (~4.9ms vs ~10.36ms)
- Native TypeScript support (no transformers needed)
- Modern ESM-first tooling with better future compatibility
- Enforced type checking via npm scripts maintains safety
- Jest-compatible API means minimal code changes (~1 hour work)
- Written in TypeScript (aligns with project philosophy)

**Cons**:
- Requires explicit `typecheck` configuration (not enabled by default)
- Must remember to enforce in npm scripts (solved via standardization)
- Migration overhead (~1-2 hours total for 42 tests)
- Team must learn new (but similar) testing patterns

**Implementation Effort**: 1-2 hours

**Maintenance**: Lower long-term (native TypeScript, no transformers)

### Option 2: Stay with Jest + ts-jest

**Description**: Keep current Jest setup with ts-jest, no migration needed.

**Pros**:
- Zero migration effort (already working)
- Type checking enabled by default
- Familiar tooling for team
- Mature ecosystem with extensive community

**Cons**:
- Slower test execution (~10.36ms per test)
- Requires transformer layer (ts-jest)
- Not written in TypeScript (JavaScript with TS support)
- Slower iteration in watch mode (important for TDD)

**Implementation Effort**: 0 hours

**Maintenance**: Higher long-term (transformer overhead)

## Decision

**Selected: Option 1 - Full Migration to Vitest with Enforced Type Checking**

**Rationale:**
1. **Performance**: 10-20x faster in watch mode critical for iterative development
2. **TypeScript-first**: Vitest written in TypeScript aligns with project philosophy
3. **Shift-left maintained**: Enforced `typecheck` in npm scripts ensures compile-time safety
4. **Low migration cost**: 1-2 hours for 42 tests is acceptable
5. **Future-proof**: Modern ESM-first tooling better for long-term maintenance

**Key requirement**: Must enforce `vitest typecheck` in all test/build scripts to maintain "shift-left" philosophy.

## Implementation Plan

### Phase 1: Setup and Configuration

**Tasks:**

1. **Install Vitest dependencies**
   ```bash
   cd frontend
   npm install -D vitest @vitest/ui jsdom
   npm install -D @vitest/coverage-v8  # For coverage reporting
   ```

2. **Create `frontend/vitest.config.ts`**
   - Configure jsdom environment
   - Set up coverage thresholds (match current Jest thresholds)
   - Configure setupFiles to use `src/setupTests.ts`
   - Enable globals for Jest-compatible API

3. **Update `frontend/package.json` scripts**
   - Add enforced typecheck: `"test": "vitest typecheck && vitest run"`
   - Add watch mode: `"test:watch": "vitest"`
   - Add explicit typecheck: `"test:typecheck": "vitest typecheck"`
   - Update coverage: `"test:coverage": "vitest run --coverage"`
   - Update build: `"build": "npm run typecheck && react-scripts build"`
   - Keep typecheck script: `"typecheck": "vitest typecheck"`

4. **Verify setupTests.ts compatibility**
   - Check `frontend/src/setupTests.ts` works with Vitest
   - Update if needed (likely no changes required)

**Estimated time**: 30 minutes

### Phase 2: Test File Migration

**Tasks:**

1. **Update `frontend/src/App.test.tsx`**
   - Find-and-replace: `jest.fn()` → `vi.fn()`
   - Find-and-replace: `jest.Mock` → `Vi.Mock`
   - Find-and-replace: `jest.clearAllMocks()` → `vi.clearAllMocks()`
   - Find-and-replace: `jest.spyOn` → `vi.spyOn`
   - Update type assertions: `(fetch as jest.Mock)` → `(fetch as Vi.Mock)`
   - Add import if not using globals: `import { vi, describe, it, expect, beforeEach } from 'vitest'`

2. **Update `frontend/src/IntakeTab.test.tsx`**
   - Same find-and-replace changes as above

3. **Run tests to verify migration**
   ```bash
   cd frontend
   npm run test  # Should run typecheck + tests
   ```

4. **Fix any issues discovered during test run**
   - Check for API differences
   - Update mocking patterns if needed
   - Verify all 42 tests still pass

**Estimated time**: 30 minutes

### Phase 3: Verification and Cleanup

**Tasks:**

1. **Verify type checking enforcement**
   ```bash
   # Intentionally introduce a type error
   # Verify that `npm run test` fails with type error
   # Verify that `npm run build` fails with type error
   ```

2. **Run full test suite with coverage**
   ```bash
   npm run test:coverage
   ```
   - Verify coverage thresholds match (branches: 8, functions: 9, lines: 19, statements: 21)
   - Check coverage reports generated correctly

3. **Test watch mode**
   ```bash
   npm run test:watch
   ```
   - Verify hot reload works
   - Check performance improvement is noticeable

4. **Remove Jest dependencies**
   ```bash
   npm uninstall jest ts-jest @types/jest jest-environment-jsdom
   ```

5. **Delete Jest configuration**
   ```bash
   rm frontend/jest.config.js
   ```

6. **Update documentation**
   - Update `CLAUDE.md` if needed
   - Update `README.md` or `README_dev.md` with new test commands

7. **Run full CI test suite**
   - Backend tests (should be unaffected)
   - Frontend unit tests (new Vitest setup)
   - E2E Playwright tests (should be unaffected)

**Estimated time**: 30 minutes

## Testing Strategy

**Pre-migration verification:**
```bash
cd frontend
npm run test           # All 42 tests pass
npm run test:coverage  # Coverage meets thresholds
```

**Post-migration verification:**
```bash
cd frontend
npm run test:typecheck        # Type checking works
npm run test                  # All 42 tests pass with typecheck
npm run test:coverage         # Coverage meets thresholds
npm run test:watch            # Watch mode works
```

**Type safety verification:**
```bash
# Test 1: Introduce type error in test file
# Expected: `npm run test` fails with type error

# Test 2: Introduce type error in source file
# Expected: `npm run test` fails with type error

# Test 3: Fix type errors
# Expected: `npm run test` passes
```

**Performance verification:**
```bash
# Before: Time Jest test execution
time npm run test

# After: Time Vitest test execution
time npm run test

# Expected: Vitest faster, especially in watch mode
```

## Rollback Plan

If migration encounters critical issues:

1. **Git branch strategy**: Create feature branch `vitest-migration`
2. **Rollback steps**:
   ```bash
   git checkout samkirk  # Or main branch
   cd frontend
   npm install  # Restore Jest dependencies from package-lock.json
   ```

3. **Keep Jest config**: Don't delete `jest.config.js` until migration verified in CI

4. **Staged commits**: Commit each phase separately for easier rollback
   - Commit 1: Configuration setup
   - Commit 2: Test file updates
   - Commit 3: Cleanup and removal of Jest

## Status History

- 2025-10-24: Issue created with migration plan
- 2025-10-24: Web research completed on Vitest vs Jest performance and type checking
- 2025-10-24: Decision made to proceed with Vitest migration with enforced typecheck
- 2025-10-24: User identified overlap with ISSUE-018 Phase 1 (Jest setup just completed)
- 2025-10-24: Added "Relationship to ISSUE-018" section with rework analysis
- 2025-10-24: Documented two viable paths: (A) migrate later vs (B) migrate now
- 2025-10-24: Recommended Option B (migrate now) to avoid sunk cost fallacy
- 2025-10-24: Quantified waste: ~4-6 hours Jest setup + 30 mins test migration = ~4.5-6.5 hours
- 2025-10-24: User requested analysis documentation without proceeding to implementation
- 2025-10-24: Status remains OPEN, awaiting user decision on Option A vs Option B

## Notes

**TypeScript-first philosophy alignment:**
- User explicitly requested enforcement of type checking at compile/build time
- Vitest's `typecheck` mode uses `tsc --noEmit` under the hood (same as current `typecheck` script)
- npm script enforcement ensures type checking cannot be bypassed
- This maintains the "shift-left" principle while gaining Vitest performance benefits

**Migration considerations:**
- Total test count: 42 tests (manageable migration size)
- Test complexity: Primarily React component tests with mocked fetch
- Risk level: Low (Jest-compatible API, easy rollback)
- CI impact: Minimal (npm scripts remain the same)

**Performance expectations:**
- Current: ~10.36ms per test with ts-jest
- Expected: ~4.9ms per test with Vitest (2x faster)
- Watch mode: Expected 10-20x improvement in iterative development

**Related work:**
- ISSUE-018: Frontend unit test implementation (Phase 1 completed with 42 tests using Jest)
- This migration represents a course correction after ISSUE-018 Phase 1
- See "Relationship to ISSUE-018" section above for detailed overlap analysis
- User explicitly requested sunk cost fallacy consideration in decision-making

## Related Files

**Configuration:**
- `frontend/package.json:34-54` - Test scripts
- `frontend/jest.config.js` - Current Jest config (will be replaced)
- `frontend/vitest.config.ts` - New config (to be created)
- `frontend/src/setupTests.ts` - Test setup (likely no changes)

**Test files:**
- `frontend/src/App.test.tsx` - 28 tests (requires migration from Jest to Vitest)
- `frontend/src/IntakeTab.test.tsx` - 14 tests (requires migration from Jest to Vitest)
- Total: 42 passing Jest tests → migrate to Vitest

**Documentation:**
- `CLAUDE.md` - May need update for test commands
- `README_dev.md` - May need update for test commands
- `bugs/fixed/ISSUE-018-frontend-unit-test-implementation.md` - Related work
