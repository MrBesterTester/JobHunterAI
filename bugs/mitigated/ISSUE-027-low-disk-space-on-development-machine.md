---
id: ISSUE-027
title: Low disk space on development machine
status: mitigated
priority: low
severity: low
component: infrastructure
created: 2025-10-31
updated: 2025-10-31
mitigated: 2025-10-31
affects: [build-system, test-infrastructure, development-workflow]
related: []
---

# ISSUE-027: Low disk space on development machine

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Summary](#summary)
- [Impact](#impact)
- [Current State](#current-state)
- [Root Cause](#root-cause)
- [Evidence](#evidence)
- [Proposed Solutions](#proposed-solutions)
  - [Option 1: Immediate Manual Cleanup (Quick Win)](#option-1-immediate-manual-cleanup-quick-win)
  - [Option 2: Automated Cleanup Script (Recommended)](#option-2-automated-cleanup-script-recommended)
  - [Option 3: CI/CD-Style Ephemeral Builds (Long-term)](#option-3-cicd-style-ephemeral-builds-long-term)
  - [Option 4: Hybrid Approach (Best Balance)](#option-4-hybrid-approach-best-balance)
- [Decision](#decision)
- [Implementation](#implementation)
- [Testing](#testing)
- [Status History](#status-history)
- [Notes](#notes)
- [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Summary

MacBook Pro development machine showing 137GB available out of 932GB total (15% free). Analysis reveals primary disk space consumers: Library/Caches (25GB), backend/target Rust artifacts (5.5GB), and Time Machine local snapshots. While not critical yet, proactive cleanup and automated maintenance recommended.

## Follow-up

User will investigate overall disk space usage on development machine, including Time Machine snapshots, as separate action outside this issue. Development-specific artifacts (cargo builds, test results) will not be cleaned due to workflow impact.

## Impact

**Who/What is affected:**
- Development workflow (build operations, test runs)
- CI/CD simulation and testing
- Rust compilation (requires temp space)
- Playwright E2E tests (creates artifacts)

**Severity:**
- **Current**: Low (137GB still available, 15% free)
- **Risk**: Medium if space drops below 10% (build failures, test failures)
- **Trend**: Needs monitoring - E2E test artifacts accumulate over time

## Current State

**Disk Usage Summary:**
- Total: 932GB
- Used: 10GB (system files)
- Available: 137GB (15% free)
- Capacity: 8% (per df -h)

**Note:** Actual available space appears higher than user reported (177GB vs 137GB shown by df). This may indicate user saw different partition or snapshot-inclusive view.

## Root Cause

**Primary Contributors:**

1. **System Caches (~25GB)**
   - Location: `~/Library/Caches`
   - Includes: Browser caches, build tool caches, npm caches, Xcode caches
   - Behavior: Grows continuously without automatic cleanup

2. **Rust Build Artifacts (5.5GB)**
   - Location: `backend/target/`
   - Contains: Compiled binaries, incremental build cache, test artifacts
   - Behavior: Accumulates with each build, not cleaned automatically

3. **Time Machine Local Snapshots**
   - Found: 2 snapshots (2025-10-29, 2025-10-30)
   - Behavior: macOS creates local snapshots for Time Machine backups
   - Space: Can consume significant space (exact size varies)

4. **Development Artifacts (smaller but accumulating)**
   - Playwright test results: 73MB (`frontend/test-results/`)
   - Playwright cache: 988MB (`~/Library/Caches/ms-playwright`)
   - npm packages: 590MB (`frontend/node_modules/`)
   - Log files: Various sizes (`logs/`, test output files)

## Evidence

**Disk Space Analysis (2025-10-31):**
```bash
$ df -h /
Used: 10Gi | Available: 137Gi | Total: 932Gi | Capacity: 8%

$ du -sh ~/Library/Caches
25G     /Users/sam/Library/Caches

$ du -sh ~/Projects/JobHunterAI-Claude/backend/target
5.5G    /Users/sam/Projects/JobHunterAI-Claude/backend/target

$ du -sh ~/Projects/JobHunterAI-Claude/frontend/node_modules
590M    /Users/sam/Projects/JobHunterAI-Claude/frontend/node_modules

$ du -sh ~/Projects/JobHunterAI-Claude/frontend/test-results
73M     /Users/sam/Projects/JobHunterAI-Claude/frontend/test-results

$ du -sh ~/Library/Caches/ms-playwright
988M    /Users/sam/Library/Caches/ms-playwright

$ tmutil listlocalsnapshots /
com.apple.TimeMachine.2025-10-29-180558.local
com.apple.TimeMachine.2025-10-30-192448.local
```

**Test Infrastructure Impact:**
- E2E tests generate verbose output (3,038 lines for 547 tests)
- E2E tests create screenshots/traces in test-results/ (~73MB currently)
- LLM integration tests make real API calls (30-40s each, no local artifacts)

## Proposed Solutions

### Option 1: Immediate Manual Cleanup (Quick Win)

**Description**: One-time manual cleanup of safe-to-delete artifacts to reclaim 5-6GB immediately.

**Commands:**
```bash
# Free 5.5GB - Clean Rust build artifacts (rebuild takes ~30s)
cd /Users/sam/Projects/JobHunterAI-Claude/backend && cargo clean

# Free 73MB - Remove old Playwright test results
rm -rf /Users/sam/Projects/JobHunterAI-Claude/frontend/test-results

# Optional: Clean Time Machine snapshots (requires sudo, space varies)
tmutil listlocalsnapshots / | grep -v "Snapshots" | xargs -I {} sudo tmutil deletelocalsnapshots {}
```

**Pros**:
- Immediate impact (5.5GB+ freed)
- Safe operations (can rebuild/regenerate)
- No ongoing maintenance required
- Zero code changes

**Cons**:
- Manual intervention required
- Next cargo build will be slower (full rebuild)
- Doesn't prevent future accumulation
- Time Machine cleanup requires sudo password

**Implementation Effort**: 5 minutes (user action)

**Maintenance**: Manual cleanup needed periodically (monthly/quarterly)

---

### Option 2: Automated Cleanup Script (Recommended)

**Description**: Create maintenance script that safely cleans development artifacts on schedule or on-demand.

**Implementation:**
```bash
# Create cleanup script
./scripts/cleanup-dev-artifacts.sh

# Features:
- Checks available space, warns if < 20%
- Cleans cargo target/ (with confirmation)
- Cleans test-results/ older than 7 days
- Cleans log files older than 30 days
- Optional: npm cache clean
- Reports space freed
```

**Pros**:
- Reproducible and safe
- Can run automatically (cron/launch agent)
- Configurable thresholds
- Logs what was deleted
- Easy to audit

**Cons**:
- Requires initial script development
- Needs testing to ensure safety
- Still requires periodic execution

**Implementation Effort**: 2-3 hours (script + testing)

**Maintenance**: Automated (runs weekly/monthly via cron)

---

### Option 3: CI/CD-Style Ephemeral Builds (Long-term)

**Description**: Restructure build process to use temporary directories that clean automatically.

**Approach:**
- Set `CARGO_TARGET_DIR` to `/tmp/jobhunter-target/` for development
- Configure Playwright to use `/tmp/test-results/`
- Leverage macOS automatic /tmp cleanup

**Pros**:
- Zero manual maintenance
- Automatic cleanup on reboot
- Prevents accumulation
- CI/CD best practices

**Cons**:
- Slower rebuilds (no incremental compilation cache)
- Lost debug symbols between reboots
- Requires PATH/environment changes
- May impact development workflow

**Implementation Effort**: 4-6 hours (config + testing + docs)

**Maintenance**: None (self-cleaning)

---

### Option 4: Hybrid Approach (Best Balance)

**Description**: Combine Option 1 (immediate cleanup) + Option 2 (automated script) + monitoring.

**Strategy:**
1. **Immediate**: Run manual cleanup to free 5.5GB now
2. **Short-term**: Create cleanup script for regular maintenance
3. **Monitoring**: Add weekly disk space check to development workflow
4. **Long-term**: Consider Option 3 if space becomes chronic issue

**Pros**:
- Immediate relief + long-term solution
- Balanced maintenance burden
- Monitoring prevents future surprises
- Can evolve based on needs

**Cons**:
- Multiple steps to implement
- Still requires some manual intervention

**Implementation Effort**: 5 min (cleanup) + 2-3 hours (script) + 1 hour (monitoring)

**Maintenance**: Mostly automated, quarterly review

## Decision

**Decision**: No cleanup action at this time (2025-10-31)

**Rationale:**
- **Cargo artifacts (5.5GB)**: Not worth the rebuild performance penalty - development velocity more valuable than disk space
- **Playwright test results (73MB)**: Historical test artifacts valuable for retrospective debugging - trivial space vs. debugging time saved
- **Time Machine snapshots**: To be handled separately with system tools if needed
- **Current state**: 137GB available (15% free) provides adequate headroom - no immediate pressure

**User objections to proposed solutions:**
1. Option 1 (Manual cleanup): `cargo clean` would slow down subsequent builds unnecessarily
2. Option 1 (Time Machine): User prefers to handle Time Machine snapshots separately
3. Option 2 (Automated script): Would include same problematic cargo clean operations
4. All options: Cost/benefit analysis favors keeping artifacts for development efficiency

**Next Steps:**
1. Monitor disk space passively (no active cleanup)
2. Revisit if available space drops below 10% (~93GB)
3. User will handle Time Machine cleanup separately if needed

## Implementation

**Status**: No action - issue closed with decision not to implement cleanup (2025-10-31)

**Decision Summary**: All proposed cleanup options rejected due to negative impact on development workflow:
- Cargo clean impacts build performance
- Test artifact cleanup removes valuable debugging history
- Automated scripts would include same problematic operations
- Current 15% free space provides adequate headroom

**If revisited in future** (only if space drops below 10% free):
- Consider selective cleanup of only non-development artifacts (e.g., system caches)
- Avoid touching cargo build artifacts or test results
- Focus on true waste (duplicates, unused downloads, etc.)

## Testing

**Disk Space Monitoring Commands:**
```bash
# Check current disk space
df -h /

# Check specific directories
du -sh ~/Library/Caches
du -sh ~/Projects/JobHunterAI-Claude/backend/target
du -sh ~/Projects/JobHunterAI-Claude/frontend/test-results
du -sh ~/Projects/JobHunterAI-Claude/frontend/node_modules

# Check Time Machine snapshots
tmutil listlocalsnapshots /

# Find large files in project
find ~/Projects/JobHunterAI-Claude -type f -size +100M 2>/dev/null

# Check largest log files
find ~/Projects/JobHunterAI-Claude -name "*.log" -type f -exec du -sh {} \; | sort -rh | head -10
```

**Cleanup Verification:**
```bash
# Before cleanup
df -h / | awk 'NR==2 {print "Before: " $4 " available"}'

# Run cleanup (Option 1)
cd /Users/sam/Projects/JobHunterAI-Claude/backend && cargo clean
rm -rf /Users/sam/Projects/JobHunterAI-Claude/frontend/test-results

# After cleanup
df -h / | awk 'NR==2 {print "After: " $4 " available"}'

# Verify cargo rebuild works
cd /Users/sam/Projects/JobHunterAI-Claude/backend && cargo build
```

**Verification Checklist:**
- [ ] Disk space increased by expected amount after cleanup
- [ ] Cargo rebuild completes successfully
- [ ] Frontend tests still run correctly
- [ ] E2E tests create new test-results/ directory as expected
- [ ] No build errors from missing artifacts

## Status History

- **2025-10-31**: ISSUE-027 created and documented
  - Analysis completed: Identified 25GB caches, 5.5GB Rust artifacts
  - Proposed 4 solution options with recommendations
  - Status: Pending user approval for cleanup approach

- **2025-10-31**: Decision - No cleanup action to be taken
  - User reviewed all proposed options (1-4)
  - Rejected due to workflow impact: cargo rebuild performance hit, loss of test debugging history
  - Current 15% free space (137GB) deemed adequate
  - Issue remains open for monitoring only
  - Will revisit if space drops below 10% (~93GB)

## Notes

**Context**: This issue was identified during comprehensive test suite execution (backend + frontend + E2E tests running ~17 minutes). User noticed disk space at historic low of 177GB available out of 1TB.

**Key Findings:**
- Actual available space (137GB per df) differs from user-reported (177GB) - may indicate different measurement tools or partition views
- E2E test output is verbose (3,038 lines) but expected for 547 tests
- Test duration (~17 min) is within normal range per TESTING_STATUS.md
- No immediate crisis, but proactive cleanup recommended (later rejected by user)

**User Decision Rationale (2025-10-31):**
- **Development efficiency > disk space**: Cargo incremental builds save significant time daily
- **Test history value**: Playwright test results enable retrospective debugging of regressions
- **Adequate headroom**: 15% free (137GB) sufficient for current development needs
- **False economy**: Trading time for trivial space savings (73MB test results) is poor ROI
- **Selective approach**: User will handle Time Machine snapshots separately if needed
- **Better investigation needed**: User will investigate overall disk space usage on development machine, including Time Machine snapshots, as separate action outside this issue

**Disk Space Thresholds:**
- **Comfortable**: > 20% free (> 186GB)
- **Monitoring**: 15-20% free (140-186GB) ← Current state
- **Warning**: 10-15% free (93-140GB)
- **Critical**: < 10% free (< 93GB)

**Related Tools:**
- `cargo clean`: Safe, removes all build artifacts
- `npm cache clean --force`: Removes npm cache (988MB playwright + more)
- `tmutil deletelocalsnapshots`: Requires sudo, deletes local snapshots
- Playwright uses `--grep-invert` to skip tests (not related to disk space)

## Related Files

**Monitoring & Cleanup:**
- `./docs/TESTING_STATUS.md` - Test suite runtime documentation
- `./frontend/playwright.config.ts` - E2E test configuration
- `./frontend/test-results/` - Playwright artifacts directory (73MB)
- `./backend/target/` - Rust build artifacts (5.5GB)
- `./logs/` - Various test and build logs
- `/tmp/e2e-test-results.log` - Current test run output (3,038 lines)

**Future Script Location:**
- `./scripts/cleanup-dev-artifacts.sh` - Proposed cleanup automation
- `./scripts/check-disk-space.sh` - Proposed monitoring script
