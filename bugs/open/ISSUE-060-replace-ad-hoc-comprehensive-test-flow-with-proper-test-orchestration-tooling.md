---
id: ISSUE-060
title: Replace ad-hoc comprehensive test flow with proper test orchestration tooling
status: open
priority: high
severity: medium
component: testing-infrastructure
created: 2025-11-19
updated: 2025-11-19
affects: [ISSUE-048, ISSUE-059]
related: [ISSUE-048, ISSUE-059]
---

# ISSUE-060: Replace ad-hoc comprehensive test flow with proper test orchestration tooling

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Current Flow (Ad-hoc and Problematic)](#current-flow-ad-hoc-and-problematic)
  - [Step 1: Starting Tests + Announcing Completion](#step-1-starting-tests--announcing-completion)
  - [Step 2: Monitoring Test Progress (ISSUE-048)](#step-2-monitoring-test-progress-issue-048)
  - [Step 3: Detecting Test Completion (ISSUE-059)](#step-3-detecting-test-completion-issue-059)
  - [Step 4: Generating Test Results](#step-4-generating-test-results)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
  - [User Feedback (2025-11-19)](#user-feedback-2025-11-19)
  - [Token Burn Examples](#token-burn-examples)
  - [Reliability Issues](#reliability-issues)
- [Available Tooling (Research Findings)](#available-tooling-research-findings)
  - [Playwright JSON Reporter](#playwright-json-reporter)
  - [Cargo JSON Output](#cargo-json-output)
  - [cargo-nextest (Recommended Alternative)](#cargo-nextest-recommended-alternative)
  - [Node.js Test Orchestration](#nodejs-test-orchestration)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Node.js Test Orchestrator (Recommended)](#option-1-nodejs-test-orchestrator-recommended)
  - [Option 2: Hybrid - Use cargo-nextest + Improve Bash Script](#option-2-hybrid---use-cargo-nextest--improve-bash-script)
  - [Option 3: Minimal - Just Add Playwright JSON + Fix Notifications](#option-3-minimal---just-add-playwright-json--fix-notifications)
- [Decision](#decision)
- [Implementation Plan](#implementation-plan)
  - [Phase 1: Research and Prototype (2-3 hours)](#phase-1-research-and-prototype-2-3-hours)
  - [Phase 2: Core Orchestrator (3-4 hours)](#phase-2-core-orchestrator-3-4-hours)
  - [Phase 3: Notification and Reporting (3-4 hours)](#phase-3-notification-and-reporting-3-4-hours)
  - [Phase 4: Integration and Testing (1-2 hours)](#phase-4-integration-and-testing-1-2-hours)
- [Testing](#testing)
- [Related Files](#related-files)
- [References](#references)
  - [Documentation](#documentation)
  - [NPM Packages](#npm-packages)
- [Status History](#status-history)
- [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

The current comprehensive test process is "shaggy and rough" with multiple inefficient steps involving significant token burn, manual monitoring, and unreliable notifications. The entire flow should be replaced with proper test orchestration tooling using native TypeScript, Cargo, and Playwright support libraries rather than ad-hoc Bash scripts.

## Impact

**Who/What is affected:**
- Developers running comprehensive test suites
- Claude Code sessions (unnecessary token burn)
- Development velocity (slow feedback loop)
- User experience (missed completion notifications)

**Severity:**
- **Token Burn**: Significant waste checking test status repeatedly (ISSUE-048)
- **Reliability**: Completion notifications not working (ISSUE-059 - test completed 14 min before user checked)
- **Efficiency**: Manual result aggregation from logs rather than structured output
- **Maintainability**: Ad-hoc Bash scripts instead of proper tooling

## Current Flow (Ad-hoc and Problematic)

### Step 1: Starting Tests + Announcing Completion
- **Current**: Manual start via `./helper-scripts/run-comprehensive-tests.sh`
- **Issue**: Ad-hoc timing estimate, no structured progress tracking

### Step 2: Monitoring Test Progress (ISSUE-048)
- **Current**: Periodic log file reading, grep for status updates
- **Issue**: **Massive token burn** - repeatedly reading growing log files, parsing unstructured output

### Step 3: Detecting Test Completion (ISSUE-059)
- **Current**: Check `.test-completion-marker` file periodically
- **Issue**: **Notifications don't work** - test completed 14 minutes before user was notified

### Step 4: Generating Test Results
- **Current**: Parse logs, run commands manually, aggregate results
- **Issue**: Token burn pulling together reports from unstructured sources

## Root Cause

**Missing proper test orchestration infrastructure:**
1. Not using Playwright's built-in JSON reporter
2. Not using Cargo's JSON output format
3. Not using cargo-nextest (next-gen test runner)
4. Not using proper notification libraries (node-notifier)
5. No Node.js orchestrator to coordinate test suites
6. Relying on log parsing instead of structured output

## Evidence

### User Feedback (2025-11-19)
> "The entire comprehensive test process flow is rather shaggy and rough... I still don't get the notification when it's done. The test was done 14 minutes ago when I asked how the test was running!"

### Token Burn Examples
- ISSUE-048: Monitoring test progress burns tokens reading logs
- Log files grow to 100KB+ during comprehensive runs
- Multiple grep/read operations to extract status

### Reliability Issues
- ISSUE-059: Completion marker exists but notification not sent
- Manual checking required to discover test completion

## Available Tooling (Research Findings)

### Playwright JSON Reporter

**Official Built-in Reporter:**
```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']  // Still show terminal output
  ]
});
```

**Features:**
- Structured JSON output with all test results
- Lifecycle hooks: `onBegin()`, `onTestBegin()`, `onTestEnd()`, `onEnd()`
- Custom reporter API for real-time events
- CTRF standard support (third-party: `playwright-ctrf-json-reporter`)
- Shard report merging support

**References:**
- https://playwright.dev/docs/test-reporters
- https://playwright.dev/docs/api/class-reporter

### Cargo JSON Output

**Unstable JSON Format (Available Now):**
```bash
RUSTC_BOOTSTRAP=1 cargo test -- -Z unstable-options --format json --report-time
```

**2025 Stabilization:**
- Rust Project Goal 2025h2: Stabilize libtest JSON output
- Reference: https://rust-lang.github.io/rust-project-goals/2025h2/libtest-json.html

**Features:**
- JSON Lines format (one event per line)
- Real-time streaming output
- Programmatic test results

### cargo-nextest (Recommended Alternative)

**Next-generation test runner:**
```bash
cargo install cargo-nextest
cargo nextest run --message-format json
```

**Features:**
- Process-per-test isolation (better than cargo test)
- JUnit XML output (stable)
- Experimental JSON output
- `--test-rerun-failures` for smart retries
- Better orchestration capabilities

**References:**
- https://nexte.st/
- https://nexte.st/docs/machine-readable/

### Node.js Test Orchestration

**Built-in Test Runner (Node 20+):**
- Native test organization and suites
- `--test-rerun-failures` support
- Structured output

**Desktop Notifications:**
- `node-notifier` package for native OS notifications
- Webhook support via Express for completion events

**References:**
- https://nodejs.org/api/test.html
- https://www.npmjs.com/package/node-notifier

## Proposed Solutions

### Option 1: Node.js Test Orchestrator (Recommended)

**Description**: Create a proper TypeScript-based test orchestrator that coordinates all test suites using their native JSON outputs.

**Architecture:**
```
src/test-orchestrator/
├── orchestrator.ts          # Main coordinator
├── reporters/
│   ├── playwright-json.ts   # Playwright JSON parser
│   ├── cargo-json.ts        # Cargo JSON parser
│   └── aggregator.ts        # Result aggregation
├── notifiers/
│   └── desktop.ts           # node-notifier integration
└── types/
    └── test-results.ts      # Unified result types
```

**Flow:**
1. **Start**: Orchestrator spawns all test processes with JSON output enabled
2. **Monitor**: Real-time JSON stream parsing (no log file reading!)
3. **Track**: In-memory progress tracking with structured data
4. **Notify**: Immediate desktop notification on completion via node-notifier
5. **Report**: Generate comprehensive report from structured JSON data

**Implementation:**
```typescript
// Simplified example
class TestOrchestrator {
  async runComprehensive() {
    // Start all test suites with JSON output
    const backend = spawn('cargo', ['nextest', 'run', '--message-format', 'json']);
    const frontend = spawn('npm', ['test', '--', '--json']);
    const e2e = spawn('npx', ['playwright', 'test', '--reporter=json']);

    // Parse JSON streams in real-time
    const results = await Promise.all([
      this.parseCargoJSON(backend.stdout),
      this.parseFrontendJSON(frontend.stdout),
      this.parsePlaywrightJSON(e2e.stdout)
    ]);

    // Aggregate and notify
    const report = this.aggregateResults(results);
    await this.sendNotification(report);
    await this.generateReport(report);
  }
}
```

**Pros:**
- **Zero token burn** - structured data, no log parsing
- **Real-time progress** - JSON stream parsing, not periodic checks
- **Reliable notifications** - node-notifier desktop notifications
- **Structured output** - JSON in, JSON out
- **Maintainable** - TypeScript with types, not Bash
- **Reusable** - Can be used by CI/CD, not just Claude

**Cons:**
- Initial development effort (8-12 hours)
- New dependency (node-notifier)
- Requires stable JSON formats (Cargo still unstable)

**Implementation Effort**: 8-12 hours
- 3-4 hours: Core orchestrator + JSON parsers
- 2-3 hours: Desktop notification integration
- 2-3 hours: Report generation
- 1-2 hours: Testing and integration

**Maintenance**: Low (uses standard libraries, well-typed)

### Option 2: Hybrid - Use cargo-nextest + Improve Bash Script

**Description**: Keep Bash orchestrator but switch to cargo-nextest and add Playwright JSON reporter.

**Changes:**
```bash
# Use cargo-nextest with JUnit XML (stable)
cargo nextest run --junit junit.xml

# Use Playwright JSON reporter
npx playwright test --reporter=json,list

# Parse structured outputs instead of logs
```

**Pros:**
- Smaller change (4-6 hours)
- Structured outputs available immediately
- Still uses familiar Bash

**Cons:**
- Still requires token burn for monitoring (reading files)
- Notification reliability still unclear
- Less maintainable than TypeScript solution
- Doesn't solve fundamental orchestration issues

**Implementation Effort**: 4-6 hours

**Maintenance**: Medium (still Bash-based)

### Option 3: Minimal - Just Add Playwright JSON + Fix Notifications

**Description**: Keep everything as-is but add Playwright JSON reporter and fix node-notifier.

**Pros:**
- Minimal change (2-3 hours)
- Improves report generation

**Cons:**
- Doesn't solve monitoring token burn
- Doesn't solve orchestration issues
- Still ad-hoc and fragile

**Implementation Effort**: 2-3 hours

**Maintenance**: High (doesn't address core issues)

## Decision

**Recommendation: Option 1 (Node.js Test Orchestrator)**

**Rationale:**
1. **Addresses root cause** - proper orchestration, not ad-hoc scripts
2. **Eliminates token burn** - structured JSON streams, no log parsing
3. **Reliable notifications** - proper notification library (node-notifier)
4. **Future-proof** - can integrate with CI/CD, not just Claude
5. **Maintainable** - TypeScript with types, standard practices
6. **Reusable** - other developers benefit from proper tooling

**Trade-off:** Higher initial effort (8-12 hours) but significantly better long-term solution.

## Implementation Plan

### Phase 1: Research and Prototype (2-3 hours)
1. Create `src/test-orchestrator/` directory structure
2. Research exact JSON formats from each test suite
3. Build minimal prototype that runs one test suite and captures JSON
4. Verify node-notifier works on macOS

### Phase 2: Core Orchestrator (3-4 hours)
1. Implement main orchestrator class
2. Add JSON stream parsers for each test suite
3. Implement progress tracking (in-memory, no files)
4. Add error handling and cancellation support

### Phase 3: Notification and Reporting (3-4 hours)
1. Integrate node-notifier for desktop notifications
2. Build result aggregator
3. Generate comprehensive report from structured data
4. Add timing and performance metrics

### Phase 4: Integration and Testing (1-2 hours)
1. Replace `./helper-scripts/run-comprehensive-tests.sh` call
2. Test with real comprehensive suite
3. Verify notifications work correctly
4. Document new system

## Testing

**Verification Steps:**
- [ ] Backend tests produce valid JSON output
- [ ] Frontend tests produce valid JSON output
- [ ] E2E tests produce valid JSON output (Playwright JSON reporter)
- [ ] Orchestrator correctly parses all JSON streams
- [ ] Progress tracking works without reading log files
- [ ] Desktop notification appears immediately on completion
- [ ] Generated report matches previous format
- [ ] Zero token burn during monitoring
- [ ] Works with partial failures (some tests fail)
- [ ] Handles test cancellation gracefully

**Test Commands:**
```bash
# Run via orchestrator
npm run test:comprehensive

# Should:
# - Start all three test suites
# - Show real-time progress
# - Send desktop notification on completion
# - Generate comprehensive report
# - Complete without Claude intervention
```

## Related Files

**Current Implementation:**
- `./helper-scripts/run-comprehensive-tests.sh` - Current Bash orchestrator
- `./helper-scripts/check-test-completion.sh` - Completion marker check
- `.test-completion-marker` - Completion signal file

**Proposed Implementation:**
- `src/test-orchestrator/orchestrator.ts` - Main coordinator (new)
- `src/test-orchestrator/reporters/` - JSON parsers (new)
- `src/test-orchestrator/notifiers/desktop.ts` - Notification (new)
- `playwright.config.ts` - Add JSON reporter
- `package.json` - Add node-notifier dependency

**Related Issues:**
- ISSUE-048: Token burn monitoring test progress
- ISSUE-059: Completion marker implemented but notifications not working

## References

### Documentation
- Playwright Reporters: https://playwright.dev/docs/test-reporters
- Cargo Nextest: https://nexte.st/
- Rust libtest JSON (2025h2): https://rust-lang.github.io/rust-project-goals/2025h2/libtest-json.html
- Node.js Test Runner: https://nodejs.org/api/test.html

### NPM Packages
- `node-notifier`: https://www.npmjs.com/package/node-notifier
- `playwright-ctrf-json-reporter`: https://www.npmjs.com/package/playwright-ctrf-json-reporter
- `cargo-nextest`: https://crates.io/crates/cargo-nextest

## Status History

- 2025-11-19: ISSUE created, research completed, Option 1 recommended

## Notes

**Why This Matters:**

Current flow has fundamental architectural issues:
1. **Reactive rather than proactive** - checking for status rather than being notified
2. **Unstructured data** - parsing logs rather than consuming JSON
3. **Token waste** - reading same data multiple times
4. **Unreliable** - notifications missed (14 min delay reported)

Proper orchestration with structured outputs is standard practice in modern testing infrastructure. We should use the tools these ecosystems provide rather than reinventing with Bash scripts.

**User Quote (2025-11-19):**
> "I think that each of these steps should be neatly codified into deterministic code possibly with help from the TypeScript, Cargo or Playwright support libraries and tools not just as ad hoc Bash scripts. Please open up an issue on this doing web research as needed on those support libraries and tools. I really think we're missing something."

User is correct - we ARE missing proper tooling that these ecosystems already provide.
