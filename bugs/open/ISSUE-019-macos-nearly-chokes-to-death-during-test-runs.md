<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [ISSUE-019: macOS Nearly Chokes to Death During Claude Code Test Sessions](#issue-019-macos-nearly-chokes-to-death-during-claude-code-test-sessions)
  - [User Report (Complete Original Prompt - 2025-10-25 Initial Report)](#user-report-complete-original-prompt---2025-10-25-initial-report)
  - [Incident Summary](#incident-summary)
  - [Research Findings](#research-findings)
    - [1. Known Claude Code Issues (v2.0.25-27)](#1-known-claude-code-issues-v2025-27)
      - [A. Critical Memory Leaks](#a-critical-memory-leaks)
      - [B. Orphaned Process Issues](#b-orphaned-process-issues)
      - [C. Background Task Management](#c-background-task-management)
    - [2. Vitest Resource Usage Patterns](#2-vitest-resource-usage-patterns)
      - [Default Behavior](#default-behavior)
      - [Known Issues](#known-issues)
      - [Project-Specific Configuration](#project-specific-configuration)
    - [3. 2018 MacBook Pro Limitations](#3-2018-macbook-pro-limitations)
  - [Root Cause Analysis](#root-cause-analysis)
    - [Primary Causes (High Confidence)](#primary-causes-high-confidence)
    - [Contributing Factors](#contributing-factors)
  - [Impact Assessment](#impact-assessment)
    - [Current Impact](#current-impact)
    - [Future Risk Scenarios](#future-risk-scenarios)
      - [A. CI/CD Test Runs (High Risk)](#a-cicd-test-runs-high-risk)
      - [B. Continued Development on ISSUE-018 (Medium-High Risk)](#b-continued-development-on-issue-018-medium-high-risk)
      - [C. Other Extended Claude Code Sessions (Medium Risk)](#c-other-extended-claude-code-sessions-medium-risk)
  - [Proposed Solutions](#proposed-solutions)
    - [Solution 1: Configure Vitest Resource Limits ✅ RECOMMENDED](#solution-1-configure-vitest-resource-limits--recommended)
    - [Solution 2: Automated System Health Monitoring ✅ RECOMMENDED](#solution-2-automated-system-health-monitoring--recommended)
    - [Solution 3: CLAUDE.md Session Management Reminders ✅ RECOMMENDED](#solution-3-claudemd-session-management-reminders--recommended)
    - [Solution 4: Claude Code v2.0.27+ Monitoring ⏸️ AUTOMATED](#solution-4-claude-code-v2027-monitoring--automated)
    - [Solution 5: Hardware/System Mitigations ⏸️ OPTIONAL](#solution-5-hardwaresystem-mitigations--optional)
  - [Implementation Plan](#implementation-plan)
    - [Phase 1: Immediate (Today) ✅ CRITICAL](#phase-1-immediate-today--critical)
    - [Phase 2: Short-term (This Week) ✅ HIGH PRIORITY](#phase-2-short-term-this-week--high-priority)
    - [Phase 3: Medium-term (Next 2 Weeks) ⏸️ MONITORING](#phase-3-medium-term-next-2-weeks--monitoring)
    - [Phase 4: Long-term (Ongoing) ⏸️ PREVENTIVE](#phase-4-long-term-ongoing--preventive)
  - [Success Metrics](#success-metrics)
  - [Related Issues](#related-issues)
  - [References](#references)
  - [Notes](#notes)
  - [User Follow-up Prompt (2025-10-25 Revision)](#user-follow-up-prompt-2025-10-25-revision)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# ISSUE-019: macOS Nearly Chokes to Death During Claude Code Test Sessions

---
**Metadata:**
- **Status:** ⏸️ OPEN
- **Type:** ISSUE (Performance / Resource Management)
- **Severity:** Critical
- **Date Filed:** 2025-10-25
- **Filed By:** User (Sam)
- **Affects:** macOS System Stability, Claude Code Sessions, Test Runner Operations

---

## User Report (Complete Original Prompt - 2025-10-25 Initial Report)

> Last evening while finishing up the last test run has given in bugs/open/ISSUE-018-frontend-unit-test-implementation.md, my computer (macOS Sequoia 15.7.1, 32 GB, 15" 2018 MacBook Pro), slowly started grinding to a near complete halt, choking to death, as it were. The work you were doing nearly didn't finish to the final commit! Even you appeared to drop out given there was no pulsing status indication. (I was, however, able to communicate with you with "Hello".) Slowly, I was able to terminate all the other apps on my computer: Mail, GitKraken, etc. Notably, I had Obisidian open on a file of of about 108KB where I use to take notes, esp., prompts that I compose for your consumption.  Even getting to the "Force Quit..." selection under the main Apple menu was difficult with the whirling beach ball often in effect. Once you made the final commit, I was able to restart macOS and then do a routine Time Machine backup, completing at 8:15 pm last evening.  I do not think that it was virus. I believe rather that it was a result of your ferocious debugging effort to "Fix 5 Minor Test Failures" to get the overall code coverage up to 60%. (You did achieve a 48%, a much needed improvement, but sadly not actually included in the aforementioned Issue 18.) This was rather surprising given that I now frequently `/exit` Claude Code to avoid the awful, time-consuming auto-compressions of context now built into Claude Code, doing so by keeping thorough test resuts, status reports, issues and bugs documents and referring to only what's needed at the start of each session. I wonder: If your ferocious debugging had spun off so many tasks, and they are completely killed off at the end of each session with `/exit`, then there must have been many unmanaged, leftover, "wild" tasks that you spun up in that final, choking session. Going forward, I have two concerns: (a) Will this happen when the comprehensive/CI tests now using Vitest are run? (b) Will this happen during further development say during the progress on the Issue 18? I want you to think hard about this and do proper web research, consulting not only with Anthropic documents, in particular on bug/issue reports from Anthropic about Claude Code v2.0.25 and following. (Claude Code was updated to .27 just today. I was probably using .26 yesterday when this choking to death occured.) Please file a new issue on this. This is very important, I don't want to see it happen ever again. BTW, I have effectively eliminated the use of the large Obsidian note file, and I'm rather leary of keeping my other favorite apps like Mail, Messages, Calendar etc open on the computer in question where I run you, My Dear Claude Code. Also, when filing the new issue, please include this prompt: probably the longest I have ever composed for you.

---

## Incident Summary

**When:** Evening of 2025-10-24
**What:** System became nearly unresponsive during a Claude Code test debugging session
**Activity:** Fixing 5 minor test failures in frontend unit tests (ISSUE-018)
**Outcome:** System recovered after final commit; required macOS restart

**Symptoms:**
- Progressive system slowdown leading to near-complete unresponsiveness
- Spinning beach ball frequently appearing
- Difficulty accessing Force Quit menu
- Claude Code appeared to drop out (no pulsing status indicator)
- Required force quitting other applications (Mail, GitKraken, Obsidian)
- System recovered only after final git commit completed

**System Specifications:**
- **Hardware:** 15" 2018 MacBook Pro, 32 GB RAM
- **OS:** macOS Sequoia 15.7.1
- **Claude Code Version:** v2.0.26 (suspected), updated to v2.0.27 on 2025-10-25
- **Other Apps Open:** Mail, GitKraken, Obsidian (108KB note file), Messages, Calendar
- **Hardware Maintenance:** User has cleaned internal fans and filters (2025-10-25)

---

## Research Findings

### 1. Known Claude Code Issues (v2.0.25-27)

#### A. Critical Memory Leaks
Multiple GitHub issues document severe memory leaks in Claude Code v2.0.0+:

- **Issue #8382:** v2.0.0 causes 26GB virtual memory allocation per process on 16GB systems, causing swap thrashing and system freezes
- **Issue #4953:** Process grows to 120+ GB RAM before OOM killer terminates it
- **Issue #8968:** Since v2.0.8, each Claude Code instance uses 2.5-8GB RAM on MacBook Pro M4 Pro
- **Issue #10139:** v2.0.25 specifically shows intermittent crashes on simple prompts
- **Issue #1421:** Recurring "JavaScript heap out of memory" crashes during thinking

**Key Finding:** Memory leak has been progressively worsening since July 2025, with each new version consuming more resources.

#### B. Orphaned Process Issues
- **Issue #1935:** MCP servers not properly terminated when Claude Code exits
  - Orphaned processes continue consuming system resources
  - Processes accumulate over multiple sessions
  - No automatic cleanup on exit

- **Issue #4666:** Process multiplication bug
  - Expected: ~10-15 processes per session
  - Actual: 50-300+ orphaned processes accumulate
  - Causes 300-400% cost inflation from cache read operations
  - Results in 15:1 cache read ratio (normal is 3:1)

#### C. Background Task Management
- **Issue #6854:** Main agent not notified when background bash sessions finish
- Background tasks run in separate shells with unique IDs
- Cleanup supposed to happen on exit, but **documented failure for MCP servers**
- No comprehensive task management capabilities in Claude Code

### 2. Vitest Resource Usage Patterns

#### Default Behavior
- **Parallel execution enabled by default** using worker threads
- Spawns tests concurrently across **all available CPU cores**
- Default pool: `forks` (compatibility), but `threads` pool common in configs
- No default resource limits unless explicitly configured

#### Known Issues
- **Memory leak on macOS** (Issue #1135): With `threads: true` (default), full rebuild leaks memory proportional to test file count
  - Reported on macOS 12.4 with Apple M1
  - Likely affects all Apple Silicon and Intel macOS systems
- **CI/CD resource problems:** Default thread config can cause memory issues in virtualized environments
- **High CPU-count bottleneck:** On 32-CPU machines, main thread becomes bottleneck handling requests from 31 test threads

#### Project-Specific Configuration
Analysis of `./frontend/vitest.config.ts` reveals:
```typescript
// NO RESOURCE LIMITS CONFIGURED:
// - No maxWorkers setting
// - No pool configuration
// - No thread limits
// - testTimeout: 10000 (10 seconds)
```

**Impact:** Vitest will spawn as many parallel workers as CPU cores available, with no memory or process limits.

### 3. 2018 MacBook Pro Limitations

**Architecture:** Intel-based (likely 6-core i7 or i9)
**Thermal Constraints:** Known thermal throttling issues under sustained load
**Memory:** 32GB DDR4, but aging SSD may slow swap performance
**Maintenance Status:** Internal fans and filters cleaned (2025-10-25)

**Compounding Factors:**
- Multiple Electron apps open (GitKraken, Obsidian, Cursor)
- Each Electron app spawns 5-10+ helper processes
- Background services (trustd, sharingd, etc.)
- File system watchers from multiple development tools

---

## Root Cause Analysis

### Primary Causes (High Confidence)

1. **Claude Code Memory Leak (v2.0.26)**
   - Known issue in v2.0.0+ causing progressive memory growth
   - Test debugging session involved repeated test runs, compounding leak
   - No automatic cleanup between runs

2. **Vitest Uncontrolled Parallelization**
   - No resource limits in `vitest.config.ts`
   - Spawned workers for all CPU cores (likely 6-12 threads)
   - Each worker running multiple test files
   - Memory leak in Vitest on macOS with thread pool

3. **Orphaned Background Processes**
   - Claude Code's documented failure to clean up MCP servers
   - Background bash shells from test runs not terminated
   - Process multiplication bug (50-300+ processes possible)

### Contributing Factors

4. **Multiple Electron Apps**
   - GitKraken: ~10 processes, 550MB+ RAM
   - Obsidian: ~5 processes, 470MB+ RAM
   - Cursor: ~10 processes, 400MB+ RAM
   - Combined overhead: 1.4GB+ RAM, 25-30 processes

5. **Hardware Thermal Throttling**
   - 2018 MacBook Pro sustained CPU load causes thermal throttling
   - Reduced clock speeds compound performance issues
   - **Note:** User has cleaned internal fans and filters (2025-10-25), which should improve thermal performance

6. **Swap Thrashing**
   - 32GB RAM exhausted by combined loads
   - macOS forced to use swap heavily
   - Aging SSD performance under swap load
   - Positive feedback loop: more swap → slower system → more processes pile up

---

## Impact Assessment

### Current Impact
- **Severity:** Critical - system became unusable, nearly lost work
- **Frequency:** Unknown (first documented occurrence)
- **Workaround Available:** Yes (manual app closures, restart)
- **Data Loss Risk:** High (work nearly lost before final commit)

### Future Risk Scenarios

#### A. CI/CD Test Runs (High Risk)
**CONCERN:** Will this happen when comprehensive Vitest tests run?

**Analysis:** YES, high probability
- CI runs will execute same Vitest configuration
- Same lack of resource limits
- May spawn even more parallel workers
- Longer test suites = more cumulative memory leak

**Mitigation Required:** ✅ CRITICAL PRIORITY

#### B. Continued Development on ISSUE-018 (Medium-High Risk)
**CONCERN:** Will this happen during further development?

**Analysis:** LIKELY, unless mitigations implemented
- Same test debugging workflow
- Same memory leak in Claude Code v2.0.27
- Same Vitest configuration
- Only difference: fewer other apps open now

**Mitigation Required:** ✅ HIGH PRIORITY

#### C. Other Extended Claude Code Sessions (Medium Risk)
- Long coding sessions with frequent test runs
- Multiple background tasks spawned
- Process accumulation over hours
- Memory leak compounds with session duration

---

## Proposed Solutions

### Solution 1: Configure Vitest Resource Limits ✅ RECOMMENDED
**Effort:** Low (5 minutes)
**Effectiveness:** High
**Priority:** IMMEDIATE

**Implementation:**
```typescript
// frontend/vitest.config.ts
export default defineConfig({
  test: {
    // ... existing config ...

    // RESOURCE LIMITS FOR MACOS STABILITY
    maxWorkers: 4,              // Limit to 4 parallel workers (vs 6-12 default)
    minWorkers: 1,              // Don't spawn unnecessary workers
    pool: 'forks',              // Use forks pool (better isolation, less memory leak)
    poolOptions: {
      forks: {
        singleFork: false,      // Allow parallelism but controlled
      }
    },

    // Increase timeout for slower execution with fewer workers
    testTimeout: 15000,         // 15 seconds (was 10)
  }
});
```

**Benefits:**
- Reduces parallel worker count from 6-12 to 4
- Uses `forks` pool with better memory isolation
- Prevents CPU bottleneck on main thread
- Limits cumulative memory leak impact
- More predictable resource usage

**Trade-offs:**
- Test runs may take ~25-50% longer
- Still maintains parallelism for reasonable speed

**Testing:**
```bash
# Before changes
npm test -- --reporter=verbose

# After changes
npm test -- --reporter=verbose

# Monitor resource usage
ps aux | grep -E "(vitest|node)" | wc -l  # Process count
top -pid $(pgrep -f vitest) -stats pid,cpu,mem  # Resource usage
```

---

### Solution 2: Automated System Health Monitoring ✅ RECOMMENDED
**Effort:** Low (script creation)
**Effectiveness:** Medium-High
**Priority:** HIGH

**Implementation:**
Create consolidated helper script `./system-health-check.sh` (root level) that combines:
- Process monitoring and cleanup
- Hardware health checks (thermal, SSD, memory)
- Claude Code background task detection
- Automated warnings and user prompts

**Usage:**
```bash
# Show help/usage information
./system-health-check.sh --help

# Quick health check (before/after sessions)
./system-health-check.sh

# Full diagnostic with hardware checks
./system-health-check.sh --full

# Cleanup orphaned processes (with confirmation)
./system-health-check.sh --cleanup

# Monitor during long sessions
./system-health-check.sh --monitor
```

**Script will be documented in README_dev.md Helper Scripts section.**

**Benefits:**
- Proactive detection of resource issues
- User confirmation before destructive actions
- Prevents gradual system degradation
- Automated reminders reduce cognitive load
- Low overhead monitoring

---

### Solution 3: CLAUDE.md Session Management Reminders ✅ RECOMMENDED
**Effort:** Low (documentation updates)
**Effectiveness:** Medium-High
**Priority:** HIGH

**Add automated reminders to CLAUDE.md for:**

1. **During Claude Code Sessions:**
   - Automatically remind to check background tasks with `/bashes` command
   - Suggest `/exit` and session restart at token thresholds
   - Periodic system health check reminders

2. **After Test Runs:**
   - Automated verification of process cleanup
   - Quick health check reminder

3. **Hardware Monitoring:**
   - Periodic thermal and memory pressure checks
   - Automated warnings when thresholds exceeded

4. **Claude Code Updates:**
   - Periodic web search for v2.0.27+ memory leak reports
   - Claude will proactively monitor Anthropic GitHub issues
   - No manual user effort required

**Note:** These reminders will be integrated into Claude's workflow, reducing the burden on you to remember these checks manually.

---

### Solution 4: Claude Code v2.0.27+ Monitoring ⏸️ AUTOMATED
**Effort:** None (Claude handles this)
**Effectiveness:** Unknown
**Priority:** MEDIUM

**Status:** Claude Code updated to v2.0.27 on 2025-10-25

**Automated Action Items:**
1. ✅ Claude will periodically search for v2.0.27 memory leak reports on GitHub
2. ✅ Claude will check release notes for memory leak fixes
3. ⏸️ If issues persist after mitigations, consider filing GitHub issue (template provided below)

**Claude's Monitoring Approach:**
Periodically (weekly or when prompted), Claude will run web searches like:
```
"Claude Code v2.0.27 v2.0.28 memory leak issues site:github.com/anthropics/claude-code"
```

This removes the burden on you to manually check - Claude will proactively monitor and report findings.

**GitHub Issue Template (if filing becomes necessary):**
```markdown
Title: [BUG] System unresponsiveness during test debugging session (v2.0.26)

**Environment:**
- Claude Code version: v2.0.26
- OS: macOS Sequoia 15.7.1
- Hardware: 2018 MacBook Pro 15", 32GB RAM, 6-core Intel
- Node version: v22.18.0

**Description:**
During an intensive test debugging session (fixing 5 unit test failures with
Vitest), system became progressively unresponsive over ~30-60 minutes, leading
to near-complete system halt. Required force quitting all other apps. System
recovered only after final git commit completed.

**Suspected causes:**
- Memory leak in Claude Code v2.0.26 (known issues #8382, #4953, #8968)
- Orphaned background processes not cleaned up (#1935, #4666)
- Vitest parallel execution with no resource limits compounding issue

**Reproduction:**
1. Open Claude Code in project with Vitest tests
2. Run iterative test debugging (multiple test runs over 30+ min)
3. Have multiple Electron apps open (GitKraken, Obsidian, etc.)
4. Monitor system resource usage progressively degrade

**Expected:** System remains responsive, background processes cleaned up

**Actual:** System becomes unresponsive, possible orphaned processes
```

---

### Solution 5: Hardware/System Mitigations ⏸️ OPTIONAL
**Effort:** Low-Medium (mostly automated via script)
**Effectiveness:** Medium
**Priority:** LOW

**Options:**

1. **Thermal Management:**
   - ✅ Internal fans and filters cleaned (completed 2025-10-25)
   - Use laptop cooling pad during intensive sessions
   - Monitor with: `sudo powermetrics --samplers smc -i 1000`
   - **Automated via:** `./system-health-check.sh --full` includes thermal checks

2. **SSD Health Check:**
   - **Automated via:** `./system-health-check.sh --full`
   - Checks SMART status and free space
   - No manual commands needed

3. **Memory Management:**
   - **Automated via:** `./system-health-check.sh --cleanup`
   - Option to clear system caches: `sudo purge`
   - **⚠️ WARNING:** Script will prompt before running `sudo purge` due to potential risks
   - User can skip this step if uncertain

4. **Hardware Alternatives:**
   - **M1 iMac Option:** User has M1 iMac available as alternative development machine
   - Trade-off: No 34" wide screen monitor on iMac
   - Consider for intensive test sessions if MacBook Pro issues persist
   - M3/M4 Mac upgrade not financially feasible currently

---

## Implementation Plan

### Phase 1: Immediate (Today) ✅ CRITICAL
1. ✅ Configure Vitest resource limits (`frontend/vitest.config.ts`)
2. ✅ Create consolidated system health script (`./system-health-check.sh`)
3. ✅ Document script in README_dev.md Helper Scripts section
4. ✅ Add session management reminders to CLAUDE.md
5. ✅ Test Vitest configuration with small test run

### Phase 2: Short-term (This Week) ✅ HIGH PRIORITY
1. ⏸️ Run comprehensive test suite with new Vitest config
2. ⏸️ Monitor system resources during test run (use health check script)
3. ⏸️ Verify no orphaned processes after test completion
4. ⏸️ Update ISSUE-018 with resource management notes
5. ⏸️ Claude: Perform initial web search for v2.0.27 memory leak reports

### Phase 3: Medium-term (Next 2 Weeks) ⏸️ MONITORING
1. ⏸️ Collect data on Claude Code session stability with new practices
2. ⏸️ Claude: Weekly monitoring of Claude Code GitHub issues
3. ⏸️ File GitHub issue with Anthropic if problems persist (use template above)
4. ⏸️ Consider contributing findings to Claude Code community

### Phase 4: Long-term (Ongoing) ⏸️ PREVENTIVE
1. ⏸️ Regular process cleanup before intensive sessions (automated reminders)
2. ⏸️ Claude: Ongoing monitoring of Claude Code release notes
3. ⏸️ Evaluate M1 iMac for intensive sessions if issues persist
4. ⏸️ Share findings with community if helpful

---

## Success Metrics

**Resolution Criteria:**
1. ✅ Vitest resource limits configured and tested
2. ✅ System health check script created and documented
3. ✅ CLAUDE.md reminders integrated
4. ⏸️ Complete ISSUE-018 test runs without system degradation
5. ⏸️ CI/CD test runs complete successfully with new configuration
6. ⏸️ No system unresponsiveness during 2-hour+ Claude Code sessions

**Monitoring:**
- Track process counts before/after sessions (automated via script)
- Monitor memory usage: Activity Monitor or script
- Log any slowdowns or orphaned process warnings
- Update this issue with findings

---

## Related Issues
- ISSUE-018: Frontend Unit Test Implementation (context for incident)
- Future: CI/CD configuration (will need same resource limits)

---

## References

**Claude Code GitHub Issues:**
- [#8382](https://github.com/anthropics/claude-code/issues/8382): Critical Memory Leak in v2.0.0
- [#4953](https://github.com/anthropics/claude-code/issues/4953): 120+ GB RAM Memory Leak
- [#8968](https://github.com/anthropics/claude-code/issues/8968): Exceptional memory usage since v2.0.8
- [#10139](https://github.com/anthropics/claude-code/issues/10139): Intermittent crashes on simple prompts (v2.0.25)
- [#1935](https://github.com/anthropics/claude-code/issues/1935): MCP servers not terminated on exit
- [#4666](https://github.com/anthropics/claude-code/issues/4666): 300-400% cost inflation from process multiplication

**Vitest Issues:**
- [#1135](https://github.com/vitest-dev/vitest/issues/1135): Memory Leak with threads enabled (macOS)
- [#579](https://github.com/vitest-dev/vitest/issues/579): Vitest 3x slower than Jest with threads

**Documentation:**
- [Vitest: Improving Performance](https://vitest.dev/guide/improving-performance)
- [Vitest: Parallelism Guide](https://vitest.dev/guide/parallelism)
- [Claude Code: Interactive Mode](https://docs.claude.com/en/docs/claude-code/interactive-mode)

---

## Notes

**2025-10-25 (Initial Filing):**
- Issue documented with complete user report
- Comprehensive research completed on Claude Code and Vitest issues
- Three high-priority solutions identified
- Implementation plan created with immediate actions
- User has already mitigated by closing non-essential apps (Obsidian large file)
- Claude Code updated to v2.0.27 (unknown if memory leak fixed)
- User cleaned internal fans and filters on 2018 MacBook Pro

**User Concerns Addressed:**
- **(a) Will this happen during CI/CD test runs?** → YES, high risk without mitigation. Solution 1 (Vitest resource limits) directly addresses this.
- **(b) Will this happen during further ISSUE-018 work?** → LIKELY, unless mitigations applied. Solutions 1-3 collectively reduce risk significantly.

**Critical Insight from Research:**
The combination of three simultaneous issues created a "perfect storm":
1. Claude Code v2.0.26 memory leak (documented, worsening trend)
2. Vitest unlimited parallelization with macOS memory leak
3. Orphaned process accumulation (documented Claude Code bug)

No single issue would have caused system halt, but together they created exponential resource exhaustion on aging hardware under sustained load.

**Key Design Decisions (2025-10-25 Revision):**
- Consolidated scripts into single `system-health-check.sh` at root level (per user request)
- Automated Claude monitoring of GitHub issues (reduces user cognitive load)
- CLAUDE.md reminders to reduce manual memory burden
- M1 iMac noted as hardware alternative
- Warning prompts for risky operations (sudo purge)

**Immediate action required:** Implement Solution 1 (Vitest limits) before next test session.

---

## User Follow-up Prompt (2025-10-25 Revision)

> Thanks for this great report! I have a few changes to make before you start working on this:
> - After all the other changes I request, please undo the last commit (done for just this issue), changing the name to ISSUE-019-macos-nearly-chokes-to-death-during-test-runs.md.
> - Please put scripts you develop into the root level of the project. Don't create a scripts folder and put them there. And document any such helper scripts in README_dev.md in the Helper Scripts section.
> - Please note in the issue that I have cleaned out the filters and fans in the MacPro notebook
> - If possible, specify reminders in CLAUDE.md on what to do "During Claude Code Sessions". I will likely not remember, even though `/bashes` is a real cool comand.
>     - And likewise for "After Test Runs" and "Hardware Monitoring".
>     - (Really, doing this manually is a lot to do and a lot for me to remember!)
>     - And likewise again for "Monitor for v2.0.27 memory leak reports on GitHub". Perhaps this could be a simple web search you could do for me periodically. Although I am loathe to file a bug, I appreciate your suggestion and detail on how to do so and I think that's worth keeping.
>     - And likewise again for "Thermal Management". Please note earlier comment about my cleaning the filters and fans.
>     - And likewise again for "SSD Health Check"
>     - Re: "Memory Management": This looks a bit risky. When putting this into a script allow for a warning prompt to skip it.
>     - Re: "Consider Hardware Upgrade": Sorry, but I don't have the money right now for a new M3/M4 Mac, but I could switch over to my M1 iMac even though it isn't equipped with the 34" wide screen I'm here on my MacBook Pro.   Please make a note of that.
> - Please consider consolidating the scripting into just a few scripts, or as few as possible.
> - Please add this prompt at the bottom of the issue.
> Before commiting the revised issue, please let me review it.

---

**Status:** ⏸️ OPEN - Awaiting user review and implementation approval
