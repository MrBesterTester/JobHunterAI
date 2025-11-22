<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [OAuth Script Integration Strategy](#oauth-script-integration-strategy)
  - [Overview](#overview)
    - [Current Script Inventory](#current-script-inventory)
  - [Use Case Matrix](#use-case-matrix)
  - [Integration Options](#integration-options)
    - [Option 1: Standalone Scripts (Current - RECOMMENDED)](#option-1-standalone-scripts-current---recommended)
    - [Option 2: Meta-Script Orchestration](#option-2-meta-script-orchestration)
    - [Option 3: Enhanced validate-oauth-tokens.sh](#option-3-enhanced-validate-oauth-tokenssh)
  - [Recommended Integration: Documentation-Centric](#recommended-integration-documentation-centric)
    - [CLAUDE.md Integration](#claudemd-integration)
    - [Example Decision Tree for CLAUDE.md:](#example-decision-tree-for-claudemd)
    - [Helper Script README](#helper-script-readme)
  - [Claude Code Behavior Policy](#claude-code-behavior-policy)
    - [When Validation Fails](#when-validation-fails)
    - [Claude Policy Updates](#claude-policy-updates)
  - [Maintenance Schedule Integration](#maintenance-schedule-integration)
    - [Quarterly Check Script (NEW IDEA)](#quarterly-check-script-new-idea)
  - [Implementation Plan](#implementation-plan)
    - [Immediate (Today)](#immediate-today)
    - [Near-term (Next session)](#near-term-next-session)
    - [Future Enhancements](#future-enhancements)
  - [Summary](#summary)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# OAuth Script Integration Strategy

**Date**: 2025-11-21
**Context**: Analysis of how manual token scripts integrate with OAuth management ecosystem

## Overview

We now have a complete OAuth token management toolkit with different scripts for different scenarios:

### Current Script Inventory

1. **`setup-test-oauth.sh`** - Full interactive setup (both providers)
2. **`validate-oauth-tokens.sh`** - Validation only (non-interactive)
3. **`refresh-oauth-tokens.sh`** - Automatic token refresh (non-interactive)
4. **`add-gmail-tokens-manual.sh`** - Manual Gmail token setup (NEW)
5. **`add-microsoft-tokens-manual.sh`** - Manual Microsoft token setup (NEW)

## Use Case Matrix

| Scenario | Script to Use | Interactive? | Duration |
|----------|---------------|--------------|----------|
| **First-time setup (no tokens exist)** | `setup-test-oauth.sh` | Yes | 2-3 min |
| **Both providers expired** | `setup-test-oauth.sh` | Yes | 2-3 min |
| **Check token validity** | `validate-oauth-tokens.sh` | No | 5-10 sec |
| **Access tokens expired (refresh tokens valid)** | `refresh-oauth-tokens.sh` | No | 2-5 sec |
| **Gmail refresh token expired, Microsoft valid** | `add-gmail-tokens-manual.sh` | Yes | 1-2 min |
| **Microsoft refresh token expired, Gmail valid** | `add-microsoft-tokens-manual.sh` | Yes | 1-2 min |
| **Setup interrupted after Gmail success** | `add-microsoft-tokens-manual.sh` | Yes | 1-2 min |
| **Setup interrupted after Microsoft success** | `add-gmail-tokens-manual.sh` | Yes | 1-2 min |

## Integration Options

### Option 1: Standalone Scripts (Current - RECOMMENDED)

**Approach**: Keep scripts independent, document in CLAUDE.md

**Pros**:
- Simple, clear separation of concerns
- Easy to understand which script does what
- No risk of over-complicated orchestration
- Each script is self-contained and testable

**Cons**:
- User needs to know which script to run
- No automatic "smart" selection

**Implementation**:
- Document all 5 scripts in CLAUDE.md OAuth section
- Provide decision tree flowchart
- validate-oauth-tokens.sh error messages already guide to correct script

### Option 2: Meta-Script Orchestration

**Approach**: Create `refresh-oauth-provider.sh` that:
- Runs validation
- Detects which provider failed
- Opens browser for that provider only
- Calls appropriate add-*-tokens-manual.sh

**Pros**:
- More user-friendly (one command handles multiple scenarios)
- Automatic detection of what needs refreshing

**Cons**:
- Additional complexity
- Harder to debug when things go wrong
- Abstraction layer makes it less clear what's happening
- Could confuse Claude (when to use meta-script vs. individual scripts)

**Implementation**: NOT RECOMMENDED - adds complexity without significant benefit

### Option 3: Enhanced validate-oauth-tokens.sh

**Approach**: Modify `validate-oauth-tokens.sh` to:
- Detect failures
- Provide specific commands to fix
- Optionally offer to open browser for re-auth

**Pros**:
- Keeps validation and remediation close together
- Clear error-to-fix workflow

**Cons**:
- Mixes validation (read-only) with setup (write operations)
- Makes validation script more complex

**Implementation**: PARTIALLY DONE - validation already suggests correct script

## Recommended Integration: Documentation-Centric

**Decision**: Keep scripts standalone, integrate through comprehensive documentation

### CLAUDE.md Integration

Add OAuth Toolkit section to CLAUDE.md that:

1. **Lists all 5 scripts with clear purposes**
2. **Provides decision tree** for which script to use
3. **Documents common scenarios** with exact commands
4. **Explains token lifecycle** and maintenance schedule

### Example Decision Tree for CLAUDE.md:

```
OAuth Token Issue?
│
├─ Don't know → Run: ./helper-scripts/validate-oauth-tokens.sh
│  └─ Script will tell you what to do next
│
├─ Both providers expired/invalid
│  └─ Run: ./helper-scripts/setup-test-oauth.sh
│
├─ Gmail only expired/invalid
│  └─ Run: ./helper-scripts/add-gmail-tokens-manual.sh <code>
│     (Open: https://accounts.google.com/o/oauth2/v2/auth?...)
│
├─ Microsoft only expired/invalid
│  └─ Run: ./helper-scripts/add-microsoft-tokens-manual.sh <code>
│     (Open: https://login.microsoftonline.com/.../authorize?...)
│
└─ Need to check status
   └─ Run: ./helper-scripts/validate-oauth-tokens.sh
```

### Helper Script README

Create `helper-scripts/README_OAUTH.md` with:
- Full documentation of all 5 scripts
- Usage examples for each
- Troubleshooting guide
- Common error messages and fixes

## Claude Code Behavior Policy

### When Validation Fails

**Current behavior** (validate-oauth-tokens.sh):
```bash
❌ Gmail refresh token invalid
   Run: ./helper-scripts/setup-test-oauth.sh
```

**Enhanced behavior** (detect which provider failed):
```bash
❌ Gmail refresh token invalid
   Microsoft tokens: VALID ✅

   Option 1 (Faster - Gmail only):
   ./helper-scripts/add-gmail-tokens-manual.sh '<code>'

   Option 2 (Complete - Both providers):
   ./helper-scripts/setup-test-oauth.sh
```

### Claude Policy Updates

Add to CLAUDE.md OAuth section:

**When validation fails for ONE provider:**
1. **Inform user** which provider failed
2. **Provide TWO options:**
   - Fast: Manual script for failed provider only
   - Complete: Full setup for both providers
3. **Let user decide** which approach
4. **NEVER** try to orchestrate the interactive flow

**When validation fails for BOTH providers:**
1. **Provide command**: `./helper-scripts/setup-test-oauth.sh`
2. **Explain**: Full setup required (2-3 minutes)
3. **NEVER** try to orchestrate the interactive flow

## Maintenance Schedule Integration

### Quarterly Check Script (NEW IDEA)

Create `helper-scripts/check-oauth-expiry.sh`:
- Reads Microsoft token creation date from .env.test
- Calculates days remaining until 90-day expiry
- Warns if < 7 days remaining
- Can be run via cron or manually

**Example output**:
```bash
Gmail tokens: Valid (no expiry)
Microsoft tokens: Valid (23 days until expiry)

⚠️  Recommendation: Refresh Microsoft tokens in next 2 weeks
   Run: ./helper-scripts/add-microsoft-tokens-manual.sh
```

## Implementation Plan

### Immediate (Today)

1. ✅ Create `add-gmail-tokens-manual.sh`
2. ✅ Create `add-microsoft-tokens-manual.sh`
3. ⏳ Update CLAUDE.md with OAuth Toolkit section
4. ⏳ Enhance `validate-oauth-tokens.sh` to provide provider-specific fix commands
5. ⏳ Commit all changes

### Near-term (Next session)

6. Create `helper-scripts/README_OAUTH.md` with comprehensive docs
7. Create `check-oauth-expiry.sh` for proactive monitoring
8. Add quarterly reminder to CLAUDE.md

### Future Enhancements

- Consider adding --dry-run flag to manual scripts (shows what would happen)
- Add --validate flag to manual scripts (test tokens after adding)
- Create unified test script that validates all OAuth workflows

## Summary

**Recommended approach**: Documentation-centric integration with standalone scripts

**Key principle**: Keep scripts simple and focused, integrate through clear documentation and guidance

**Claude behavior**: Inform user of options, let user choose, never orchestrate interactive flows

**Maintenance**: Quarterly check for Microsoft expiry, Gmail should be stable
