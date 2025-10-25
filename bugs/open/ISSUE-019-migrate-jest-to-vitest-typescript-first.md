<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: ISSUE-019
title: Migrate Jest to Vitest with TypeScript-First Testing
status: open  # open | mitigated | fixed
priority: medium  # low | medium | high | critical
severity: low  # low | medium | high | critical
component: frontend  # frontend | backend | database | infrastructure | docs
created: 2025-10-24
updated: 2025-10-24
affects: [frontend-testing, ci-pipeline, build-scripts]
related: [ISSUE-018]  # Frontend unit test implementation](#id-issue-019%0Atitle-migrate-jest-to-vitest-with-typescript-first-testing%0Astatus-open---open--mitigated--fixed%0Apriority-medium---low--medium--high--critical%0Aseverity-low---low--medium--high--critical%0Acomponent-frontend---frontend--backend--database--infrastructure--docs%0Acreated-2025-10-24%0Aupdated-2025-10-24%0Aaffects-frontend-testing-ci-pipeline-build-scripts%0Arelated-issue-018---frontend-unit-test-implementation)
- [ISSUE-019: Migrate Jest to Vitest with TypeScript-First Testing](#issue-019-migrate-jest-to-vitest-with-typescript-first-testing)
  - [Summary](#summary)
  - [Impact](#impact)
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
- ISSUE-018: Frontend unit test implementation (Phase 1 completed with 42 tests)
- This migration improves the infrastructure established in ISSUE-018

## Related Files

**Configuration:**
- `frontend/package.json:34-54` - Test scripts
- `frontend/jest.config.js` - Current Jest config (will be replaced)
- `frontend/vitest.config.ts` - New config (to be created)
- `frontend/src/setupTests.ts` - Test setup (likely no changes)

**Test files:**
- `frontend/src/App.test.tsx` - 42 tests (requires migration)
- `frontend/src/IntakeTab.test.tsx` - Tests (requires migration)

**Documentation:**
- `CLAUDE.md` - May need update for test commands
- `README_dev.md` - May need update for test commands
- `bugs/fixed/ISSUE-018-frontend-unit-test-implementation.md` - Related work
