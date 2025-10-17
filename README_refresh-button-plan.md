<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Plan: Add Global + Per-Job Description Refresh Buttons](#plan-add-global--per-job-description-refresh-buttons)
  - [What We'll Build](#what-well-build)
    - [1. Global Refresh Button (Header)](#1-global-refresh-button-header)
    - [2. Per-Job Refresh Button (Job Card)](#2-per-job-refresh-button-job-card)
  - [Implementation Details](#implementation-details)
  - [Use Cases](#use-cases)
  - [UI Design](#ui-design)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Plan: Add Global + Per-Job Description Refresh Buttons

## What We'll Build

### 1. Global Refresh Button (Header)
**Location**: Next to "Manage Resume" button in header
**Icon**: Refresh icon (from lucide-react)
**Label**: "Refresh Descriptions"
**Action**: Clears entire `condensedDescriptions` cache, all visible jobs re-fetch

### 2. Per-Job Refresh Button (Job Card)
**Location**: In the Debug Info section, next to "Extraction Method"
**Icon**: Small refresh icon
**Label**: Refresh icon button (no text, just icon with tooltip)
**Action**: Removes only that job's description from cache and re-fetches

## Implementation Details

**File**: `frontend/src/App.tsx`

**Changes**:
1. Import `RefreshCw` icon from lucide-react (already imported)
2. Add `clearAllDescriptions()` function that calls `setCondensedDescriptions({})`
3. Add `refreshSingleDescription(jobId)` function that removes one entry and re-fetches
4. Add global button in header (right side, before "Manage Resume")
5. Add per-job button in JobCard debug section (small, unobtrusive)

## Use Cases

**Per-Job Refresh**:
- Testing prompt changes on specific problematic jobs
- Quick iteration on prompt wording
- No need to reload entire page

**Global Refresh**:
- After finalizing prompt changes
- When you want to update all visible jobs at once
- Clear all cached descriptions

## UI Design
- Global button: Prominent, with icon + text
- Per-job button: Small icon-only button with tooltip "Refresh description"
- Both show brief loading state during re-fetch
