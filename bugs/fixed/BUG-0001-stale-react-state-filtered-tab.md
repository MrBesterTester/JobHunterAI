<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

  - [id: BUG-0001
title: Stale React State in Filtered Tab - No Auto-Refresh Mechanism
status: fixed
priority: medium
severity: medium
component: frontend
created: 2025-10-21
updated: 2025-10-21
fixed: 2025-10-21
affects: [UI, Data Refresh, All Tabs]
related: []
commits: []](#id-bug-0001%0Atitle-stale-react-state-in-filtered-tab---no-auto-refresh-mechanism%0Astatus-fixed%0Apriority-medium%0Aseverity-medium%0Acomponent-frontend%0Acreated-2025-10-21%0Aupdated-2025-10-21%0Afixed-2025-10-21%0Aaffects-ui-data-refresh-all-tabs%0Arelated-%0Acommits-)
- [BUG-0001: Stale React State in Filtered Tab - No Auto-Refresh Mechanism](#bug-0001-stale-react-state-in-filtered-tab---no-auto-refresh-mechanism)
  - [Summary](#summary)
  - [Impact](#impact)
  - [Steps to Reproduce](#steps-to-reproduce)
  - [Expected Behavior](#expected-behavior)
  - [Actual Behavior](#actual-behavior)
  - [Root Cause](#root-cause)
  - [Evidence](#evidence)
  - [Proposed Solutions](#proposed-solutions)
    - [Option 1: Periodic Polling (Recommended)](#option-1-periodic-polling-recommended)
    - [Option 2: Manual Refresh Button](#option-2-manual-refresh-button)
    - [Option 3: WebSocket Real-Time Updates](#option-3-websocket-real-time-updates)
    - [Option 4: Cache-Busting](#option-4-cache-busting)
    - [Option 5: Combination Approach (Best)](#option-5-combination-approach-best)
  - [Decision](#decision)
  - [Implementation (2025-10-21)](#implementation-2025-10-21)
  - [Testing Plan](#testing-plan)
    - [Automated E2E Tests](#automated-e2e-tests)
    - [Manual Test Cases](#manual-test-cases)
      - [Test Case 1: Stale Data Detection](#test-case-1-stale-data-detection)
      - [Test Case 2: Multiple Clients](#test-case-2-multiple-clients)
      - [Test Case 3: Re-extraction Flow](#test-case-3-re-extraction-flow)
  - [Status History](#status-history)
  - [Notes](#notes)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
id: BUG-0001
title: Stale React State in Filtered Tab - No Auto-Refresh Mechanism
status: fixed
priority: medium
severity: medium
component: frontend
created: 2025-10-21
updated: 2025-10-21
fixed: 2025-10-21
affects: [UI, Data Refresh, All Tabs]
related: []
commits: []
---

# BUG-0001: Stale React State in Filtered Tab - No Auto-Refresh Mechanism

## Summary

Frontend displays stale data when backend updates occur outside of user actions (e.g., API calls, bulk operations, re-extraction). No mechanism exists to auto-refresh React state when external processes modify data.

## Impact

**User Experience**:
- Users don't see updated job data until manual page refresh
- Jobs that should appear in tabs (like Filtered) are invisible until refresh
- Creates confusion about whether operations succeeded

**Scope**:
- Affects all tabs (New, Filtered, Approved, Applied, All)
- Affects all external data modifications (re-extraction API, bulk operations, database changes)

## Steps to Reproduce

1. Open UI in browser (http://localhost:3000)
2. View Filtered tab (React state cached)
3. Call re-extraction API externally: `curl -X POST http://localhost:8080/api/intake/reextract-job/{id}`
4. Database updates successfully
5. Return to UI - data still shows old state
6. Refresh page - now shows updated data

## Expected Behavior

Users should see updated data automatically without manual page refresh.

## Actual Behavior

React state remains unchanged until:
- User manually refreshes page (Cmd+R / Ctrl+R)
- Application restarts (forces browser reload)
- User navigates away and back

## Root Cause

**Frontend has no mechanism to detect backend changes:**

```typescript
// frontend/src/App.tsx:861
const [jobs, setJobs] = useState<Job[]>([]);

// Initial fetch only (lines 1183-1187)
useEffect(() => {
  fetchJobs();  // Runs once on mount
  fetchStats();
  fetchApplications();
}, []); // Empty dependency array = no re-runs
```

**Missing mechanisms**:
- ❌ No periodic polling (setInterval)
- ❌ No WebSocket connection
- ❌ No Server-Sent Events
- ❌ No manual refresh button
- ❌ No cache-busting in fetch requests

## Evidence

**Timeline of Discovery**:
1. Oct 20: Job created with status="filtered"
2. Oct 21: Re-extraction API called → database updated
3. User views UI → still shows old React state
4. Multiple app restarts → browser reloaded
5. Fresh `fetchJobs()` executed → UI shows current data

**Database confirms**:
```sql
SELECT job_id, status, updated_at FROM jobs WHERE job_id = '94558e12...';
-- status: 'filtered' (always was)
-- updated_at: 2025-10-21 13:04:17 (API call timestamp)
```

**API confirms**:
```bash
curl http://localhost:8080/api/jobs/status/filtered | jq 'length'
# Returns: 30 (job is there)
```

**Frontend issue**:
- React state not updated after external changes
- Only page reload triggers refetch

## Proposed Solutions

### Option 1: Periodic Polling (Recommended)

Auto-refresh data every 30-60 seconds:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchJobs();
    fetchStats();
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, []);
```

**Pros**: Automatic, simple to implement
**Cons**: Unnecessary API calls, slight server load
**Effort**: 30 minutes

### Option 2: Manual Refresh Button

Add refresh button to UI:

```typescript
<button onClick={() => { fetchJobs(); fetchStats(); }}>
  <RefreshIcon /> Refresh
</button>
```

**Pros**: User-controlled, no server load
**Cons**: Requires manual action
**Effort**: 15 minutes

### Option 3: WebSocket Real-Time Updates

Implement WebSocket for instant updates:

**Pros**: Instant updates, efficient
**Cons**: Complex, requires backend changes
**Effort**: 4-6 hours

### Option 4: Cache-Busting

Force fresh data on every fetch:

```typescript
const fetchJobs = async () => {
  const response = await fetch(`${API_URL}/jobs`, {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  // ...
};
```

**Pros**: Ensures fresh data when fetched
**Cons**: Doesn't solve "when to fetch" problem
**Effort**: 15 minutes

### Option 5: Combination Approach (Best)

Implement multiple solutions:
1. ✅ Periodic polling (30s intervals) for auto-updates
2. ✅ Manual refresh button for immediate control
3. ✅ Cache-busting to ensure freshness
4. ✅ Timestamp display showing "Last updated: X seconds ago"

**Total Effort**: 2 hours

## Decision

**✅ Implemented Option 2: Manual Refresh Button**

User requested Option 2 implementation with a **global** refresh button (not job-card specific).

**Rationale:**
- User-controlled: No unnecessary server load
- Simple to implement: Quick fix for immediate need
- Global scope: Single button refreshes all data (jobs, stats, applications)
- Foundation for future enhancements: Can add Options 1, 4, or 5 later if needed

**Other options retained in documentation for possible future implementation.**

## Implementation (2025-10-21)

**Files Modified:**
- `frontend/src/App.tsx` - Added global refresh functionality
- `frontend/src/index.css` - Added spin animation for loading indicator

**Code Changes:**

1. **Added State** (`frontend/src/App.tsx:873`):
```typescript
const [refreshing, setRefreshing] = useState<boolean>(false);
```

2. **Added Refresh Handler** (`frontend/src/App.tsx:993-1002`):
```typescript
const handleRefresh = async (): Promise<void> => {
  setRefreshing(true);
  try {
    await Promise.all([fetchJobs(), fetchStats(), fetchApplications()]);
  } catch (error) {
    console.error('Error refreshing data:', error);
  } finally {
    setRefreshing(false);
  }
};
```

3. **Added Global Refresh Button** (`frontend/src/App.tsx:1953-1993`):
- Blue primary button in header (left of "Refresh Descriptions" button)
- Shows "Refresh Data" when idle, "Refreshing..." when active
- Spinning icon animation while refreshing
- Disabled state while operation in progress
- Tooltip: "Refresh jobs, stats, and applications data"

4. **Added CSS Animation** (`frontend/src/index.css:21-28`):
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**User Experience:**
- Single click refreshes all data (jobs, stats, applications)
- Visual feedback with spinning icon and button text change
- Button disabled during refresh to prevent duplicate requests
- Accessible from any tab or view

## Testing Plan

### Automated E2E Tests

**File**: `frontend/e2e/tests/24-refresh-data-button.spec.ts`

**7 Test Cases**:
1. Button visibility and positioning in header
2. Correct styling (blue primary color)
3. Positioned left of "Refresh Descriptions" button
4. Triggers API calls when clicked (jobs, stats, applications)
5. Clickable and enabled state
6. Has descriptive tooltip
7. Works on mobile viewport

**Test Results**: ✅ All 7 tests passing

### Manual Test Cases

#### Test Case 1: Stale Data Detection
1. Open UI in browser
2. Use API to modify a job externally
3. Click manual refresh button - should update immediately

#### Test Case 2: Multiple Clients
1. Open UI in two browser tabs
2. Update job status in Tab 1
3. Click refresh in Tab 2 - should see changes

#### Test Case 3: Re-extraction Flow
1. Open UI, view a job
2. Call re-extraction API endpoint
3. Click refresh button - verify UI shows new extraction_method and data

## Status History

- 2025-10-21: Bug discovered during ISSUE-001 investigation
- 2025-10-21: Root cause identified - no auto-refresh mechanism
- 2025-10-21: Documented with proposed solutions (Options 1-5)
- 2025-10-21: User requested Option 2 (Manual Refresh Button) implementation
- 2025-10-21: Implemented global refresh button in header
- 2025-10-21: Marked as **RESOLVED**

## Notes

- The Filtered tab code itself is correct: `filterJobs('filtered')` works as expected
- Issue affects ALL tabs, not just Filtered
- Browser caching may worsen the issue (no Cache-Control headers)
- Common pattern in SPAs - needs explicit data freshness strategy
- Optimistic UI updates already exist for user-initiated actions (line 1012)
  - But only work for actions user performs, not external changes

## Related Files

**Implementation**:
- `frontend/src/App.tsx:861` - State declaration
- `frontend/src/App.tsx:873` - Refreshing state
- `frontend/src/App.tsx:889-910` - fetchJobs function
- `frontend/src/App.tsx:993-1002` - handleRefresh function
- `frontend/src/App.tsx:1163-1165` - filterJobs function
- `frontend/src/App.tsx:1183-1187` - useEffect initial fetch
- `frontend/src/App.tsx:1953-1993` - Refresh Data button UI
- `frontend/src/App.tsx:2114-2121` - Filtered tab rendering
- `frontend/src/App.tsx:1012` - Existing optimistic updates
- `frontend/src/index.css:21-28` - Spin animation keyframes

**Testing**:
- `frontend/e2e/tests/24-refresh-data-button.spec.ts` - E2E test suite (7 tests)
