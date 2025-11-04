<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Phase 4.2: Automatic Pagination for RapidAPI JSearch](#phase-42-automatic-pagination-for-rapidapi-jsearch)
  - [Overview](#overview)
  - [Current State (Phase 4.1.6)](#current-state-phase-416)
  - [The Problem](#the-problem)
  - [Proposed Solution](#proposed-solution)
  - [Technical Specification](#technical-specification)
    - [Option A: Add Column to job_sources (RECOMMENDED)](#option-a-add-column-to-job_sources-recommended)
    - [Option B: Use Existing JSONB Configuration Field](#option-b-use-existing-jsonb-configuration-field)
  - [Implementation Details](#implementation-details)
    - [Backend Changes (backend/src/main.rs)](#backend-changes-backendsrcmainrs)
    - [Frontend Changes (frontend/src/IntakeTab.tsx)](#frontend-changes-frontendsrcintaketabtsx)
    - [Database Migration](#database-migration)
  - [Reset Mechanism](#reset-mechanism)
    - [Automatic Reset Conditions](#automatic-reset-conditions)
    - [Manual Reset](#manual-reset)
  - [Edge Cases & Error Handling](#edge-cases--error-handling)
    - [Edge Case 1: API Failure During Sync](#edge-case-1-api-failure-during-sync)
    - [Edge Case 2: Partial Success (Some Jobs Failed)](#edge-case-2-partial-success-some-jobs-failed)
    - [Edge Case 3: Reaching End of Results](#edge-case-3-reaching-end-of-results)
    - [Edge Case 4: Database Rollback](#edge-case-4-database-rollback)
    - [Edge Case 5: Quota Exhaustion](#edge-case-5-quota-exhaustion)
  - [Testing Strategy](#testing-strategy)
    - [Backend Unit Tests](#backend-unit-tests)
    - [E2E Tests](#e2e-tests)
    - [Manual Testing](#manual-testing)
  - [Implementation Plan](#implementation-plan)
    - [Phase 4.2.1: Backend Implementation (2-3 hours)](#phase-421-backend-implementation-2-3-hours)
    - [Phase 4.2.2: Frontend UI (1-2 hours)](#phase-422-frontend-ui-1-2-hours)
    - [Phase 4.2.3: Testing (1 hour)](#phase-423-testing-1-hour)
  - [Success Metrics](#success-metrics)
  - [Benefits](#benefits)
    - [User Benefits](#user-benefits)
    - [Technical Benefits](#technical-benefits)
    - [Business Benefits](#business-benefits)
  - [Risks & Mitigations](#risks--mitigations)
    - [Risk 1: Runaway Pagination](#risk-1-runaway-pagination)
    - [Risk 2: Page Increment on Partial Failure](#risk-2-page-increment-on-partial-failure)
    - [Risk 3: Database Migration Issues](#risk-3-database-migration-issues)
    - [Risk 4: End-of-Results Detection](#risk-4-end-of-results-detection)
  - [Future Enhancements (Phase 4.3+)](#future-enhancements-phase-43)
    - [Phase 4.3: Smart Pagination](#phase-43-smart-pagination)
    - [Phase 4.4: Search Query Management](#phase-44-search-query-management)
    - [Phase 4.5: Advanced Rate Limiting](#phase-45-advanced-rate-limiting)
  - [Related Documentation](#related-documentation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Phase 4.2: Automatic Pagination for RapidAPI JSearch

**Status**: 📋 Planning Complete, Ready to Implement
**Priority**: ⭐ **HIGHEST** - Implement BEFORE Phase 5.1
**Prerequisites**: ✅ Phase 4.1 Complete
**Effort**: 4-6 hours
**Created**: 2025-11-03
**Last Updated**: 2025-11-03

---

## Overview

Phase 4.2 adds **automatic page tracking and increment** to the RapidAPI JSearch integration, eliminating the need for manual database updates to fetch different pages of job results.

**Current Pain Point**: Every time you want to fetch the next page of jobs (e.g., jobs 11-20 instead of 1-10), you must manually update the database:
```sql
UPDATE job_sources
SET configuration = jsonb_set(configuration, '{page}', '"2"')
WHERE source_name = 'rapidapi';
```

**After Phase 4.2**: Just click "Sync RapidAPI" repeatedly, and it automatically fetches the next page each time.

---

## Current State (Phase 4.1.6)

**What Works**:
- ✅ RapidAPI fetches 10 jobs per sync (configurable via `num_pages`)
- ✅ Pagination support exists: can specify `page` parameter in configuration
- ✅ Defaults to page 1 if not specified
- ✅ Deduplication prevents duplicate jobs if same page synced twice

**Manual Pagination Process** (2025-10-23):
```sql
-- Fetch page 1 (jobs 1-10) - default
POST /api/intake/rapidapi/sync

-- To fetch page 2 (jobs 11-20), manually update database:
UPDATE job_sources
SET configuration = jsonb_set(configuration, '{page}', '"2"')
WHERE source_name = 'rapidapi';

-- Then sync again
POST /api/intake/rapidapi/sync

-- To fetch page 3 (jobs 21-30), manually update again:
UPDATE job_sources
SET configuration = jsonb_set(configuration, '{page}', '"3"')
WHERE source_name = 'rapidapi';
```

**Location**: `backend/src/main.rs:4213-4500` (`fetch_jsearch_jobs_rapidapi`, `sync_jsearch_jobs`)

---

## The Problem

**Pain Points**:
1. **Manual SQL Required**: Must execute database UPDATE statement between each sync
2. **No State Tracking**: Must remember which page was last fetched
3. **Easy to Waste Quota**: Accidentally re-sync same page (wastes API calls from 200/month quota)
4. **No Progress Visibility**: Can't see how many pages have been synced
5. **Poor UX**: Multiple manual steps for a simple "get more jobs" operation

**User Impact**: Medium-High
- Directly affects job intake workflow efficiency
- Makes RapidAPI less useful than it should be
- Creates friction in a feature that should be seamless

---

## Proposed Solution

**Automatic Page Increment**: After each successful RapidAPI sync, automatically increment the page number for the next sync.

**Key Behaviors**:
1. **First sync**: Fetch page 1 (jobs 1-10)
2. **Second sync**: Automatically fetch page 2 (jobs 11-20)
3. **Third sync**: Automatically fetch page 3 (jobs 21-30)
4. **Nth sync**: Automatically fetch page N

**User Experience**:
```
User clicks "Sync RapidAPI" → Fetches page 1
User clicks "Sync RapidAPI" → Fetches page 2
User clicks "Sync RapidAPI" → Fetches page 3
...

UI shows: "Last page synced: 3 (30 jobs total)"
```

---

## Technical Specification

### Option A: Add Column to job_sources (RECOMMENDED)

**Pros**:
- ✅ Explicit, type-safe INTEGER column
- ✅ Easy to query and index
- ✅ Clear schema documentation
- ✅ Simple SQL queries

**Cons**:
- Requires database migration
- Adds column to existing table

**Database Migration**:
```sql
-- Migration: Add last_page_fetched column
ALTER TABLE job_sources
ADD COLUMN last_page_fetched INTEGER DEFAULT 1;

-- Create index for queries (optional but recommended)
CREATE INDEX idx_job_sources_last_page ON job_sources(last_page_fetched);

-- Initialize existing RapidAPI source
UPDATE job_sources
SET last_page_fetched = 1
WHERE source_name = 'rapidapi';
```

**Backend Query**:
```rust
// Read current page
let source = sqlx::query_as::<_, JobSource>(
    "SELECT * FROM job_sources WHERE source_name = 'rapidapi' AND is_active = true LIMIT 1"
)
.fetch_one(pool)
.await?;

let current_page = source.last_page_fetched.unwrap_or(1);

// After successful sync, increment page
sqlx::query!(
    "UPDATE job_sources SET last_page_fetched = $1 WHERE source_id = $2",
    current_page + 1,
    source.source_id
)
.execute(pool)
.await?;
```

### Option B: Use Existing JSONB Configuration Field

**Pros**:
- ✅ No schema change required
- ✅ No migration needed

**Cons**:
- JSONB parsing overhead
- Less type-safe (could store non-integer values)
- Harder to query/index

**Implementation**:
```rust
// Read current page from JSONB
let current_page = source.configuration
    .get("last_page_fetched")
    .and_then(|v| v.as_i64())
    .unwrap_or(1) as i32;

// After successful sync, update JSONB
let mut new_config = source.configuration.clone();
new_config["last_page_fetched"] = json!(current_page + 1);

sqlx::query!(
    "UPDATE job_sources SET configuration = $1 WHERE source_id = $2",
    new_config,
    source.source_id
)
.execute(pool)
.await?;
```

**Recommendation**: Use Option A (add column) - cleaner, more maintainable, better performance

---

## Implementation Details

### Backend Changes (backend/src/main.rs)

**File**: `backend/src/main.rs`
**Functions to modify**: `sync_jsearch_jobs()` (line ~4422)

**Current code** (simplified):
```rust
async fn sync_jsearch_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Get source
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'rapidapi' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await?;

    // Process jobs (uses configuration.page)
    let metrics = process_jsearch_jobs(&source, pool.get_ref(), log_id).await?;

    // Update log as completed
    // ...
}
```

**New code** (with automatic pagination):
```rust
async fn sync_jsearch_jobs(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    // Get source
    let source = sqlx::query_as::<_, JobSource>(
        "SELECT * FROM job_sources WHERE source_name = 'rapidapi' AND is_active = true LIMIT 1"
    )
    .fetch_one(pool.get_ref())
    .await?;

    // Get current page (from last_page_fetched column)
    let current_page = source.last_page_fetched.unwrap_or(1);

    // Override configuration page with current page
    let mut config = source.configuration.clone();
    config["page"] = json!(current_page.to_string());

    // Create modified source with updated configuration
    let modified_source = JobSource {
        configuration: config,
        ..source.clone()
    };

    // Process jobs using current page
    let metrics = process_jsearch_jobs(&modified_source, pool.get_ref(), log_id).await?;

    // After successful sync, increment page for next time
    sqlx::query!(
        "UPDATE job_sources SET last_page_fetched = $1 WHERE source_id = $2",
        current_page + 1,
        source.source_id
    )
    .execute(pool.get_ref())
    .await?;

    // Update log as completed
    // ...

    // Return response with current page info
    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "page_synced": current_page,
        "next_page": current_page + 1,
        "metrics": {
            "discovered": metrics.discovered,
            "created": metrics.created,
            "duplicated": metrics.duplicated,
            "filtered": metrics.filtered_out,
            "failed": metrics.failed_processing,
        }
    })))
}
```

**JobSource struct update** (if not already present):
```rust
#[derive(Debug, sqlx::FromRow, Clone)]
struct JobSource {
    source_id: Uuid,
    source_name: String,
    source_type: String,
    configuration: serde_json::Value,
    is_active: bool,
    last_page_fetched: Option<i32>,  // ← Add this field
    // ... other fields
}
```

### Frontend Changes (frontend/src/IntakeTab.tsx)

**Current RapidAPI card** (simplified):
```tsx
<div className="source-card rapidapi">
  <h3>RapidAPI JSearch</h3>
  <p>Last sync: {rapidAPILastSync || 'Never'}</p>
  <p>Total discovered: {rapidAPIStats?.total || 0}</p>
  <button onClick={syncRapidAPI} disabled={rapidAPISyncing}>
    {rapidAPISyncing ? 'Syncing...' : 'Sync RapidAPI'}
  </button>
</div>
```

**Enhanced RapidAPI card** (with pagination info):
```tsx
<div className="source-card rapidapi">
  <h3>RapidAPI JSearch</h3>
  <p>Last sync: {rapidAPILastSync || 'Never'}</p>
  <p>Total discovered: {rapidAPIStats?.total || 0}</p>

  {/* NEW: Pagination info */}
  <p className="pagination-info">
    Last page synced: {rapidAPICurrentPage || 1}
    {rapidAPICurrentPage && ` (${rapidAPICurrentPage * 10} jobs total)`}
  </p>

  <div className="button-group">
    <button onClick={syncRapidAPI} disabled={rapidAPISyncing}>
      {rapidAPISyncing ? 'Syncing...' : `Sync Page ${(rapidAPICurrentPage || 0) + 1}`}
    </button>

    {/* NEW: Reset button (only show if page > 1) */}
    {rapidAPICurrentPage > 1 && (
      <button
        onClick={resetRapidAPIPagination}
        disabled={rapidAPISyncing}
        className="secondary"
      >
        Reset to Page 1
      </button>
    )}
  </div>
</div>
```

**New state variables**:
```tsx
const [rapidAPICurrentPage, setRapidAPICurrentPage] = useState<number | null>(null);
```

**Updated sync handler**:
```tsx
const handleRapidAPISync = async () => {
  setRapidAPISyncing(true);
  try {
    const response = await fetch('/api/intake/rapidapi/sync', {
      method: 'POST',
    });
    const data = await response.json();

    if (data.success) {
      // Update current page from response
      setRapidAPICurrentPage(data.next_page - 1); // next_page - 1 = page just synced

      showNotification(
        `RapidAPI sync successful: Page ${data.page_synced} (${data.metrics.created} new jobs)`,
        'success'
      );

      // Refresh stats
      fetchIntakeSources();
    }
  } catch (error) {
    showNotification('RapidAPI sync failed', 'error');
  } finally {
    setRapidAPISyncing(false);
  }
};

const resetRapidAPIPagination = async () => {
  try {
    const response = await fetch('/api/intake/rapidapi/reset-pagination', {
      method: 'POST',
    });
    if (response.ok) {
      setRapidAPICurrentPage(1);
      showNotification('Pagination reset to page 1', 'success');
    }
  } catch (error) {
    showNotification('Failed to reset pagination', 'error');
  }
};
```

**Load current page on component mount**:
```tsx
useEffect(() => {
  const loadRapidAPIState = async () => {
    try {
      const response = await fetch('/api/intake/rapidapi/state');
      const data = await response.json();
      setRapidAPICurrentPage(data.current_page);
    } catch (error) {
      console.error('Failed to load RapidAPI state:', error);
    }
  };

  loadRapidAPIState();
}, []);
```

### Database Migration

**Migration file**: `database/migrations/007_add_last_page_fetched.sql`

```sql
-- Add last_page_fetched column to job_sources table
ALTER TABLE job_sources
ADD COLUMN last_page_fetched INTEGER DEFAULT 1;

-- Add comment
COMMENT ON COLUMN job_sources.last_page_fetched IS
  'Tracks the last page fetched for pagination (RapidAPI JSearch). Automatically increments after each sync.';

-- Initialize existing RapidAPI source
UPDATE job_sources
SET last_page_fetched = 1
WHERE source_name = 'rapidapi';

-- Optional: Create index for queries
CREATE INDEX idx_job_sources_last_page ON job_sources(last_page_fetched);
```

**Apply migration**:
```bash
psql -U jobhunter_user -d jobhunter_personal -f database/migrations/007_add_last_page_fetched.sql
```

---

## Reset Mechanism

### Automatic Reset Conditions

**When to automatically reset to page 1**:

1. **Empty Results**: If JSearch returns 0 jobs, we've reached the end
   ```rust
   if listings.is_empty() {
       // Reset to page 1 for next sync
       sqlx::query!(
           "UPDATE job_sources SET last_page_fetched = 1 WHERE source_id = $1",
           source.source_id
       )
       .execute(pool)
       .await?;

       return Ok(HttpResponse::Ok().json(json!({
           "success": true,
           "message": "No more jobs available. Reset to page 1.",
           "page_synced": current_page,
           "next_page": 1,
       })));
   }
   ```

2. **Fewer than 10 jobs**: If JSearch returns fewer than 10 jobs, we're near the end
   ```rust
   if listings.len() < 10 {
       log_debug(&format!(
           "⚠️  Only {} jobs returned (expected 10). Nearing end of results.",
           listings.len()
       ));
       // Optionally reset or leave as-is
   }
   ```

3. **Search Query Change**: If user changes search parameters, reset to page 1
   - Detect configuration changes
   - Compare current config hash vs previous
   - Reset if query, location, or filters changed

### Manual Reset

**Backend endpoint**: `POST /api/intake/rapidapi/reset-pagination`

```rust
async fn reset_rapidapi_pagination(pool: web::Data<PgPool>) -> Result<HttpResponse> {
    sqlx::query!(
        "UPDATE job_sources SET last_page_fetched = 1 WHERE source_name = 'rapidapi'"
    )
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "message": "Pagination reset to page 1"
    })))
}
```

**Frontend "Reset to Page 1" button**: See Frontend Changes section above

---

## Edge Cases & Error Handling

### Edge Case 1: API Failure During Sync
**Scenario**: Sync fails after incrementing page number
**Solution**: Only increment page AFTER successful sync
```rust
// Process jobs first
let metrics = process_jsearch_jobs(&modified_source, pool.get_ref(), log_id).await?;

// Only increment if sync succeeded (no ? before this point means success)
sqlx::query!(
    "UPDATE job_sources SET last_page_fetched = $1 WHERE source_id = $2",
    current_page + 1,
    source.source_id
)
.execute(pool.get_ref())
.await?;
```

### Edge Case 2: Partial Success (Some Jobs Failed)
**Scenario**: 10 jobs fetched, but 3 failed processing
**Solution**: Still increment page (the jobs were attempted)
- Metrics track failed jobs
- Deduplication prevents re-processing on retry
- User can see failed count in logs

### Edge Case 3: Reaching End of Results
**Scenario**: Page 50 returns 0 jobs (no more results)
**Solution**: Auto-reset to page 1, notify user
```rust
if listings.is_empty() {
    // Reset to page 1
    sqlx::query!("UPDATE job_sources SET last_page_fetched = 1 WHERE source_id = $1", source.source_id)
        .execute(pool)
        .await?;

    return Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "message": "End of results reached. Reset to page 1.",
        "end_of_results": true,
        "page_synced": current_page,
    })));
}
```

### Edge Case 4: Database Rollback
**Scenario**: Sync succeeds but page increment fails
**Solution**: Use database transaction
```rust
let mut tx = pool.begin().await?;

// Process jobs
let metrics = process_jsearch_jobs_tx(&modified_source, &mut tx, log_id).await?;

// Increment page
sqlx::query!("UPDATE job_sources SET last_page_fetched = $1 WHERE source_id = $2", current_page + 1, source.source_id)
    .execute(&mut tx)
    .await?;

// Commit transaction (both or neither)
tx.commit().await?;
```

### Edge Case 5: Quota Exhaustion
**Scenario**: Approaching 200 requests/month limit
**Solution**: Block sync, show warning
```rust
let calls_this_month = check_rapidapi_quota(pool.get_ref()).await?;

if calls_this_month >= 200 {
    return Err(actix_web::error::ErrorTooManyRequests(
        "RapidAPI quota exhausted (200/200 this month). Resets next month."
    ));
}

if calls_this_month >= 170 {
    log_debug(&format!("⚠️  WARNING: RapidAPI usage at {}/200 (85%)", calls_this_month));
}
```

---

## Testing Strategy

### Backend Unit Tests

**File**: `backend/tests/job_intake_tests.rs`

**New tests to add**:

1. **Test automatic page increment**:
   ```rust
   #[actix_rt::test]
   async fn test_automatic_page_increment() {
       let pool = setup_test_db().await;

       // Create RapidAPI source with page 1
       let source_id = create_rapidapi_source(&pool, 1).await;

       // Sync (should fetch page 1)
       sync_jsearch_jobs(&pool).await.unwrap();

       // Verify page incremented to 2
       let source = get_source(&pool, source_id).await;
       assert_eq!(source.last_page_fetched, Some(2));

       // Sync again (should fetch page 2)
       sync_jsearch_jobs(&pool).await.unwrap();

       // Verify page incremented to 3
       let source = get_source(&pool, source_id).await;
       assert_eq!(source.last_page_fetched, Some(3));
   }
   ```

2. **Test reset mechanism**:
   ```rust
   #[actix_rt::test]
   async fn test_pagination_reset() {
       let pool = setup_test_db().await;

       // Create source at page 5
       let source_id = create_rapidapi_source(&pool, 5).await;

       // Reset pagination
       reset_rapidapi_pagination(&pool).await.unwrap();

       // Verify page reset to 1
       let source = get_source(&pool, source_id).await;
       assert_eq!(source.last_page_fetched, Some(1));
   }
   ```

3. **Test end-of-results auto-reset**:
   ```rust
   #[actix_rt::test]
   async fn test_auto_reset_on_empty_results() {
       let pool = setup_test_db().await;

       // Create source at page 50
       let source_id = create_rapidapi_source(&pool, 50).await;

       // Mock API to return 0 jobs
       let response = sync_jsearch_jobs_with_mock(&pool, vec![]).await.unwrap();

       // Verify auto-reset to page 1
       assert_eq!(response.end_of_results, true);

       let source = get_source(&pool, source_id).await;
       assert_eq!(source.last_page_fetched, Some(1));
   }
   ```

4. **Test failure doesn't increment page**:
   ```rust
   #[actix_rt::test]
   async fn test_failure_doesnt_increment_page() {
       let pool = setup_test_db().await;

       // Create source at page 3
       let source_id = create_rapidapi_source(&pool, 3).await;

       // Mock API failure
       let result = sync_jsearch_jobs_with_error(&pool).await;
       assert!(result.is_err());

       // Verify page stayed at 3 (not incremented)
       let source = get_source(&pool, source_id).await;
       assert_eq!(source.last_page_fetched, Some(3));
   }
   ```

### E2E Tests

**File**: `frontend/e2e/tests/28-rapidapi-sync-integration.spec.ts`

**New tests to add**:

1. **Test pagination info display**:
   ```typescript
   test('displays current page after sync', async ({ page }) => {
     // Sync once
     await page.click('button:has-text("Sync RapidAPI")');
     await page.waitForSelector('text=Sync successful');

     // Verify page 1 displayed
     await expect(page.locator('text=Last page synced: 1')).toBeVisible();

     // Sync again
     await page.click('button:has-text("Sync Page 2")');
     await page.waitForSelector('text=Sync successful');

     // Verify page 2 displayed
     await expect(page.locator('text=Last page synced: 2')).toBeVisible();
   });
   ```

2. **Test reset button appears and works**:
   ```typescript
   test('reset button resets to page 1', async ({ page }) => {
     // Sync to page 2
     await page.click('button:has-text("Sync RapidAPI")');
     await page.click('button:has-text("Sync Page 2")');

     // Reset button should be visible
     await expect(page.locator('button:has-text("Reset to Page 1")')).toBeVisible();

     // Click reset
     await page.click('button:has-text("Reset to Page 1")');
     await page.waitForSelector('text=reset to page 1', { state: 'visible' });

     // Verify back to page 1
     await expect(page.locator('text=Last page synced: 1')).toBeVisible();
   });
   ```

3. **Test sync button shows next page number**:
   ```typescript
   test('sync button shows next page number', async ({ page }) => {
     // Initially shows "Sync Page 1"
     await expect(page.locator('button:has-text("Sync Page 1")')).toBeVisible();

     // After first sync, shows "Sync Page 2"
     await page.click('button:has-text("Sync Page 1")');
     await page.waitForSelector('text=Sync successful');
     await expect(page.locator('button:has-text("Sync Page 2")')).toBeVisible();
   });
   ```

### Manual Testing

**Checklist**:
1. ✅ First sync fetches page 1 (jobs 1-10)
2. ✅ Second sync fetches page 2 (jobs 11-20)
3. ✅ Third sync fetches page 3 (jobs 21-30)
4. ✅ UI displays "Last page synced: N"
5. ✅ UI shows "Sync Page N+1" on button
6. ✅ Reset button appears when page > 1
7. ✅ Reset button returns to page 1
8. ✅ Sync after reset fetches page 1 again
9. ✅ Deduplication still works (no duplicate jobs)
10. ✅ Quota tracking still accurate (1 API call per sync)

---

## Implementation Plan

### Phase 4.2.1: Backend Implementation (2-3 hours)

**Tasks**:
- [ ] Create database migration: `007_add_last_page_fetched.sql`
- [ ] Apply migration to `jobhunter_personal` database
- [ ] Update `JobSource` struct to include `last_page_fetched` field
- [ ] Modify `sync_jsearch_jobs()` to read current page
- [ ] Override configuration with current page before calling API
- [ ] Increment page after successful sync
- [ ] Add auto-reset logic for empty results
- [ ] Create `reset_rapidapi_pagination()` endpoint
- [ ] Add `GET /api/intake/rapidapi/state` endpoint (returns current page)
- [ ] Build and test backend changes

**Deliverables**:
- Database migration applied
- Backend endpoints working
- Automatic page increment functional

### Phase 4.2.2: Frontend UI (1-2 hours)

**Tasks**:
- [ ] Add `rapidAPICurrentPage` state variable
- [ ] Load current page on component mount
- [ ] Update RapidAPI card to show "Last page synced: N"
- [ ] Update sync button text to show "Sync Page N+1"
- [ ] Add "Reset to Page 1" button (conditional on page > 1)
- [ ] Implement `resetRapidAPIPagination()` handler
- [ ] Update `handleRapidAPISync()` to parse response and update page
- [ ] Add CSS styling for pagination info
- [ ] Test UI interactions

**Deliverables**:
- UI displays current page
- Sync button shows next page
- Reset button works

### Phase 4.2.3: Testing (1 hour)

**Tasks**:
- [ ] Write 4 backend unit tests (see Testing Strategy)
- [ ] Write 3 E2E tests (see Testing Strategy)
- [ ] Run full test suite (backend + frontend + E2E)
- [ ] Manual testing checklist (10 items)
- [ ] Verify quota tracking still accurate
- [ ] Verify deduplication still works

**Deliverables**:
- 7 new tests passing
- Manual testing complete
- All existing tests still passing

---

## Success Metrics

**Functional**:
- ✅ Automatic page increment works (no manual SQL required)
- ✅ UI displays current page and next page
- ✅ Reset mechanism works (button + auto-reset on empty results)
- ✅ Deduplication still prevents duplicate jobs
- ✅ Quota tracking remains accurate

**User Experience**:
- ✅ User can sync multiple pages with just button clicks
- ✅ Progress is visible ("Last page synced: 5")
- ✅ Can reset to page 1 without manual SQL
- ✅ No API quota wasted on accidental re-syncs

**Testing**:
- ✅ 7 new tests passing (4 backend unit + 3 E2E)
- ✅ All 11 existing JSearch tests still passing
- ✅ Manual testing checklist 100% complete

---

## Benefits

### User Benefits
1. **No Manual SQL**: Just click "Sync RapidAPI" repeatedly
2. **Progress Visibility**: See which page you're on and how many jobs synced
3. **No Wasted API Calls**: Won't accidentally re-sync same page
4. **Easy Reset**: Button to start over without SQL
5. **Better UX**: Seamless multi-page syncing

### Technical Benefits
1. **State Management**: Database tracks pagination state
2. **Automatic Increment**: No manual intervention needed
3. **Error Handling**: Robust edge case handling
4. **Transaction Safety**: Page only increments on success
5. **Quota Protection**: Prevents runaway syncing

### Business Benefits
1. **Maximize Free Tier**: Get full value from 200 requests/month
2. **Scale Ready**: Easy to add more sophisticated pagination logic later
3. **Job Inventory**: Build larger job database efficiently
4. **User Satisfaction**: Removes friction from job intake workflow

---

## Risks & Mitigations

### Risk 1: Runaway Pagination
**Risk**: User accidentally syncs 100+ pages, exhausting quota
**Probability**: Medium
**Impact**: High (quota exhausted)
**Mitigation**:
- Add `max_page` configuration (e.g., max 20 pages = 200 jobs)
- Show warning at 85% quota (170 requests)
- Block sync at 100% quota (200 requests)
- Display quota usage prominently in UI

### Risk 2: Page Increment on Partial Failure
**Risk**: Some jobs fail processing but page still increments
**Probability**: Low
**Impact**: Low (deduplication prevents data loss)
**Mitigation**:
- Deduplication system catches any missed jobs
- Failed job count visible in metrics
- User can retry or move forward

### Risk 3: Database Migration Issues
**Risk**: Migration fails on production database
**Probability**: Low
**Impact**: Medium (feature doesn't work)
**Mitigation**:
- Test migration on `jobhunter_personal` first
- Migration is simple (ADD COLUMN) - low risk
- Can rollback easily (DROP COLUMN)
- Default value (1) ensures backward compatibility

### Risk 4: End-of-Results Detection
**Risk**: JSearch API inconsistently returns empty results
**Probability**: Low
**Impact**: Low (auto-reset may trigger early)
**Mitigation**:
- Only auto-reset on completely empty results (0 jobs)
- Log when auto-reset happens
- User can manually reset if needed

---

## Future Enhancements (Phase 4.3+)

### Phase 4.3: Smart Pagination
**Features**:
- Auto-detect end of results (stop at last page)
- "Fetch All" button (sync until end of results)
- Background pagination (fetch multiple pages automatically)
- Pagination progress bar (e.g., "Syncing pages 1-10...")

### Phase 4.4: Search Query Management
**Features**:
- Multiple saved searches with independent pagination
- Search history tracking
- Auto-reset pagination when search changes
- Search templates (e.g., "Remote QA Jobs", "SF Bay Area Testing")

### Phase 4.5: Advanced Rate Limiting
**Features**:
- Adaptive sync frequency based on quota
- Schedule syncs to maximize quota usage
- Predictive quota exhaustion warnings
- Quota reset calendar integration

---

## Related Documentation

**Phase Plans**:
- [PHASE_4.1: RapidAPI JSearch Integration](PHASE_4.1_job-board-rapidAPI.md) - Prerequisites
- [PHASE_5: Advanced Features](PHASE_5_advanced-features.md) - Next work after 4.2

**Project Documentation**:
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Current project state
- [PHASE_EXECUTION_ORDER.md](PHASE_EXECUTION_ORDER.md) - Dependency chain

**Bug Tracking**:
- No related bugs (this is new functionality)

---

**Last Updated**: 2025-11-03 by Claude Code
**Status**: 📋 Planning Complete, Ready to Implement
**Recommended**: Implement BEFORE Phase 5.1 (Content Refresh)
**Rationale**: Quick win (4-6 hours), removes major friction from RapidAPI workflow
