---
id: ISSUE-048
title: Background bash notifications don't work - osascript fails without GUI access
status: open
priority: low
severity: low
component: development-tooling
created: 2025-11-17
updated: 2025-11-17
affects: []
related: []
---

# ISSUE-048: Background bash notifications don't work - osascript fails without GUI access

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Steps to Reproduce](#steps-to-reproduce)
- [Expected Behavior](#expected-behavior)
- [Actual Behavior](#actual-behavior)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
  - [Anthropic Documentation Research](#anthropic-documentation-research)
  - [Observed Behavior](#observed-behavior)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Manual Monitoring (Claude Polls Periodically)](#option-1-manual-monitoring-claude-polls-periodically)
  - [Option 2: Wrapper Script](#option-2-wrapper-script)
  - [Option 3: Agent-Based Monitoring](#option-3-agent-based-monitoring)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

When `./helper-scripts/run-comprehensive-tests.sh` is executed with `run_in_background: true` in Claude Code, the script's built-in notification commands (`afplay` + `osascript`) fail silently because background processes don't have GUI access on macOS.

## Impact

**Who/What is affected:**
- Claude Code monitoring of long-running background bash processes (specifically comprehensive test suite)
- User doesn't receive automatic notifications when tests complete
- Requires manual checking or Claude proactively polling for completion

**Severity:**
- **Low**: Workaround exists (manual monitoring works)
- **Frequency**: Infrequent (comprehensive tests run occasionally, not in normal development workflow)
- **User Experience**: Minor inconvenience - user must remember to check test status

## Steps to Reproduce

1. Launch comprehensive test suite in background mode:
   ```typescript
   Bash({
     command: "./helper-scripts/run-comprehensive-tests.sh",
     run_in_background: true
   })
   ```

2. Wait for tests to complete (~15-20 minutes)

3. **Expected**: Notification sound + dialog box when complete
   **Actual**: No notification (script's osascript commands fail silently)

## Expected Behavior

User receives audible notification (Glass.aiff) and visual dialog box when comprehensive tests complete, as implemented in the script:

```bash
# Lines 162-169 of run-comprehensive-tests.sh
if [ "$NO_NOTIFY" = false ]; then
    if [ $EXIT_CODE -eq 0 ]; then
        afplay /System/Library/Sounds/Glass.aiff
        osascript -e "display dialog \"✅ All comprehensive tests PASSED...\" ..."
    else
        afplay /System/Library/Sounds/Basso.aiff
        osascript -e "display dialog \"❌ Some comprehensive tests FAILED...\" ..."
    fi
fi
```

## Actual Behavior

When run with `run_in_background: true`:
- Script executes successfully
- Notification commands execute but fail silently (no GUI access)
- No sound, no dialog box appears
- User must manually check `BashOutput` tool to see completion

## Root Cause

**Technical Explanation:**

macOS requires GUI access for `osascript` to display dialog boxes. When a bash command runs with `run_in_background: true` in Claude Code:

1. **Background process is detached** from the parent shell environment
2. **No TTY/display server access** - process can't interact with GUI
3. **osascript commands fail silently** - macOS security prevents background processes from displaying UI elements
4. **afplay may also fail** depending on audio session context

**Confirmed via Anthropic Documentation Research:**
- `BashOutput` tool retrieves output from background processes
- Background processes are "automatically cleaned up when Claude Code exits"
- **No explicit guidance** on notification mechanisms for background process completion
- **Gap in documentation**: "How should Claude Code monitor long-running background processes and notify when complete?"

## Evidence

### Anthropic Documentation Research

**Sources Consulted:**
1. `https://code.claude.com/docs/en/interactive-mode.md` - Background bash commands
2. `https://code.claude.com/docs/en/hooks-guide.md` - Notification hooks
3. `https://code.claude.com/docs/en/terminal-config.md` - Notification setup

**Key Findings:**

**Background Bash (interactive-mode.md):**
- "Output is buffered and Claude can retrieve it using the BashOutput tool"
- Each background task receives unique ID for tracking
- **No mention of completion notifications**

**Notification Hooks (hooks-guide.md):**
- Notification event "runs when Claude Code sends notifications"
- Example: Custom `notify-send` command
- **Limitation**: Only triggers when Claude Code itself sends notifications, not when background bash completes

**Terminal Config (terminal-config.md):**
- iTerm2 supports "escape sequence-generated alerts"
- **Limitation**: Requires iTerm2, not applicable to background bash processes

**Conclusion**: Anthropic documentation doesn't explicitly address monitoring background processes or sending notifications upon completion.

### Observed Behavior

**Test on 2025-11-17 17:29-17:44 PST:**
1. Launched comprehensive test with `run_in_background: true`
2. Tests completed after 15 minutes
3. Script's notification commands (lines 162-169) executed but produced no output
4. Claude manually checked `BashOutput` and detected completion
5. **Workaround succeeded**: Claude sent notification via NEW Bash command (not backgrounded):
   ```bash
   afplay /System/Library/Sounds/Glass.aiff && osascript -e "display dialog \"...\""
   ```
6. **Result**: ✅ Notification successfully displayed (sound + dialog)

**Key Insight**: Notifications work when sent from Claude Code's context (foreground Bash), but not from background bash processes.

## Proposed Solutions

### Option 1: Manual Monitoring (Claude Polls Periodically)

**Description**: Claude Code manually monitors background process using `BashOutput` tool, sends notification when status changes to "completed" or "failed".

**Implementation Pattern:**
1. User requests comprehensive test with background mode
2. Claude launches test with `run_in_background: true`
3. Claude periodically checks `BashOutput(bash_id)` (every 1-2 minutes)
4. When status != "running", Claude sends notification via NEW Bash command (foreground)

**Pros**:
- **Simple**: No additional scripts or infrastructure
- **Works today**: Demonstrated successfully on 2025-11-17
- **Flexible**: Claude can provide status updates during execution
- **No code changes**: Uses existing tools

**Cons**:
- **Manual**: Claude must remember to check periodically
- **Not automatic**: Relies on Claude proactively polling
- **Token cost**: Each check consumes tokens (minimal: ~100 tokens/check)

**Implementation Effort**: 0 hours (already working)

**Maintenance**: None - uses existing tools

---

### Option 2: Wrapper Script

**Description**: Create a wrapper script that runs the comprehensive test script, then sends notification via a mechanism that works in background.

**Implementation:**
```bash
#!/bin/bash
# monitor-comprehensive-tests.sh
./helper-scripts/run-comprehensive-tests.sh "$@"
EXIT_CODE=$?

# Option A: Write to temp file, Claude polls file
echo "$EXIT_CODE" > /tmp/comprehensive-test-status.txt
echo "$(date)" >> /tmp/comprehensive-test-status.txt

# Option B: Use macOS notification system (may still fail)
osascript -e "display notification \"Tests complete\" ..."
```

**Pros**:
- **Automated**: Runs without Claude intervention
- **Simple concept**: Standard bash scripting

**Cons**:
- **Same problem**: If wrapper runs in background, osascript still fails (no GUI access)
- **Requires polling**: Claude must still poll temp file or check process status
- **No real advantage**: Doesn't solve the core problem (background processes can't access GUI)
- **Added complexity**: Another script to maintain

**Implementation Effort**: 1 hour

**Maintenance**: Low - wrapper script to maintain

**Verdict**: ❌ **NOT RECOMMENDED** - Doesn't solve the GUI access problem

---

### Option 3: Agent-Based Monitoring

**Description**: Use Claude Code's Task tool to launch a monitoring agent that polls the background process and sends notifications from agent's context.

**Implementation:**
```typescript
// 1. Launch background test
Bash({
  command: "./helper-scripts/run-comprehensive-tests.sh",
  run_in_background: true
})
// Store bash_id: "956716"

// 2. Launch monitoring agent
Task({
  subagent_type: "general-purpose",
  prompt: `Monitor background bash process 956716.
           Poll BashOutput every 60 seconds.
           When status != 'running', send notification via Bash tool (not backgrounded).
           Notification command: afplay /System/Library/Sounds/Glass.aiff && osascript...`
})
```

**Pros**:
- **Fully automated**: No manual intervention required
- **Proper tool usage**: Uses Claude Code tools in separate subprocess
- **GUI access**: Agent can call foreground Bash for notifications
- **Reusable**: Could monitor any long-running background process

**Cons**:
- **Complex**: Requires agent management and coordination
- **Token cost**: Agent runs continuously for 15-20 minutes (~200-300 tokens/minute)
- **Overkill**: For infrequent comprehensive tests (1-2 times per day max)
- **Not documented**: This pattern isn't explicitly documented by Anthropic

**Implementation Effort**: 2-3 hours (agent prompt design + testing)

**Maintenance**: Medium - agent coordination logic to maintain

**Verdict**: ⚠️ **VIABLE but EXCESSIVE** - Works but overkill for infrequent use case

---

## Decision

**Selected: Option 1 (Manual Monitoring)** ⭐ **RECOMMENDED**

**Rationale:**

1. **Proven to Work**: Successfully demonstrated on 2025-11-17 comprehensive test run
2. **Simplicity**: Uses existing tools, no new infrastructure
3. **Appropriate for Frequency**: Comprehensive tests run occasionally (not every hour)
4. **Token Efficiency**: Minimal token cost for periodic checks (~100 tokens/check)
5. **Flexibility**: Claude can provide status updates ("Tests are running, 7 minutes elapsed...")
6. **No Maintenance**: No additional scripts or agents to maintain

**Why Not Wrapper Script?**
- Doesn't solve the GUI access problem (background processes still can't display dialogs)
- Would still require Claude to poll or check completion status
- Adds complexity without benefit

**Why Not Agent?**
- Overkill for infrequent comprehensive test runs
- High token cost for continuous monitoring (15-20 minutes)
- Added complexity not justified by use case frequency
- Could be revisited if comprehensive tests become frequent (hourly CI/CD)

**When to Reconsider:**
- If comprehensive tests run frequently (>5 times per day)
- If other long-running background processes need monitoring
- If Anthropic documents official pattern for background process monitoring

## Implementation

**Current Implementation (Working as of 2025-11-17):**

1. **Launch Test in Background:**
   ```typescript
   Bash({
     command: "./helper-scripts/run-comprehensive-tests.sh",
     run_in_background: true
   })
   // Returns: { bash_id: "956716" }
   ```

2. **Periodic Monitoring Pattern:**
   ```typescript
   // Every 1-2 minutes (or when user asks):
   BashOutput({ bash_id: "956716" })
   // Check status field: "running", "completed", or "failed"
   ```

3. **Send Notification When Complete:**
   ```bash
   # Not backgrounded - has GUI access:
   afplay /System/Library/Sounds/Glass.aiff && \
   osascript -e "display dialog \"Comprehensive test suite completed...\" \
                 with title \"Claude Code - Tests Complete\" \
                 buttons {\"OK\"} default button \"OK\" with icon note"
   ```

**No code changes required** - this pattern works with existing tools.

## Testing

**Test Commands:**
```bash
# Test 1: Launch comprehensive tests in background
cd /Users/sam/Projects/JobHunterAI-Claude
./helper-scripts/run-comprehensive-tests.sh &
BASH_PID=$!

# Wait for completion (15-20 minutes)

# Test 2: Verify script's built-in notifications don't work
# Expected: No sound, no dialog (confirms the issue)

# Test 3: Send notification from foreground bash
afplay /System/Library/Sounds/Glass.aiff && \
osascript -e "display dialog \"Test notification\" \
             with title \"Test\" buttons {\"OK\"} default button \"OK\" with icon note"

# Expected: ✅ Sound plays, dialog appears (confirms workaround works)
```

**Verification:**
- [x] Background process launches successfully
- [x] Script's built-in notifications fail silently (issue confirmed)
- [x] Manual notification from foreground Bash works (workaround confirmed)
- [x] Claude can poll BashOutput and detect completion
- [x] Claude can send notification when complete

**Verified on**: 2025-11-17 17:29-17:47 PST

## Status History

- 2025-11-17: ISSUE created and documented
- 2025-11-17: Investigated Anthropic documentation (interactive-mode, hooks-guide, terminal-config)
- 2025-11-17: Tested workaround (manual monitoring) - **SUCCESS**
- 2025-11-17: **DECISION**: Use Option 1 (Manual Monitoring) - proven to work, appropriate for use case

## Notes

**Key Takeaways:**

1. **Background processes can't access macOS GUI** - This is an OS-level security restriction, not a Claude Code limitation

2. **Manual monitoring is sufficient** - Comprehensive tests run infrequently (1-2 times per day), automated monitoring would be overkill

3. **Anthropic documentation gap** - No official guidance on monitoring background processes or sending notifications upon completion

4. **Future consideration**: If background process monitoring becomes a frequent need across multiple scripts, could:
   - Request official Anthropic documentation/guidance
   - Implement reusable agent pattern
   - Create hook-based notification system

5. **Related workflow consideration**: User has `README_iPhone-notify-setup.md` for iPhone notifications via Pushover, but this issue is specific to macOS dialog notifications for background processes

**Not a blocker**: Current manual monitoring pattern works well and is appropriate for the use case frequency.

## Related Files

- `helper-scripts/run-comprehensive-tests.sh:162-169` - Built-in notification logic that fails in background mode
- `README_iPhone-notify-setup.md` - iPhone notification setup (separate use case)
- `docs/TESTING_STATUS.md` - Documents comprehensive test results
- `CLAUDE.md` - Developer preferences including notification requirements
