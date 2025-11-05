<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [ISSUE-031: Claude Not Following Existing File Discovery Guidance in CLAUDE.md](#issue-031-claude-not-following-existing-file-discovery-guidance-in-claudemd)
  - [Summary](#summary)
  - [Background](#background)
  - [Current CLAUDE.md Guidance (Lines 387-414)](#current-claudemd-guidance-lines-387-414)
    - [For Exploratory Searches (Primary Method)](#for-exploratory-searches-primary-method)
    - [For Specific Known Targets Only (Narrow Exceptions)](#for-specific-known-targets-only-narrow-exceptions)
    - [Critical: Always Avoid](#critical-always-avoid)
  - [The Real Problem: Anti-Pattern of Bash Command Usage](#the-real-problem-anti-pattern-of-bash-command-usage)
  - [Evidence of the Problem](#evidence-of-the-problem)
  - [Impact](#impact)
  - [Root Cause Analysis](#root-cause-analysis)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Strengthen CLAUDE.md Guidance (Recommended)](#option-1-strengthen-claudemd-guidance-recommended)
    - [Option 2: Create Enforcement Checklist](#option-2-create-enforcement-checklist)
    - [Option 3: Session Start Reminder](#option-3-session-start-reminder)
    - [Option 4: All of the Above](#option-4-all-of-the-above)
  - [Decision](#decision)
  - [Implementation Plan](#implementation-plan)
  - [Testing](#testing)
  - [Related Issues](#related-issues)
  - [Status History](#status-history)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: ISSUE-031
title: "Claude Not Following Existing File Discovery Guidance in CLAUDE.md"
status: open
type: workflow
priority: high
severity: high
component: workflow
created: 2025-11-04
updated: 2025-11-04
affects: [claude-behavior, file-discovery, tool-usage]
related: [ISSUE-011]
---

# ISSUE-031: Claude Not Following Existing File Discovery Guidance in CLAUDE.md

## Summary

Claude Code consistently uses bash commands (`find`, `ls`, `grep`, `cat`) for file operations instead of following the existing comprehensive file discovery guidance in CLAUDE.md lines 387-414. The guidance is correct and comprehensive - the problem is behavioral adherence, not documentation gaps.

## Background

**User's observation**: "You're still having a more general problem of trying to find files. It seems to me this a problem you're struggling with."

**User's directive**: "Please research Anthropic docs, do a review of CLAUDE.md regarding that and then also take a look at Issue 11 of that problem that was fixed the wrong way!"

**Key finding**: ISSUE-011 addressed the wrong problem (file path prefix conventions) when the real problem is Claude not following existing file discovery tool guidance.

## Current CLAUDE.md Guidance (Lines 387-414)

The guidance is **already correct and comprehensive**:

### For Exploratory Searches (Primary Method)
- **Use Task tool with subagent_type=Explore** - NOT Glob/Grep directly
- Reduces context usage and provides better search results
- Examples: "Where are errors handled?", "How does X work?", "What is the codebase structure?"

### For Specific Known Targets Only (Narrow Exceptions)
- **Glob tool**: When you know the exact file pattern
  - Example: `bugs/**/*ISSUE-018*.md`
- **Grep tool**: When searching within specific file or 2-3 known files
  - Example: `Grep: "class Foo" path: ./src/auth.ts`
- **Read tool**: When you know the exact file path
  - Always preferred over bash `cat`, `head`, `tail`

### Critical: Always Avoid
- Using bash `find`, `grep`, `cat` commands for file operations
- Using Glob/Grep for exploratory searches (use Task/Explore instead)
- Guessing file paths instead of searching properly

## The Real Problem: Anti-Pattern of Bash Command Usage

**Claude's consistent pattern of mistakes**:

1. **Using `find` instead of Glob**:
   ```bash
   # ❌ WRONG (Claude's habit)
   find . -name "*.sh" -type f

   # ✅ CORRECT (per CLAUDE.md)
   Glob: **/*.sh
   ```

2. **Using `ls` instead of Read or Glob**:
   ```bash
   # ❌ WRONG (Claude's habit)
   ls helper-scripts/

   # ✅ CORRECT (per CLAUDE.md)
   Glob: helper-scripts/*
   # OR if verifying directory exists:
   Read: helper-scripts/README.md
   ```

3. **Using `grep` instead of Grep tool**:
   ```bash
   # ❌ WRONG (Claude's habit)
   grep -r "function foo" src/

   # ✅ CORRECT (per CLAUDE.md)
   Grep: pattern="function foo" path="src/"
   ```

4. **Using `cat` instead of Read tool**:
   ```bash
   # ❌ WRONG (Claude's habit)
   cat ./bugs/README.md

   # ✅ CORRECT (per CLAUDE.md)
   Read: ./bugs/README.md
   ```

5. **Using Glob/Grep for exploratory searches instead of Task/Explore**:
   ```
   # ❌ WRONG (Claude's habit)
   Glob: **/*auth*
   Grep: "authentication"
   # (multiple rounds of guessing and checking)

   # ✅ CORRECT (per CLAUDE.md)
   Task: subagent_type=Explore
   prompt: "How does authentication work in this codebase?"
   ```

## Evidence of the Problem

**Recent examples from this session**:
1. Looking for helper scripts - tried bash commands instead of Glob or Read
2. Investigating file discovery - didn't use Task/Explore for exploratory search
3. Checking for ISSUE files - used Glob correctly (rare success!)

**Historic pattern**: This is a recurring problem across many sessions, not a one-time mistake.

## Impact

**Severity: High** - This anti-pattern causes:
- **Token waste**: Bash command outputs consume more tokens than tool results
- **Incorrect results**: Bash commands may fail due to permissions, path issues
- **Poor user experience**: User sees Claude struggle with basic file operations
- **Violated guidance**: Directly contradicts documented project standards

**Priority: High** - This happens frequently and undermines project efficiency.

## Root Cause Analysis

**Why does this happen despite clear guidance?**

Possible explanations:
1. **System prompt dominance**: Anthropic's system instructions may emphasize bash commands over project-specific tool guidance
2. **Habit/training**: Claude's base training heavily emphasizes bash for file operations
3. **Insufficient reinforcement**: CLAUDE.md guidance isn't strong enough to override default behavior
4. **Visibility**: Guidance buried in middle of 400+ line document

## Proposed Solutions

### Option 1: Strengthen CLAUDE.md Guidance (Recommended)

**Add emphatic warnings at multiple locations**:

1. **Add to "Developer Preferences" section** (near top of CLAUDE.md):
   ```markdown
   ### File Discovery: Critical Tool Usage Requirements

   **⚠️ CRITICAL**: NEVER use bash commands for file operations!

   - ❌ NO: `find`, `ls`, `grep`, `cat`, `head`, `tail`
   - ✅ YES: `Read`, `Glob`, `Grep`, `Task/Explore`

   See "Efficient File Discovery" section for details.
   ```

2. **Add reminder in multiple high-visibility sections**:
   - Near "Development Commands" section
   - Near "Bug Tracking Workflow" section
   - Near "API Endpoints" section

3. **Add to Anthropic system reminders** (if possible):
   - Request that file operation guidance be emphasized in system prompts

### Option 2: Create Enforcement Checklist

Add to CLAUDE_WORKFLOWS.md:

```markdown
## File Discovery Checklist (Before Every File Operation)

Before using ANY file operation, ask yourself:

1. **Do I know the exact file path?** → Use `Read` tool
2. **Do I know the file pattern?** → Use `Glob` tool
3. **Do I need to search file contents in 1-3 known files?** → Use `Grep` tool
4. **Am I doing exploratory search?** → Use `Task/Explore`
5. **Never ask yourself**: "Should I use bash find/ls/grep/cat?" → Answer is ALWAYS NO
```

### Option 3: Session Start Reminder

Add to `.claude/session-start-hook.sh`:

```bash
echo "⚠️  REMINDER: Use Read/Glob/Grep/Task tools - NEVER bash find/ls/grep/cat"
```

### Option 4: All of the Above

Implement all three solutions for maximum effectiveness.

## Decision

**Selected**: [To be determined by user]

## Implementation Plan

1. [ ] Strengthen CLAUDE.md with prominent warnings
2. [ ] Add File Discovery Checklist to CLAUDE_WORKFLOWS.md
3. [ ] Add session start reminder to hook
4. [ ] Test adherence in next session
5. [ ] Document results and iterate if needed

## Testing

**Success criteria**:
- Claude uses Task/Explore for exploratory file searches
- Claude uses Read for known file paths
- Claude uses Glob for file pattern matching
- Claude uses Grep for content searches in known files
- Claude NEVER uses bash `find`, `ls`, `grep`, `cat` commands

**Test scenarios**:
1. "Find all test files" → Should use Task/Explore or Glob
2. "What does App.tsx do?" → Should use Read
3. "Where is authentication implemented?" → Should use Task/Explore
4. "Find files mentioning 'auth'" → Should use Grep or Task/Explore

## Related Issues

- **ISSUE-011**: File path prefix conventions (addressed wrong problem)
  - ISSUE-011 documented `./` prefix standards
  - But the real problem was using bash commands vs proper tools
  - ISSUE-011 should remain as-is (documents useful research)
  - ISSUE-031 addresses the behavioral problem ISSUE-011 missed

## Status History

- **2025-11-04**: Issue created after user identified ongoing file discovery problems
- **2025-11-04**: Research completed - found CLAUDE.md guidance is correct, problem is adherence

## Notes

**Why ISSUE-011 "was fixed the wrong way"**:
- ISSUE-011 focused on path prefix conventions (`./` vs no prefix)
- The real problem was using bash commands instead of proper tools
- Path prefixes were a symptom, not the disease
- This issue addresses the root cause

**Key insight**: The documentation is already correct. The problem is behavioral - Claude needs stronger reinforcement to follow existing guidance.

**User frustration indicator**: "You're still having a more general problem" suggests this is a recurring, noticeable issue that degrades user experience.
