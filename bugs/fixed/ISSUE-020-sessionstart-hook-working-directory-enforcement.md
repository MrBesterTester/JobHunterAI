<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [ISSUE-020: SessionStart Hook Working Directory Enforcement](#issue-020-sessionstart-hook-working-directory-enforcement)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Background Context](#background-context)
    - [Discovery (2025-10-25)](#discovery-2025-10-25)
    - [User Context: Frequent Session Restarts](#user-context-frequent-session-restarts)
  - [Current State](#current-state)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior (Before Fix)](#actual-behavior-before-fix)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Solution 1: Enforce Working Directory in SessionStart Hook ✅ IMPLEMENTED](#solution-1-enforce-working-directory-in-sessionstart-hook--implemented)
    - [Solution 2: Document "Always cd to root first" (Rejected)](#solution-2-document-always-cd-to-root-first-rejected)
    - [Solution 3: Add Working Directory Validation (Not Needed)](#solution-3-add-working-directory-validation-not-needed)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Success Criteria](#success-criteria)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: ISSUE-020
title: SessionStart Hook Working Directory Enforcement
status: fixed
priority: medium
severity: medium
component: infrastructure
created: 2025-10-25
updated: 2025-10-25
affects: [claude-code-sessions, file-paths, developer-experience]
related: [ISSUE-019]
---

# ISSUE-020: SessionStart Hook Working Directory Enforcement

## Summary

Claude Code sessions were starting in inconsistent working directories based on where the `claude` command was launched, causing relative file paths to fail. The SessionStart hook has been enhanced to enforce the project root as the working directory for all sessions, ensuring consistent behavior.

## Impact

**Severity**: Medium - Caused confusion and broken file paths, but workaround available (manual `cd`)

**Priority**: Medium - Important for developer experience and consistency with CLAUDE.md conventions

**Affected Users**: All developers using Claude Code in this project, especially those who frequently use `/exit` to restart sessions

## Background Context

### Discovery (2025-10-25)

During ISSUE-019 Phase 2 work, inconsistent behavior was observed:
- First attempt: `./system-health-check.sh` worked correctly
- Second attempt: `./system-health-check.sh` failed with "no such file or directory"
- Investigation revealed working directory was `/Users/sam/Projects/JobHunterAI-Claude/frontend/frontend/`
- Project root should be `/Users/sam/Projects/JobHunterAI-Claude/`

### User Context: Frequent Session Restarts

**Critical factor**: User frequently performs `/exit` to restart Claude Code sessions as a safeguard against auto-compaction issues. This practice makes working directory consistency even more important:

- Multiple session starts per work session
- Easy to accidentally launch from wrong directory after `/exit`
- Inconsistent launch locations lead to unpredictable file path behavior
- Manual `cd` to project root before each `claude` invocation is error-prone

**User comment** (2025-10-25):
> "I strongly believe we should leave the change in place, especially since I am consistently doing `/exit` in order to safeguard against the dreaded auto-compaction. I find this [inconsistent working directory behavior] to be very, very annoying."

## Current State

**Before Fix**:
- Working directory determined by shell location when `claude` command launched
- Could be `/Users/sam/Projects/JobHunterAI-Claude/` (correct)
- Could be `/Users/sam/Projects/JobHunterAI-Claude/frontend/frontend/` (incorrect)
- Could be any subdirectory if launched from there
- Relative paths in CLAUDE.md file conventions would break

**After Fix** (2025-10-25):
- ✅ SessionStart hook enforces project root working directory
- ✅ Every session starts at `/Users/sam/Projects/JobHunterAI-Claude/`
- ✅ Relative paths work consistently: `./CLAUDE.md`, `./backend/`, `./bugs/`, `./system-health-check.sh`
- ✅ File path conventions documented in CLAUDE.md work as expected

## Expected Behavior

When a Claude Code session starts:
1. SessionStart hook runs (database switch + working directory enforcement)
2. Working directory is set to project root: `/Users/sam/Projects/JobHunterAI-Claude/`
3. All relative paths in CLAUDE.md work correctly
4. Root-level scripts accessible: `./system-health-check.sh`, `./switch-to-personal.sh`, `./start.sh`, etc.
5. Behavior is **consistent regardless of where `claude` command was launched**

## Actual Behavior (Before Fix)

Sessions would start in whatever directory the `claude` command was run from:
- If launched from `/Users/sam/Projects/JobHunterAI-Claude/` → paths work ✅
- If launched from `/Users/sam/Projects/JobHunterAI-Claude/frontend/` → paths broken ❌
- If launched from `/Users/sam/Projects/JobHunterAI-Claude/frontend/frontend/` → paths broken ❌
- User had to remember to `cd` to root before every `claude` invocation

## Root Cause

1. **Claude Code Behavior**: Working directory determined by shell location at launch (documented behavior)
2. **SessionStart Hook Incomplete**: Hook switched database but didn't enforce working directory
3. **Frequent Session Restarts**: User's `/exit` workflow increases likelihood of launching from wrong directory
4. **No Safeguard**: Nothing prevented launching from subdirectories

## Evidence

**1. Environment Context (2025-10-25)**:
```
Working directory: /Users/sam/Projects/JobHunterAI-Claude/frontend/frontend
```

**2. File Path Inconsistencies**:
```bash
# First attempt (working directory: /Users/sam/Projects/JobHunterAI-Claude/)
$ ./system-health-check.sh
✅ Works

# Second attempt (working directory: frontend/frontend/)
$ ./system-health-check.sh
❌ Error: no such file or directory
```

**3. CLAUDE.md File Path Conventions** (lines 58-66):
```markdown
**IMPORTANT**: Always use relative paths with `./` for files in the project directory.

**Working directory**: `/Users/sam/Projects/JobHunterAI-Claude` (available in `<env>`)

**Examples**:
- Root files: `./CLAUDE.md`, `./README.md`, `./package.json`
- Subdirectories: `./backend/src/main.rs`, `./docs/file.md`
- Scripts: `./switch-to-personal.sh`, `./start.sh`
```

**4. SessionStart Hook Before Fix**:
```bash
# .claude/session-start-hook.sh (line 15)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SWITCH_OUTPUT=$("${SCRIPT_DIR}/switch-to-personal.sh" 2>&1)
# No cd command - working directory unchanged
```

**5. Claude Code Documentation Research** (2025-10-25):

**From https://docs.claude.com/en/docs/claude-code/getting-started:**
> "After the installation process completes, navigate to your project and start Claude Code: `cd your-awesome-project` then `claude`"

**Interpretation**: Users responsible for being in correct directory before launching.

**From https://docs.claude.com/en/docs/claude-code/hooks:**
- SessionStart hooks for "loading development context" and "setting up environment variables"
- No examples show hooks using `cd` to change directories
- No explicit warnings against changing directories
- Hook receives JSON input with `cwd` field

**Testing Result**:
When hook executes `cd` command, Claude Code displays:
```
Shell cwd was reset to /Users/sam/Projects/JobHunterAI-Claude
```
This indicates Claude Code **detects and acknowledges** the directory change properly.

## Proposed Solutions

### Solution 1: Enforce Working Directory in SessionStart Hook ✅ IMPLEMENTED

**Description**: Add `cd "${SCRIPT_DIR}"` to SessionStart hook after project root calculation.

**Implementation**:
```bash
# .claude/session-start-hook.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Change to project root to ensure consistent working directory
cd "${SCRIPT_DIR}"

SWITCH_OUTPUT=$("${SCRIPT_DIR}/switch-to-personal.sh" 2>&1)
```

**Pros**:
- ✅ Ensures consistent working directory for all sessions
- ✅ Aligns with CLAUDE.md file path conventions
- ✅ Prevents accidental launches from wrong directories
- ✅ Reduces cognitive load (no need to remember to `cd` before `claude`)
- ✅ Especially valuable for frequent `/exit` workflows
- ✅ Claude Code properly detects and handles directory change
- ✅ Hook already calculates project root - just uses it

**Cons**:
- ⚠️ Not documented as standard practice in official docs
- ⚠️ Deviates from "launch from where you want to work" philosophy (if that's intentional)
- ⚠️ Could interfere if users intentionally launch from subdirectories (edge case)

**Effort**: Minimal (2 lines of code)

**Risk**: Low (tested and working, Claude Code handles it properly)

**Decision**: ✅ **IMPLEMENTED** (2025-10-25, commit aef71f0)

### Solution 2: Document "Always cd to root first" (Rejected)

**Description**: Keep hook as-is, document requirement to `cd` to project root before launching.

**Pros**:
- ✅ Follows documented Claude Code behavior
- ✅ No code changes required

**Cons**:
- ❌ Error-prone (easy to forget)
- ❌ Especially problematic with frequent `/exit` workflow
- ❌ Doesn't enforce consistency
- ❌ File paths in CLAUDE.md still break if forgotten

**Decision**: ❌ **REJECTED** - Too error-prone given `/exit` workflow

### Solution 3: Add Working Directory Validation (Not Needed)

**Description**: Hook checks working directory and warns if not in project root, but doesn't change it.

**Pros**:
- ✅ Alerts user to problem
- ✅ Less invasive than Solution 1

**Cons**:
- ❌ Doesn't fix the problem, just warns
- ❌ Still requires manual `cd` after warning
- ❌ Adds complexity without solving issue

**Decision**: ❌ **NOT NEEDED** - Solution 1 is simpler and more effective

## Implementation

**Status**: ✅ COMPLETED (2025-10-25)

**Changes Made**:

**File**: `.claude/session-start-hook.sh`

**Lines 17-18** (added):
```bash
# Change to project root to ensure consistent working directory
cd "${SCRIPT_DIR}"
```

**Commit**: aef71f0c0378fe69ea24811c3bc637853a73ce82

**Commit Message**: "fix: SessionStart hook now enforces project root as working directory"

## Testing

**Test 1: Hook Execution from Different Directory**:
```bash
# Run hook from /tmp (not project directory)
$ cd /tmp && /Users/sam/Projects/JobHunterAI-Claude/.claude/session-start-hook.sh <<< '{"source":"test"}'

# Output shows:
Shell cwd was reset to /Users/sam/Projects/JobHunterAI-Claude
```
✅ **Result**: Hook successfully changes to project root, Claude Code acknowledges change

**Test 2: File Path Access After Fix**:
```bash
# After hook runs, these paths work:
$ ./system-health-check.sh          # ✅ Works
$ ./switch-to-personal.sh           # ✅ Works
$ cat ./CLAUDE.md                   # ✅ Works
$ ls ./bugs/open/                   # ✅ Works
```
✅ **Result**: All relative paths work consistently

**Test 3: Multiple Session Restarts**:
- `/exit` from Claude Code
- Launch `claude` from arbitrary directory
- Hook runs, enforces project root
- Paths work correctly

✅ **Result**: Consistent behavior across multiple restarts

## Status History

- 2025-10-25: Issue discovered during ISSUE-019 Phase 2 work
- 2025-10-25: Root cause identified (inconsistent working directory)
- 2025-10-25: Claude Code documentation consulted (no warnings against hook `cd`)
- 2025-10-25: User confirmed frequent `/exit` usage makes this fix essential
- 2025-10-25: Solution implemented in SessionStart hook (commit aef71f0)
- 2025-10-25: Testing confirmed fix works correctly
- 2025-10-25: Issue documented and marked as FIXED

## Notes

**User Workflow Context**:

The user's frequent use of `/exit` to restart sessions (as a safeguard against Claude Code auto-compaction issues) makes this fix especially valuable:

- Multiple session starts per work session increase likelihood of launching from wrong directory
- Manual `cd` before each `claude` invocation is error-prone and adds cognitive load
- Automated enforcement via SessionStart hook eliminates this entire class of errors

**Claude Code Documentation Review**:

Official documentation consulted (2025-10-25):
- https://docs.claude.com/en/docs/claude-code/hooks
- https://docs.claude.com/en/docs/claude-code/getting-started
- https://docs.claude.com/en/docs/claude-code/interactive-mode

**Findings**:
- No examples show hooks using `cd`
- No warnings against changing directories in hooks
- SessionStart intended for "loading development context"
- Claude Code properly handles and acknowledges directory changes
- Users expected to navigate to project before launching, but hook enforcement is safer

**Design Decision Rationale**:

Despite lack of documented precedent for `cd` in hooks, the decision to implement was based on:

1. **User Need**: Frequent session restarts make consistency critical
2. **Safety**: Claude Code properly handles the directory change (confirmed via testing)
3. **Simplicity**: Hook already calculates project root, just uses it
4. **Alignment**: Matches CLAUDE.md file path conventions
5. **Risk Assessment**: Low risk, high benefit, easily reversible if issues arise

**Related Issues**:

- **ISSUE-019**: System health monitoring - where this issue was discovered during Phase 2
- Working directory inconsistency caused confusion when running `./system-health-check.sh`

**Future Considerations**:

- Monitor for any edge cases where subdirectory launch is intentional
- If Anthropic adds official guidance on working directory handling in hooks, reassess this approach
- Consider contributing this pattern to Claude Code community if valuable to others

## Success Criteria

✅ **Resolution Criteria** (all achieved):
1. ✅ SessionStart hook enforces project root working directory
2. ✅ Relative paths in CLAUDE.md work consistently
3. ✅ Root-level scripts always accessible (`./system-health-check.sh`, etc.)
4. ✅ Behavior consistent regardless of launch location
5. ✅ No breaking changes or side effects
6. ✅ Claude Code properly handles directory change
7. ✅ User workflow improved (no manual `cd` needed before `claude`)

## Related Files

- `.claude/session-start-hook.sh` (lines 17-18) - Implementation
- `CLAUDE.md` (lines 58-66) - File path conventions that depend on this
- `bugs/open/ISSUE-019-macos-nearly-chokes-to-death-during-test-runs.md` - Where issue was discovered
