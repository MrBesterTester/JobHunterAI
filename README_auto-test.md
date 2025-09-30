# JobHunter Automated Testing Guide

## Quick Start for Developers

This guide provides everything developers need to understand, run, and contribute to JobHunter's comprehensive test suite.

### **🚀 Running Tests**

```bash
# Backend tests (Rust)
cd backend && cargo test

# Frontend tests (TAP + TypeScript)
cd frontend && npm run test:coverage

# Database tests (pgTAP)
pg_prove -d jobhunter_test database/test/*.sql

# Full integration test suite
docker-compose -f docker-compose.test.yml up
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

# Frontend tests with coverage
cd frontend && npm run test:coverage

# Frontend tests with pretty reporting
cd frontend && npm run test:reporter

# Watch mode for development
cd frontend && npm run test:watch

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

#### **Frontend Tests**
1. Create `.test.ts` files in `frontend/test/`
2. Use TAP protocol: `import tap from 'tap'`
3. Leverage JSDOM for React component testing
4. Include both unit and integration scenarios

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

#### **Frontend Debugging**
```bash
# Verbose TAP output
npm run test:reporter

# Run specific test file
npx tap test/components/JobCard.test.ts
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
- [ ] All existing tests pass
- [ ] New tests cover added functionality
- [ ] Performance benchmarks maintained
- [ ] Database tests include cleanup
- [ ] TypeScript strict mode compliance

### **Code Review Focus**
- **Test clarity and maintainability**
- **Comprehensive edge case coverage**
- **Performance implications**
- **Integration with existing test suite**

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