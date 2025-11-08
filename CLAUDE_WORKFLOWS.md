<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [CLAUDE_WORKFLOWS.md](#claude_workflowsmd)
  - [Table of Contents](#table-of-contents)
  - [Session Management & Documentation Workflow](#session-management--documentation-workflow)
    - [Token Efficiency & Session Restarts](#token-efficiency--session-restarts)
    - [Documentation Updates from Git History](#documentation-updates-from-git-history)
    - [Documentation Status Accuracy](#documentation-status-accuracy)
    - [Iterative Documentation Refinement](#iterative-documentation-refinement)
    - [Updating PROJECT_STATUS.md](#updating-project_statusmd)
  - [Testing & Verification Standards](#testing--verification-standards)
    - [Core Principles](#core-principles)
    - [Test Result Reporting Standards](#test-result-reporting-standards)
    - [Investigation Workflow](#investigation-workflow)
    - [Performance Monitoring](#performance-monitoring)
    - [Automated Test Execution](#automated-test-execution)
    - [When to Mark Tests as Complete](#when-to-mark-tests-as-complete)
    - [User Accountability](#user-accountability)
  - [System Health Monitoring & Resource Management](#system-health-monitoring--resource-management)
  - [Backend Development & Restart Workflow](#backend-development--restart-workflow)
    - [When to Restart Backend](#when-to-restart-backend)
    - [Required Restart Commands](#required-restart-commands)
    - [Claude's Automatic Reminders](#claudes-automatic-reminders)
    - [Integration with Testing Workflow](#integration-with-testing-workflow)
    - [What stop.sh Cleans Up](#what-stopsh-cleans-up)
    - [Consequences of Forgetting to Restart](#consequences-of-forgetting-to-restart)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# CLAUDE_WORKFLOWS.md

This file contains detailed behavioral guidelines and workflow standards for Claude Code when working in this repository. These guidelines ensure consistency, quality, and efficiency across all Claude Code sessions.

**For project essentials** (tech stack, architecture, commands), see [CLAUDE.md](CLAUDE.md).

---

## Table of Contents

- [Session Management & Documentation Workflow](#session-management--documentation-workflow)
  - [Token Efficiency & Session Restarts](#token-efficiency--session-restarts)
  - [Documentation Updates from Git History](#documentation-updates-from-git-history)
  - [Documentation Status Accuracy](#documentation-status-accuracy)
  - [Iterative Documentation Refinement](#iterative-documentation-refinement)
  - [Updating PROJECT_STATUS.md](#updating-project_statusmd)
- [Testing & Verification Standards](#testing--verification-standards)
  - [Core Principles](#core-principles)
  - [Test Result Reporting Standards](#test-result-reporting-standards)
  - [Investigation Workflow](#investigation-workflow)
  - [Performance Monitoring](#performance-monitoring)
  - [Automated Test Execution](#automated-test-execution)
  - [When to Mark Tests as Complete](#when-to-mark-tests-as-complete)
  - [User Accountability](#user-accountability)
- [System Health Monitoring & Resource Management](#system-health-monitoring--resource-management)

---

---

## Session Management & Documentation Workflow

**✅ IMPLEMENTED**: Automatic workflow best practices for token efficiency and documentation quality (2025-10-23)

### Token Efficiency & Session Restarts

**Proactive Monitoring**: Claude Code will automatically monitor token usage and conversation context to suggest session restarts at optimal times.

**When Claude will suggest a session restart**:
- Token usage reaches 100,000-150,000 tokens (50-75% of 200K budget)
- Conversation context becomes scattered across multiple unrelated topics
- Starting a new major task after completing previous work
- Performance noticeably degrades (slower responses)

**How Claude will suggest restarts**:
Claude will proactively say something like:
> "We're at 120K tokens (~60% of budget). I recommend restarting the session for better performance. You can resume with `claude --continue` to maintain context."

**User benefit**: No need to remember to check `/cost` or manually monitor token budgets - Claude handles this automatically.

**Session Resume Commands**:
```bash
claude --continue              # Resume most recent session with full context
claude --resume                # Interactive picker for past sessions
```

### Documentation Updates from Git History

**Automatic Git Review**: When updating project documentation (PHASE plans, README files, etc.), Claude will automatically review recent git commits first to ensure comprehensive coverage.

**Claude's automatic workflow when asked to update docs**:
1. First run: `git log -n 20 --oneline` to review recent work
2. Optionally run: `git log -n 10 --format=fuller` for detailed commit messages
3. Identify all changes since last documentation update
4. Ensure all significant work is reflected in the documentation
5. Reference specific commits when relevant

**Example of what you'll see**:
> "Before I update the PHASE 2.4 plan, let me review recent commits to ensure we capture all the work..."
>
> [Claude runs git log and analyzes commits]
>
> "I can see we completed X, Y, and Z based on commits abc123, def456, and ghi789. I'll make sure all of these are documented."

**Why this matters**:
- Git commit messages capture exact details that might be forgotten
- Commit messages provide specific file paths and line numbers
- Systematic review prevents incomplete documentation
- Leverages user's well-crafted commit messages as a detailed "work log"

**User benefit**: No need to remind Claude to check git history or manually recall all recent changes - Claude does this automatically before every documentation update.

### Documentation Status Accuracy

**CRITICAL RULE**: Never mark work as "✅ COMPLETED" in documentation until testing verifies it actually works.

**Correct Implementation Order**:
1. **Code First**: Implement backend/frontend changes
2. **Test Second**: Run tests and verify functionality works as expected
3. **Document Last**: Update documentation and mark as "✅ COMPLETED (date)" ONLY after successful testing
4. **Commit Together**: Include code + tests + documentation in a single atomic commit

**Status Markers to Use**:
- `🔄 IN PROGRESS` - Code written, testing not yet started
- `⏸️ PENDING TESTING` - Code complete, awaiting verification
- `✅ COMPLETED (date)` - **Tested and verified working** ← Only use after testing passes!
- `⏸️ PARTIALLY COMPLETE` - Some parts done, others pending (be specific about what's complete vs pending)

**Why This Matters**:
- Documentation accuracy - claims should reflect actual verified state
- If testing reveals bugs, premature "completed" markers become incorrect
- Future readers trust completion markers to mean "tested and working"
- Maintains professional documentation standards

**Example - Correct Workflow**:
```
User: "Implement pagination for RapidAPI"

Claude:
1. Writes code changes (backend/src/main.rs)
2. Adds docs with status: "⏸️ PENDING TESTING"
3. Runs tests to verify pagination works
4. Updates docs to: "✅ COMPLETED (2025-10-23)"
5. Commits everything together with accurate status
```

**Example - INCORRECT Workflow** (don't do this):
```
Claude:
1. Writes code changes
2. Adds docs with status: "✅ COMPLETED" ← WRONG! Not tested yet!
3. Tests afterwards (lucky it worked, but status was wrong before testing)
4. Commits
```

**User benefit**: Documentation completion markers are trustworthy and reflect actual verified implementation status, not aspirational goals.

### Iterative Documentation Refinement

**IMPORTANT PRINCIPLE**: The best summaries always come at the end of investigation, after understanding is complete.

**The Challenge**:
- During investigation, you write detailed documentation in issue files
- After investigation completes, you gain clarity and can write concise summaries
- Summary documents (like `docs/TESTING_STATUS.md`) should remain high-level "forest view"
- Detail documents (like `bugs/open/ISSUE-*.md`) contain the "tree view" investigation

**Best Practice - Two-Pass Documentation**:

1. **First Pass** (during investigation):
   - Write detailed findings in the issue/bug file
   - Include root causes, evidence, technical analysis
   - Document everything discovered

2. **Second Pass** (after investigation):
   - Review what you wrote and distill key insights
   - Update summary documents with concise "forest view"
   - Link to detail documents for deep dives
   - Remove duplicate detail from summary docs

**Example - TESTING_STATUS.md should contain**:
```markdown
✅ Fixed 4/8 tests (50%)
⚠️ Remaining 4 expose app code bugs
Pattern: Sequential generation fails
Details: See [ISSUE-023](link) for full investigation
```

**Example - TESTING_STATUS.md should NOT contain**:
- Line-by-line test analysis
- Detailed root cause explanations
- Full stack traces
- Technical implementation details
- Everything that's already in ISSUE-023

**Forest vs Trees Analogy**:
- **Forest view** (summary docs): "4 tests reveal sequential generation bug"
- **Tree view** (issue docs): "Test 2 fails at line 4145 because modal doesn't appear after second generateContent() call due to state not resetting..."

**User benefit**: Summary documents remain readable and provide quick status overview, while detailed investigation remains available in linked issue files.

### Updating PROJECT_STATUS.md

**When to update**: After completing major milestones, closing significant issues, or when project status changes substantially (roughly weekly or bi-weekly).

**Data sources to check** (in order):
1. **bugs/README.md** - Bug counts, open issues list, priority breakdown
2. **docs/TESTING_STATUS.md** - Test counts, coverage percentages, test infrastructure status
3. **git log --oneline --since="8 days ago"** - Recent commits and activity
4. **bugs/fixed/** - Recent closed issues (check file modification times)
5. **LOC counts**: `find frontend/src -name "*.tsx" -o -name "*.ts" | xargs wc -l | tail -1`
6. **Phase docs**: Review `docs/PHASE_*.md` for current progress updates

**Key sections to update**:
- **Last Updated**: Current date
- **Testing Infrastructure**: Copy latest stats from TESTING_STATUS.md
- **Recent Work**: List closed issues from last 7-8 days (check bugs/fixed/ mtimes)
- **Open Issues**: Count from bugs/README.md + extract high-priority items
- **Bug Tracking**: Total/open/mitigated/fixed counts from bugs/README.md
- **Project Metrics**: Update test counts, coverage, LOC, commit count

**Before overwriting**:
```bash
# Always backup first!
cp docs/PROJECT_STATUS.md docs/backups/PROJECT_STATUS.md.$(date +%Y%m%d-%H%M%S).bak
```

**Quick commands for metrics**:
```bash
# Bug counts
grep "Total Bugs\|Open\|Fixed" bugs/README.md | head -5

# Test stats
grep -E "passing|coverage" docs/TESTING_STATUS.md | head -10

# Recent commits (last 8 days)
git log --oneline --since="8 days ago" | wc -l

# Recent closed issues
find bugs/fixed -name "*.md" -mtime -7 -exec basename {} \;

# LOC counts
echo "Frontend: $(find frontend/src -name "*.tsx" -o -name "*.ts" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
echo "Backend: $(find backend/src -name "*.rs" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
```

**Note**: The script `scripts/update-project-status.sh` attempts to automate this but is complex and brittle. Manual updates with the above guidance are often more reliable and allow for editorial judgment.

---

## Testing & Verification Standards

**✅ IMPLEMENTED**: Comprehensive testing standards for frontend (Jest) and backend (Cargo) test suites (2025-10-27)

**Context**: Created to ensure rigorous test result analysis beyond superficial pass/fail reporting. Console output suppression (ISSUE-021) makes output cleaner, but does NOT mean ignoring failures, skipped tests, or warnings. Investigation depth and test result understanding are critical.

**Testing Status & Progress Tracking**:
- **Current Status**: See [docs/TESTING_STATUS.md](docs/TESTING_STATUS.md) for comprehensive frontend testing progress
- **Investigation Guide**: See [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for detailed investigation examples and tutorials
- **Genesis Report**: [README_test-report-10-23-2025.md](README_test-report-10-23-2025.md) - Initial assessment revealing zero frontend unit tests
- **Active Issues**: ISSUE-018 (frontend unit test implementation), ISSUE-023 (test failure fixes)

### Core Principles

**CRITICAL RULE**: Test results require investigation and understanding, not just pass/fail counts.

**What "passing tests" actually means**:
- ✅ All assertions passed
- ✅ No skipped tests (or skipped tests are intentional and documented)
- ✅ No unexpected warnings or deprecation notices
- ✅ Execution time is reasonable (not hanging or degraded)
- ✅ No flaky behavior (consistent pass/fail across runs)

**Investigation is ALWAYS required for**:
- Test failures (even a single failure)
- Skipped tests (understand why they're skipped)
- Warnings or deprecation notices
- Performance degradation (execution time increases)
- Exit codes other than 0 (especially 143, 137)
- Unusual patterns in output

### Test Result Reporting Standards

**❌ UNACCEPTABLE Reporting** (superficial):
```
Tests passed! ✅
```

**✅ REQUIRED Reporting** (investigative):
```
Test results from ./run-tests.sh:
- ✅ 77/78 tests passing (98.7%)
- ❌ 1 failing: IntakeTab.test.tsx:245 - assertion failure in 'should handle source identification'
  - Expected: sourceType = 'gmail'
  - Actual: sourceType = 'unknown'
  - Root cause: API mock not returning correct source identification
- ⏭️ 2 skipped: CalendarTab.test.tsx:82, :183
  - Reason: Marked as .skip() with comment 'TODO: API integration pending'
  - Assessment: Intentional, tracked in ISSUE-018 Phase 2B
- ⚠️ Warning: Test execution took 45s (expected 10-15s)
  - Possible cause: Resource contention or memory pressure
  - Action: Running system health check...
- 📊 Log saved: logs/frontend-tests/test-run-20251027-143022.log

Investigating the IntakeTab.test.tsx:245 failure...
```

### Investigation Workflow

**IMPORTANT**: When investigating test failures, **proactively read** [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for detailed examples before reporting results. Don't rely on memory - use the documented examples.

When tests fail, investigate systematically:
1. Read full test output (error messages, patterns, warnings)
2. Read the failing test file and component being tested
3. Check test logs for stack traces
4. Identify root cause (not just symptoms)
5. Propose specific fix with reasoning

For skipped tests: Find `.skip()` in source, verify intentional and tracked in issues.

For warnings: Investigate deprecations, performance issues, memory leaks - don't ignore.

For performance degradation: Compare with baseline, check system resources with `./system-health-check.sh`.

**Reference documentation**:
- Investigation examples: [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)
- System health procedures: [README_dev.md - system-health-check.sh](README_dev.md#system-health-checksh)

### Performance Monitoring

**Expected baselines**: Frontend tests ~15-25s, Backend ~2-5s, E2E ~3-5 mins

Investigate when execution time >2x baseline, tests hang, or resource usage spikes. Use `./system-health-check.sh` to diagnose.

### Automated Test Execution

**Use standardized test scripts** (ISSUE-021):
```bash
# Frontend tests (recommended)
cd frontend && ./run-tests.sh

# Frontend tests (fast iteration, skip typecheck temporarily)
cd frontend && ./run-tests.sh --no-typecheck

# Frontend tests (specific suite)
cd frontend && ./run-tests.sh --filter "Phase 2A"

# Backend tests
cd backend && cargo test
```

**Why use scripts vs direct commands**:
- Automatic log file creation with timestamps
- Clear exit code explanations (143, 137, etc.)
- Integrated TypeScript checking
- Timing measurements
- Consistent execution across sessions

### When to Mark Tests as Complete

**Before marking any work "✅ COMPLETED" in documentation**:
1. ✅ All tests pass (no failures)
2. ✅ No unintentional skipped tests
3. ✅ No new warnings introduced
4. ✅ Performance is acceptable (within 2x baseline)
5. ✅ Test coverage meets requirements
6. ✅ Tests actually validate the implemented functionality (not just mock stubs)

**This aligns with**: "Documentation Status Accuracy" section above - only mark complete after verification.

### User Accountability

**Hold Claude accountable** - If you ever see:
- ❌ Just pass/fail stats without investigation
- ❌ Ignoring skipped tests
- ❌ Not reading error messages or stack traces
- ❌ Marking work complete without running tests
- ❌ Superficial "looks good" without verification

**Please call it out immediately.** This documentation codifies the investigation standard expected for every test run.

**User benefit**: Rigorous, investigative test result analysis ensures test suite integrity, catches regressions early, and maintains high code quality. Documentation and completion markers are trustworthy.

---

## System Health Monitoring & Resource Management

**✅ IMPLEMENTED**: Automated health monitoring for Claude Code sessions (created after ISSUE-019 critical incident)

**IMPORTANT**: When system performance issues arise, **proactively read** [README_dev.md - system-health-check.sh](README_dev.md#system-health-checksh) for detailed monitoring procedures, thresholds, and diagnostic steps.

**Claude proactively monitors:**
- Process counts (Node.js, Jest, background shells)
- Memory usage patterns and orphaned processes
- Session duration/complexity
- Test run performance
- Claude Code memory leak reports (GitHub)

**When Claude will remind you:**
- Before intensive test runs (>100 tests)
- Every 60-90 minutes during extended sessions
- After long-running tasks (builds, test suites >5 mins)
- When system feels slow or resource-constrained

**Primary commands:**
```bash
./system-health-check.sh           # Quick check (Claude runs automatically)
./system-health-check.sh --full    # Hardware diagnostics (needs sudo)
./system-health-check.sh --cleanup # Kill orphaned processes (you approve)
/bashes                             # Check background shells
```

**Jest resource limits**: `maxWorkers: 4` in `jest.config.js` (ISSUE-022) prevents system overload during parallel test execution.

**Full documentation**: [README_dev.md - system-health-check.sh](README_dev.md#system-health-checksh) - includes usage examples, thresholds, and troubleshooting.

---

## Backend Development & Restart Workflow

**✅ IMPLEMENTED**: Mandatory backend restart workflow to prevent stale process issues (created after recurring "forgot to restart" incidents)

**CRITICAL RULE**: Always restart the backend after making code changes to Rust files or environment variables.

### When to Restart Backend

**REQUIRED restart scenarios:**
1. **After modifying any Rust source files** (`backend/src/*.rs`)
2. **After changing environment variables** (`backend/.env`)
3. **Before running E2E tests** (ensures fresh backend state)
4. **After database schema changes** (ensures ORM models are current)
5. **When backend behavior seems stale or incorrect** (first troubleshooting step)

**Optional restart scenarios:**
- After long debugging sessions (to clear any cached state)
- When switching between branches with different backend code
- After system sleep/wake (ports may be stale)

### Required Restart Commands

**ALWAYS use this exact sequence:**
```bash
./helper-scripts/stop.sh    # Stop all processes + cleanup orphans
./helper-scripts/start.sh   # Start backend with fresh environment
```

**Why this matters:**
- `stop.sh` kills the old backend process **and** cleans up orphaned processes (Playwright, cargo test, npm test)
- Starting a new backend without stopping first = **stale backend serving old code**
- Environment variables are only loaded at backend startup
- Tests will fail mysteriously if backend is serving old code

### Claude's Automatic Reminders

**Claude will automatically remind you to restart when:**
- You make changes to `backend/src/*.rs` files
- You run backend tests after making code changes
- You're about to run E2E tests
- You mention investigating backend behavior issues
- User corrects Claude for forgetting to restart

**Example reminder:**
> "Before we run these tests, let me restart the backend to ensure we're testing the latest code:
> ```bash
> ./helper-scripts/stop.sh && ./helper-scripts/start.sh
> ```"

### Integration with Testing Workflow

**E2E testing checklist** (from Testing Standards):
1. ✅ **RESTART BACKEND** (`./helper-scripts/stop.sh && ./helper-scripts/start.sh`)
2. ✅ Verify backend is running (`curl http://localhost:8080/api/jobs`)
3. ✅ Run E2E tests
4. ✅ Investigate any failures

**Backend unit testing checklist**:
1. ✅ **STOP BACKEND** (`./helper-scripts/stop.sh`) - unit tests run backend internally
2. ✅ Run backend tests (`cd backend && cargo test`)
3. ✅ If tests pass and you need to run E2E: **START BACKEND** (`./helper-scripts/start.sh`)

### What stop.sh Cleans Up

**Current orphan cleanup** (lines 154-176 in stop.sh):
- ✅ Orphaned Playwright test processes
- ✅ Backend processes (cargo run + jobhunter-backend binary)
- ✅ Frontend processes (react-scripts + rsbuild)
- ✅ Port occupation checks (8080, 3000)

**Strengthened cleanup** (see next section):
- ✅ Orphaned cargo test processes
- ✅ Orphaned npm/jest test processes
- ✅ Orphaned Rust compiler processes
- ✅ Any process using ports 8080 or 3000 (even if not matching exact pattern)

### Consequences of Forgetting to Restart

**What happens:**
- ❌ Backend serves old code with stale behavior
- ❌ Environment variable changes are ignored
- ❌ Tests fail mysteriously (testing old code, not new code)
- ❌ Debugging wastes time (observing old behavior)
- ❌ User gets frustrated correcting Claude

**Historical incidents:**
- ISSUE-035 Phase 5: Forgot to restart after fixing API deserialization bug
- Multiple sessions: User had to remind Claude "you didn't restart the backend"

**Prevention:**
- This workflow document (you're reading it!)
- Claude proactively reminds before test runs
- Always use helper scripts (not manual `cargo run`)
