# JobHunter Automated Testing Guide

## Quick Start for Developers

This guide provides everything developers need to understand, run, and contribute to JobHunter's comprehensive test suite.

### **🚀 Running Tests**

```bash
# Backend tests (Rust)
cd backend && cargo test

# Frontend unit tests (TAP + TypeScript)
cd frontend && npm run test:coverage

# Frontend E2E tests (Playwright) - NEW!
cd frontend && npm run test:e2e

# Database tests (pgTAP)
pg_prove -d jobhunter_test database/test/*.sql

# Full integration test suite
docker-compose -f docker-compose.test.yml up

# Run ALL tests with comprehensive script
./run-all-tests.sh
```

### **📋 Test Documentation Structure**

- **[README_auto-test-plan.md](README_auto-test-plan.md)** - Comprehensive testing strategy and TAP architecture
- **[README_auto-test-results.md](README_auto-test-results.md)** - Live dashboard with current test status
- **This file** - Developer quick start and implementation guide

---

## ✅ Phase 1 Implementation Complete

JobHunter now has a **production-ready testing foundation** with comprehensive Phase 1 infrastructure implemented across all system components.

### **🔧 Backend Testing Infrastructure**

#### **Dependencies Added to `Cargo.toml`**
```toml
[dev-dependencies]
tokio-test = "0.4"      # Async testing framework
sqlx-test = "0.6"       # Database testing utilities
mockall = "0.11"        # Mock object generation
wiremock = "0.5"        # HTTP service mocking
criterion = "0.5"       # Performance benchmarking
proptest = "1.2"        # Property-based testing
```

#### **Test Files Created**
- **`backend/tests/api_tests.rs`** - Comprehensive API and database integration tests

#### **Test Coverage Areas**
- ✅ **API Endpoint Testing** with database integration
- ✅ **Job Filtering Logic** validation (salary ≥$130K, commute ≤45min, domain matching)
- ✅ **Deduplication System** testing with SHA256 hashing
- ✅ **Database Constraint** validation across 12 tables
- ✅ **Performance Benchmarks** (<100ms API response, <50ms DB queries)
- ✅ **Error Handling** scenarios for edge cases

#### **Example Backend Test**
```rust
#[tokio::test]
async fn test_job_filtering_logic() {
    let pool = create_test_pool().await;

    let high_salary_job = TestJob {
        salary: Some(150000),
        should_pass: true,
    };

    let should_pass_filter = test_case.salary.unwrap_or(0) >= 130000;
    assert_eq!(should_pass_filter, test_case.should_pass);
}
```

### **🎨 Frontend TAP Testing Setup**

#### **Dependencies Added to `package.json`**
```json
{
  "devDependencies": {
    "tap": "^18.5.0",
    "@types/tap": "^15.0.0",
    "node-tap": "^18.5.0",
    "supertest": "^6.3.0",
    "jsdom": "^22.1.0",
    "ts-node": "^10.9.0",
    "msw": "^1.2.0"
  }
}
```

#### **TAP Configuration** (`tap.config.js`)
- **95% coverage requirements** across statements, branches, functions, lines
- **TypeScript native support** with `--ts` flag
- **Multiple reporters**: tap-spec, tap-dot, tap-junit

#### **Test Files Created**
- **`frontend/test/components/JobCard.test.ts`** - React component testing with TAP
- **`frontend/test/api/jobs-api.test.ts`** - API integration testing with TypeScript

#### **Example Frontend Test**
```typescript
tap.test('JobCard Component Tests', async (t) => {
  await t.test('approve button triggers status update', async (t) => {
    const statusChanges: Array<{ jobId: string; status: string }> = [];
    const onStatusChange = (jobId: string, status: string) => {
      statusChanges.push({ jobId, status });
    };

    render(React.createElement(JobCard, { job: mockJob, onStatusChange }));
    fireEvent.click(screen.getByTestId('approve-button'));

    t.equal(statusChanges.length, 1, 'Should call status change handler once');
    t.same(statusChanges[0], { jobId: mockJob.job_id, status: 'approved' });
  });
});
```

### **🌐 End-to-End Testing with Playwright**

#### **Dependencies Added to `package.json`**
```json
{
  "devDependencies": {
    "@playwright/test": "^1.55.1"
  }
}
```

#### **Playwright Configuration** (`playwright.config.ts`)
- **Multi-browser support**: Chromium, Firefox, WebKit, Mobile browsers
- **Automatic retries**: 2 retries on CI, 1 retry locally
- **Screenshots & videos**: Captured on test failure
- **Trace collection**: Full trace on first retry for debugging
- **Parallel execution**: 4 workers for faster test runs
- **Base URL**: http://localhost:3000 (configurable)

#### **E2E Test Files Created (15 test suites)**
- **`01-setup-load.spec.ts`** - Initial page load and basic functionality (10 tests)
- **`02-tab-navigation.spec.ts`** - Tab switching and filtering (20 tests)
- **`03-job-status-updates.spec.ts`** - Status change operations (15 tests)
- **`04-content-generation.spec.ts`** - Resume/cover letter generation (12 tests)
- **`05-job-details.spec.ts`** - Job detail modal functionality (18 tests)
- **`06-statistics.spec.ts`** - Dashboard statistics display (10 tests)
- **`07-filtered-jobs.spec.ts`** - Filtered jobs tab and reasons (12 tests)
- **`08-responsive-design.spec.ts`** - Mobile and tablet layouts (15 tests)
- **`09-error-handling.spec.ts`** - Error states and recovery (14 tests)
- **`10-performance.spec.ts`** - Load time and rendering performance (8 tests)
- **`11-accessibility.spec.ts`** - ARIA labels and keyboard navigation (20 tests)
- **`12-calendar-management.spec.ts`** - Calendar events and deadlines (16 tests)
- **`13-follow-ups-management.spec.ts`** - Follow-up tracking (14 tests)
- **`14-timeline-view.spec.ts`** - Timeline visualization (10 tests)
- **`15-intake-tab.spec.ts`** - **NEW!** Job intake UI testing (27 tests)

**Total: 221+ end-to-end tests** covering the complete user workflow

#### **Intake Tab Test Coverage** (NEW - October 6, 2025)

The newly added `15-intake-tab.spec.ts` provides comprehensive testing for the Intake tab:

**Test Suites**:
1. **Tab Navigation** (3 tests)
   - Intake tab visibility in navigation
   - Tab activation on click
   - Content display when active

2. **Integration Cards** (4 tests)
   - Gmail integration card display
   - LinkedIn integration card display
   - Indeed integration card display
   - Status indicators for each source

3. **Sync All Sources Button** (2 tests)
   - Button visibility and placement
   - Enable/disable state during sync operations

4. **Gmail Integration** (2 tests)
   - Authentication button display (OAuth flow)
   - Settings button availability

5. **LinkedIn Integration** (3 tests)
   - Sync Now button functionality
   - Mock implementation notice display
   - Learn More button availability

6. **Indeed Integration** (3 tests)
   - Not Implemented status display
   - Coming Soon message
   - Disabled Request Implementation button

7. **Activity Log** (2 tests)
   - Recent Intake Activity section display
   - Empty state message when no activity

8. **Statistics Dashboard** (2 tests)
   - Intake Performance section display
   - Statistics metrics when data exists

9. **Loading States** (1 test)
   - Loading indicator during initial load

10. **Responsive Design** (2 tests)
    - Desktop grid layout (1280px+)
    - Mobile stacked layout (375px)

11. **Accessibility** (2 tests)
    - Accessible button labels
    - Proper heading hierarchy

12. **Error Handling** (1 test)
    - Graceful API error handling

#### **Example E2E Test**
```typescript
test.describe('Intake Tab', () => {
  test('should navigate to Intake tab when clicked', async ({ page }) => {
    await page.goto('/');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: /^JobHunter$/i }))
      .toBeVisible({ timeout: 10000 });

    // Click Intake tab
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(500);

    // Verify tab is active
    const ariaSelected = await intakeTab.getAttribute('aria-selected');
    expect(ariaSelected).toBe('true');
  });

  test('should display Gmail integration card', async ({ page }) => {
    await page.goto('/');
    const intakeTab = page.getByRole('button', { name: /^intake$/i });
    await intakeTab.click();
    await page.waitForTimeout(1000);

    // Verify Gmail card is visible
    const gmailCard = page.getByRole('heading', { name: /Gmail Job Discovery/i });
    await expect(gmailCard).toBeVisible();
  });
});
```

#### **Running E2E Tests**

**All Playwright E2E Tests**:
```bash
# Run all E2E tests (headless mode)
cd frontend && npm run test:e2e

# Run with visible browser (for debugging)
npm run test:e2e:headed

# Run in debug mode (step through tests)
npm run test:e2e:debug

# Interactive UI mode (recommended for development)
npm run test:e2e:ui
```

**Browser-Specific Tests**:
```bash
# Test in specific browsers
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Mobile device testing
npm run test:e2e:mobile
```

**Test Reports**:
```bash
# View HTML test report
npm run test:e2e:report

# Run tests with CI configuration
npm run test:e2e:ci
```

**Intake Tab Specific Tests**:
```bash
# Run only Intake tab tests
npx playwright test e2e/tests/15-intake-tab.spec.ts

# Run Intake tests with visible browser
npx playwright test e2e/tests/15-intake-tab.spec.ts --headed

# Run specific test by name
npx playwright test -g "should display Gmail integration card"
```

#### **E2E Test Best Practices**

**Page Object Model**:
- **`e2e/pages/DashboardPage.ts`** - Encapsulates dashboard interactions
- Reusable locators and actions across test suites
- Reduces code duplication and improves maintainability

**Test Organization**:
- One test suite per major feature/workflow
- Descriptive test names following pattern: "should [expected behavior]"
- Grouped by functionality using `test.describe()` blocks

**Assertions**:
- Use Playwright's auto-waiting assertions: `expect(locator).toBeVisible()`
- Avoid hard-coded waits; prefer `waitForLoadState()` and `waitForSelector()`
- Include timeout values for critical assertions

**Test Isolation**:
- Each test starts from a clean state (fresh page navigation)
- No shared state between tests
- Database fixtures reset between test runs

### **🗄️ Database pgTAP Testing**

#### **Test Files Created**
- **`database/test/job-constraints.sql`** - Table structure validation (25 tests)
- **`database/test/deduplication-tests.sql`** - Deduplication system testing (20 tests)
- **`database/test-fixtures.sql`** - Comprehensive sample data for testing

#### **pgTAP Test Coverage**
- ✅ **Table structure validation** (columns, types, constraints)
- ✅ **Foreign key relationships** and cascade behavior
- ✅ **Index existence** for performance optimization
- ✅ **SHA256 hash functionality** for deduplication
- ✅ **Unique constraints** and collision prevention
- ✅ **Query performance** validation

#### **Example Database Test**
```sql
BEGIN;
SELECT plan(25);

SELECT has_table('public', 'jobs', 'jobs table should exist');
SELECT col_type_is('public', 'jobs', 'job_id', 'uuid', 'job_id should be UUID type');
SELECT col_not_null('public', 'jobs', 'title', 'title should not allow NULL');

-- Test deduplication functionality
SELECT ok(
    (SELECT COUNT(*) FROM job_deduplication
     WHERE company_title_hash = encode(SHA256('TestCorpSoftware Engineer'::bytea), 'hex')) = 1,
    'Should have one deduplication entry'
);

ROLLBACK;
```

### **🔗 System Integration Setup**

#### **Docker Test Environment** (`docker-compose.test.yml`)
- **Isolated PostgreSQL test database** with health checks
- **Automated schema and fixture loading**
- **Multi-service test orchestration** (backend, frontend, database)
- **Network isolation** for reliable testing

#### **Test Database Configuration**
- **Test-specific database**: `jobhunter_test`
- **Comprehensive fixtures**: Sample jobs, applications, deduplication entries
- **Realistic test data**: Covers all filtering scenarios and edge cases

---

## 🎯 Ready for Execution

The complete Phase 1 testing infrastructure is now operational and ready to run:

### **Individual Test Suites**

```bash
# Backend tests with verbose output
cd backend && cargo test --verbose

# Frontend unit tests with coverage
cd frontend && npm run test:coverage

# Frontend unit tests with pretty reporting
cd frontend && npm run test:reporter

# Watch mode for development
cd frontend && npm run test:watch

# E2E tests - all browsers (Playwright)
cd frontend && npm run test:e2e

# E2E tests - specific browser
cd frontend && npm run test:e2e:chromium
cd frontend && npm run test:e2e:firefox
cd frontend && npm run test:e2e:webkit

# E2E tests - with UI (interactive mode)
cd frontend && npm run test:e2e:ui

# E2E tests - headed mode (visible browser)
cd frontend && npm run test:e2e:headed

# E2E tests - specific test file
cd frontend && npx playwright test e2e/tests/15-intake-tab.spec.ts

# Database schema tests
pg_prove -d jobhunter_test database/test/*.sql
```

### **Full Integration Testing**

```bash
# Start complete test environment
docker-compose -f docker-compose.test.yml up

# Run individual services
docker-compose -f docker-compose.test.yml up test-db
docker-compose -f docker-compose.test.yml up test-backend
docker-compose -f docker-compose.test.yml up test-frontend
```

### **Environment Setup**

#### **Test Database Setup**
```bash
# Create test database
createdb jobhunter_test

# Apply schema and fixtures
psql -d jobhunter_test -f database/schema.sql
psql -d jobhunter_test -f database/test-fixtures.sql

# Set environment variable
export TEST_DATABASE_URL="postgresql://jobhunter_user:jobhunter_test_password@localhost/jobhunter_test"
```

#### **Frontend Dependencies**
```bash
cd frontend && npm install
```

---

## 📊 Key Performance Targets

Our testing infrastructure validates these performance standards:

- **API Response Time**: <100ms (95th percentile)
- **Database Queries**: <50ms average
- **Job Filtering**: <100ms for multi-criteria evaluation
- **Content Generation**: <2 seconds for resume/cover letter creation
- **Memory Usage**: <512MB backend, <256MB frontend

### **Performance Test Examples**

#### **Backend Performance Validation**
```rust
#[tokio::test]
async fn test_job_query_performance() {
    let pool = create_test_pool().await;

    let start = Instant::now();
    let _result = sqlx::query!("SELECT * FROM jobs LIMIT 100")
        .fetch_all(&pool).await.expect("Job query should succeed");
    let duration = start.elapsed();

    assert!(duration.as_millis() < 100,
           "Job query should complete in under 100ms, took {}ms",
           duration.as_millis());
}
```

#### **Frontend Performance Testing**
```typescript
tap.test('renders within acceptable time', async (t) => {
  const startTime = Date.now();
  render(React.createElement(JobCard, { job: mockJob }));
  const renderTime = Date.now() - startTime;

  t.ok(renderTime < 100, `Should render in under 100ms, took ${renderTime}ms`);
});
```

---

## 🛠️ Developer Workflow

### **Adding New Tests**

#### **Backend Tests**
1. Add test functions to `backend/tests/api_tests.rs`
2. Use `create_test_pool()` for database access
3. Follow async/await patterns with `#[tokio::test]`
4. Include performance assertions where appropriate

#### **Frontend Unit Tests**
1. Create `.test.ts` files in `frontend/test/`
2. Use TAP protocol: `import tap from 'tap'`
3. Leverage JSDOM for React component testing
4. Include both unit and integration scenarios

#### **Frontend E2E Tests**
1. Create `.spec.ts` files in `frontend/e2e/tests/`
2. Use Playwright test framework: `import { test, expect } from '@playwright/test'`
3. Follow naming convention: `##-feature-name.spec.ts` (e.g., `15-intake-tab.spec.ts`)
4. Use Page Object Model for reusable interactions (`e2e/pages/`)
5. Group related tests with `test.describe()` blocks
6. Include tests for happy path, edge cases, and accessibility
7. Use auto-waiting assertions: `expect(locator).toBeVisible()`

**Example E2E Test Structure**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Common setup
  });

  test('should perform expected behavior', async ({ page }) => {
    // Arrange
    const element = page.getByRole('button', { name: /Click Me/i });

    // Act
    await element.click();

    // Assert
    await expect(page.getByText(/Success/i)).toBeVisible();
  });
});
```

#### **Database Tests**
1. Add `.sql` files to `database/test/`
2. Use pgTAP functions: `plan()`, `has_table()`, `col_type_is()`, etc.
3. Wrap in transactions for isolation: `BEGIN;` / `ROLLBACK;`
4. Test both structure and data integrity

### **Test-Driven Development**

1. **Write test first** defining expected behavior
2. **Run test** to confirm it fails appropriately
3. **Implement feature** to make test pass
4. **Refactor** while maintaining test coverage
5. **Update documentation** and add integration tests

### **Debugging Tests**

#### **Backend Debugging**
```bash
# Run with debug output
RUST_LOG=debug cargo test -- --nocapture

# Run specific test
cargo test test_job_filtering_logic -- --nocapture
```

#### **Frontend Unit Test Debugging**
```bash
# Verbose TAP output
npm run test:reporter

# Run specific test file
npx tap test/components/JobCard.test.ts
```

#### **E2E Test Debugging**
```bash
# Debug mode (step through tests with Playwright Inspector)
npm run test:e2e:debug

# Run specific test file with visible browser
npx playwright test e2e/tests/15-intake-tab.spec.ts --headed

# Run specific test by name pattern
npx playwright test -g "should display Gmail"

# Interactive UI mode (best for debugging)
npm run test:e2e:ui

# Run with trace (generates detailed trace file)
npx playwright test --trace on

# View test report after failures
npm run test:e2e:report
```

#### **Database Debugging**
```bash
# Verbose pgTAP output
pg_prove -v -d jobhunter_test database/test/job-constraints.sql
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **Database Connection Errors**
```bash
# Ensure test database exists
createdb jobhunter_test

# Check connection
psql -d jobhunter_test -c "SELECT 1;"

# Verify environment variable
echo $TEST_DATABASE_URL
```

#### **Frontend Test Failures**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript compilation
npx tsc --noEmit
```

#### **Docker Issues**
```bash
# Clean up containers
docker-compose -f docker-compose.test.yml down -v

# Rebuild images
docker-compose -f docker-compose.test.yml build --no-cache
```

---

## 📈 Contributing to Tests

### **Guidelines**
- **Follow TAP protocol** for consistent output format
- **Maintain 95%+ coverage** across all components
- **Include performance assertions** where appropriate
- **Write descriptive test names** that explain the scenario
- **Use realistic test data** from fixtures when possible

### **Pull Request Checklist**
- [ ] All existing tests pass (backend, unit, E2E, database)
- [ ] New tests cover added functionality
  - [ ] Unit tests for new components/functions
  - [ ] E2E tests for new user-facing features
- [ ] Performance benchmarks maintained
- [ ] Database tests include cleanup
- [ ] TypeScript strict mode compliance
- [ ] E2E tests run in all browsers (chromium, firefox, webkit)
- [ ] Accessibility tested (ARIA labels, keyboard navigation)

### **Code Review Focus**
- **Test clarity and maintainability**
- **Comprehensive edge case coverage**
- **Performance implications**
- **Integration with existing test suite**

---

## 🔄 Running All Tests

To run the **complete test suite** including backend, frontend unit, E2E, and database tests:

### **Option 1: Sequential Manual Execution**

```bash
# 1. Backend tests
echo "Running backend tests..."
cd backend && cargo test && cd ..

# 2. Frontend unit tests
echo "Running frontend unit tests..."
cd frontend && npm run test:coverage && cd ..

# 3. Frontend E2E tests (includes Intake tab tests)
echo "Running E2E tests..."
cd frontend && npm run test:e2e && cd ..

# 4. Database tests (if pgTAP is installed)
echo "Running database tests..."
pg_prove -d jobhunter_test database/test/*.sql

echo "All tests complete!"
```

### **Option 2: Use the Automated Test Runner Script** (Recommended)

The project includes `run-all-tests.sh` in the root directory that runs all test suites with color-coded output and comprehensive reporting.

**Features**:
- ✅ Runs all 4 test suites sequentially (backend, unit, E2E, database)
- ✅ Color-coded output (green for pass, red for fail, blue for running)
- ✅ Test counters and summary report
- ✅ Proper exit codes for CI/CD integration
- ✅ Graceful handling when pgTAP is not installed
- ✅ Includes the new Intake tab E2E tests

**Usage**:
```bash
./run-all-tests.sh
```

**Example Output**:
```
================================================
  JobHunter Complete Test Suite
================================================

[1/4] Running Backend Tests...
✓ Backend tests passed

[2/4] Running Frontend Unit Tests...
✓ Frontend unit tests passed

[3/4] Running E2E Tests (Playwright)...
✓ E2E tests passed

[4/4] Running Database Tests (pgTAP)...
✓ Database tests passed

================================================
  Test Suite Summary
================================================
Passed: 4/4
Failed: 0/4

✓ All tests passed!
```

**Note**: E2E tests require the application to be running. Start it first with `./start.sh` in a separate terminal.

### **Test Suite Summary**

**Total Test Count** (as of October 6, 2025):
- **Backend**: ~50 tests (Rust integration tests)
- **Frontend Unit**: ~30 tests (TAP/TypeScript)
- **Frontend E2E**: **221 tests** (Playwright)
  - Including **27 new Intake tab tests** ✨
- **Database**: ~45 tests (pgTAP)

**Grand Total: ~346 automated tests** covering the complete JobHunter platform

### **CI/CD Integration**

For continuous integration, the tests can be run in parallel using GitHub Actions or similar:

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run backend tests
        run: cd backend && cargo test

  frontend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run frontend unit tests
        run: cd frontend && npm ci && npm run test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Playwright
        run: cd frontend && npm ci && npx playwright install --with-deps
      - name: Run E2E tests
        run: cd frontend && npm run test:e2e:ci

  database:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: jobhunter_test
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - name: Install pgTAP
        run: sudo apt-get install -y pgtap
      - name: Run database tests
        run: pg_prove -d jobhunter_test database/test/*.sql
```

---

## 🎉 Next Steps

With Phase 1 complete, the testing infrastructure is ready for:

1. **Phase 2 Implementation** - Intelligent automation testing (job filtering, deduplication)
2. **Phase 3 Implementation** - Content generation testing (resume/cover letter)
3. **Phase 4 Implementation** - Automated job intake testing (Gmail, LinkedIn APIs)
4. **CI/CD Integration** - Automated test execution on code changes
5. **Coverage Reporting** - Detailed analysis and improvement tracking

The foundation is solid, comprehensive, and ready to scale with the JobHunter platform as it evolves from manual job management to fully autonomous job discovery and processing.

---

**For more detailed information:**
- **Strategy & Architecture**: [README_auto-test-plan.md](README_auto-test-plan.md)
- **Current Status & Metrics**: [README_auto-test-results.md](README_auto-test-results.md)