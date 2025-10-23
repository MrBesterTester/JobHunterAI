---
id: ISSUE-009
title: Session Management and Documentation Best Practices
status: open
priority: low
severity: low
component: docs
created: 2025-10-23
updated: 2025-10-23
affects: [claude-code-workflow, documentation-quality, token-efficiency]
related: [ISSUE-008]
---

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [ISSUE-009: Session Management and Documentation Best Practices](#issue-009-session-management-and-documentation-best-practices)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Current State](#current-state)
  - [Desired Outcome](#desired-outcome)
  - [Root Cause](#root-cause)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Add to CLAUDE.md (Recommended)](#option-1-add-to-claudemd-recommended)
    - [Option 2: Create Standalone docs/BEST-PRACTICES.md](#option-2-create-standalone-docsbest-practicesmd)
    - [Option 3: Keep as ISSUE Only](#option-3-keep-as-issue-only)
  - [Decision](#decision)
  - [Implementation](#implementation)
  - [Testing](#testing)
  - [Status History](#status-history)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# ISSUE-009: Session Management and Documentation Best Practices

## Summary

Establish systematic reminders for two key Claude Code workflow best practices: (1) proactively suggesting session restarts when token usage is high or context becomes unfocused, and (2) reviewing recent git commit messages when updating project documentation (PHASE plans, README files, etc.) to ensure comprehensive coverage of recent work.

## Impact

**Token Efficiency**:
- High token usage degrades Claude Code performance and increases costs
- Fresh sessions provide clearer context and faster responses
- Session restarts reduce context bloat from long conversations

**Documentation Quality**:
- Git commit messages serve as a detailed "work log" of recent changes
- Reviewing commits before documentation updates ensures nothing is missed
- Commit messages provide exact file paths, implementation details, and rationale
- User appreciates well-crafted commit messages and wants to leverage them

**Developer Experience**:
- Proactive session management suggestions demonstrate awareness of token efficiency
- Systematic documentation review process leads to more accurate, complete updates
- Reduces cognitive load on user to remember all recent changes

## Current State

**Session Management**:
- Ad-hoc suggestions to restart sessions
- No systematic monitoring of token usage thresholds
- User appreciates when Claude Code suggests session restarts (happened once yesterday)
- `/cost` command available but not proactively used

**Documentation Updates**:
- Documentation updates happen reactively
- Commit messages not systematically reviewed before doc updates
- Risk of forgetting to document recent work in PHASE plans and README files
- User recognizes commit messages as an "overlooked resource"

## Desired Outcome

**Session Management Reminders**:
- Proactive suggestions to restart sessions when:
  - Token usage approaches 100K-150K tokens (50-75% of 200K budget)
  - Context becomes scattered across multiple unrelated topics
  - Starting a new major task after completing previous work
  - Performance noticeably degrades (slower responses)
- Guidance on using `--continue` or `--resume` to restart with context

**Documentation Update Reminders**:
- When asked to update PHASE plans, README files, or other project docs:
  1. First run `git log -n [N] --oneline` to review recent commits
  2. Optionally run `git log -n [N] --format=fuller` for detailed messages
  3. Use commit messages to identify what changed since last doc update
  4. Ensure all significant changes are reflected in documentation
- Reminder appears automatically when documentation update tasks begin

## Root Cause

**Lack of Documented Process**:
- No established workflow for session management
- No systematic procedure for leveraging git history during doc updates
- Best practices discovered through use but not formally captured

**Tool Underutilization**:
- `/cost` command exists but not proactively used
- Git history available but not routinely consulted before doc updates
- Session resume features (`--continue`, `--resume`) not promoted

## Proposed Solutions

### Option 1: Add to CLAUDE.md (Recommended)

**Description**: Add a new section "Session Management & Documentation Workflow" to CLAUDE.md with both reminders.

**Pros**:
- Most visible location (CLAUDE.md loaded every session)
- Claude Code automatically aware of these practices
- Consistent with existing developer preferences in CLAUDE.md
- No additional files to maintain

**Cons**:
- Adds ~100-150 lines to CLAUDE.md (modest token increase)
- CLAUDE.md growing in size (though still manageable)

**Implementation Effort**: 30 minutes

**Section Structure**:
````markdown
## Session Management & Documentation Workflow

### Token Efficiency & Session Restarts

**When to suggest session restart**:
- Token usage ≥100K tokens (check with `/cost`)
- Context scattered across unrelated topics
- Starting new major task after completing previous work
- Noticeable performance degradation

**How to suggest restart**:
"We're at [X]K tokens (~[Y]% of budget). Consider restarting the session for better performance. You can resume with `claude --continue` to maintain context."

### Documentation Updates from Git History

**When updating project documentation** (PHASE plans, README files):
1. First review recent commits:
   ```bash
   git log -n 20 --oneline
   git log -n 10 --format=fuller  # detailed messages
   ```
2. Identify changes since last doc update
3. Ensure all significant work is documented
4. Reference specific commits in doc updates when relevant

**Why**: Commit messages capture exact details that might be forgotten when updating docs manually.
````

### Option 2: Create Standalone docs/BEST-PRACTICES.md

**Description**: Create a dedicated file for Claude Code workflow best practices.

**Pros**:
- Dedicated location for all workflow guidance
- Doesn't add to CLAUDE.md token count
- Can grow over time with more best practices
- Easier to share with team members

**Cons**:
- New file to maintain
- Less visible than CLAUDE.md (not auto-loaded)
- Requires explicit reference/import in CLAUDE.md

**Implementation Effort**: 45 minutes (create file + reference in CLAUDE.md)

### Option 3: Keep as ISSUE Only

**Description**: Don't implement reminders anywhere; keep this ISSUE as reference documentation.

**Pros**:
- Zero implementation effort
- No additional token overhead
- Still searchable and documented

**Cons**:
- Not visible to Claude Code during sessions
- Requires manual reference
- Easy to forget without systematic prompts

**Implementation Effort**: 0 minutes (already complete)

## Decision

**Awaiting user decision** - Recommending Option 1 for maximum visibility and automation.

## Implementation

Not yet implemented.

## Testing

**Validation Criteria**:
- [ ] Session restart suggestions appear when token usage ≥100K
- [ ] Session restart suggestions appear when starting new major tasks
- [ ] Git log review happens before documentation updates
- [ ] Documentation updates reference recent commits when relevant
- [ ] User confirms reminders are helpful and not intrusive

**Manual Test**:
1. Simulate high token usage scenario - verify suggestion to restart
2. Request PHASE plan update - verify git log is reviewed first
3. Check that suggestions are actionable and appropriately timed

## Status History

- 2025-10-23: Issue filed based on user request for systematic reminders about session management and documentation workflows

## Notes

**Context from User**:
- User appreciates well-crafted commit messages
- User explicitly requested reminder to review commits when updating docs
- User noted yesterday's session restart suggestion was valuable
- User wants systematic approach, not ad-hoc suggestions

**Related Claude Code Features**:
- `/cost` command: Shows token usage breakdown
- `--continue`: Resume most recent session
- `--resume`: Interactive picker for past sessions
- Session checkpointing: Automatic conversation history storage

**Token Budget Context**:
- Current budget per session: 200,000 tokens
- Sonnet 4.5 model in use
- Average ISSUE file: ~6KB (~2K tokens)
- CLAUDE.md current size: ~8KB (~3K tokens)

**Documentation Files Commonly Updated**:
- `docs/PHASE-*.md` - Phase implementation plans
- `README.md` - Project overview (may split per ISSUE-008)
- `README_dev.md` - Developer documentation (pending ISSUE-008)
- `CHANGELOG.md` - Release notes (if/when created)

**File References**:
- CLAUDE.md: `/Users/sam/Projects/JobHunterAI-Claude/CLAUDE.md`
- Potential new file: `/Users/sam/Projects/JobHunterAI-Claude/docs/BEST-PRACTICES.md`
- This ISSUE: `/Users/sam/Projects/JobHunterAI-Claude/bugs/open/ISSUE-009-session-reminders.md`
