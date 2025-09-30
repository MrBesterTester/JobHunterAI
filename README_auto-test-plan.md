# Comprehensive Automated Test Suite Plan - JobHunter

## Overview

This document outlines the comprehensive testing strategy for the JobHunter autonomous job application management system. Our testing approach ensures reliability, performance, and correctness across all 4 phases of the platform, from core functionality through automated job intake and content generation.

## Test Architecture

### Test Environment Structure
```
JobHuntAI/
├── backend/tests/          # Rust backend tests
│   ├── unit/              # Individual function tests
│   ├── integration/       # API endpoint tests
│   ├── performance/       # Load and benchmark tests
│   └── security/          # Auth and validation tests
├── frontend/src/__tests__/ # React component tests
│   ├── components/        # UI component tests
│   ├── integration/       # API communication tests
│   ├── e2e/              # End-to-end workflow tests
│   └── accessibility/     # ARIA and keyboard tests
├── database/tests/         # PostgreSQL schema tests
│   ├── schema/           # Constraint and trigger tests
│   ├── integrity/        # Foreign key and cascade tests
│   ├── performance/      # Query optimization tests
│   └── migration/        # Schema evolution tests
└── tests/integration/      # Cross-system tests
    ├── api/              # Contract and compliance tests
    ├── workflows/        # Complete user journeys
    ├── external/         # Third-party integrations
    └── scenarios/        # Error and edge cases
```

## Phase-by-Phase Testing Coverage

### Phase 1 - Core System Testing ⚠️
**Target Coverage: 95%+ | Status: Backend Complete, Frontend Infrastructure Only**

#### Backend API Testing ✅
- ✅ **20+ REST Endpoints**: Full CRUD operations with proper HTTP status codes
- ✅ **Database Operations**: All 12 tables with proper relationships and constraints
- ✅ **Error Handling**: Graceful failure management and comprehensive logging
- ✅ **CORS Configuration**: Cross-origin request validation
- ✅ **Environment Configuration**: Database connections and environment variables

#### Frontend Component Testing ⚠️ **Infrastructure Only - Tests Cannot Execute**
- ⚠️ **Test Files Created**: JobCard.test.ts and jobs-api.test.ts exist with comprehensive test cases
- ⚠️ **ES Module Errors**: Tests fail to execute due to module loading cycle errors
- ⚠️ **Mocked Components**: Tests use mock React components instead of actual App.tsx components
- ⚠️ **Current Status**: 0/2 tests executing, infrastructure created but non-functional

**Frontend Testing Limitations**:
- **No Visual Browser Access**: AI assistant cannot see or interact with the web UI in a browser
- **No Screenshot Capability**: AI assistant cannot capture or view the rendered interface
- **No Click/Form Testing**: AI assistant cannot simulate real user interactions like clicking buttons or filling forms
- **Mock Components Only**: Test files create mock implementations rather than testing actual React components from src/App.tsx
- **Module Loading Issues**: ES Module/CommonJS cycle errors prevent tests from running

**Recommendation**: Frontend requires manual testing or browser automation tools:
- **Manual Testing Checklist**: Create systematic checklist for testing UI components, status updates, and workflows
- **Browser Automation**: Consider Playwright or Cypress for real browser-based E2E testing
- **Real Component Testing**: Tests should import and test actual components from src/App.tsx, not mocks

#### Database Schema Testing ✅
- ✅ **Table Constraints**: Primary keys, foreign keys, and unique constraints (validated via backend tests)
- ✅ **Triggers**: Automatic timestamp updates and data validation (validated via backend tests)
- ✅ **Views**: Pending approval jobs and application statistics (validated via backend tests)
- ✅ **Indexes**: Performance optimization and query efficiency (validated via backend tests)

### Phase 2 - Intelligent Automation Testing ✅ COMPLETE
**Target Coverage: 98%+ | Status: 27/27 Tests Passing (100%) - December 2024**

#### Job Filtering Engine ✅
- ✅ **Salary Filtering**: Minimum $130K threshold validation with edge cases (7 tests)
- ✅ **Location Analysis**: Remote preference and commute time calculations (8+ locations)
- ✅ **Domain Matching**: Keyword analysis for Testing, AI, and Firmware roles (5 domains)
- ✅ **Rejection Reasoning**: Detailed filter failure explanations
- ✅ **Performance**: Sub-100ms filtering response times (validated: 100 jobs < 100ms)

#### Deduplication System ✅
- ✅ **SHA256 Hashing**: Company + title combination uniqueness (case-insensitive)
- ✅ **URL Deduplication**: Prevention of duplicate job postings by URL
- ✅ **Collision Handling**: Proper conflict resolution and existing job returns
- ✅ **Cross-source Prevention**: Multi-platform duplicate detection (Gmail, LinkedIn, Indeed)
- ✅ **Database Integrity**: Deduplication table consistency and indexing (FK, unique constraints)
- ✅ **Performance**: 100 deduplication lookups < 5 seconds (validated)

#### Real-time Analytics ✅
- ✅ **Statistics Accuracy**: Live job counts by status validation (10 tests)
- ✅ **Performance Metrics**: Query response times under load (< 100ms validated)
- ✅ **Data Consistency**: Real-time updates across multiple sessions
- ✅ **Dashboard Updates**: Live refresh without page reloads
- ✅ **Concurrent Queries**: 10 parallel queries handled successfully
- ✅ **Multi-source Tracking**: Statistics across Gmail, LinkedIn, Indeed, Manual sources

### Phase 3 - Content Generation Testing ✅ COMPLETE
**Target Coverage: 95%+ | Status: ✅ COMPLETE - 16/16 Tests Passing (100%)**

#### Resume Customization Engine ✅
- ✅ **Domain-aware Highlighting**: Context-specific keyword emphasis
  - ✅ Testing roles: "Test Automation", "Quality Engineering", "CI/CD"
  - ✅ AI roles: "AI-powered", "LLM", "Prompt Engineering"
  - ✅ Firmware roles: "firmware", "hardware", "validation"
- ✅ **Dynamic Content Selection**: Relevant experience prioritization
- ✅ **Markdown Formatting**: Professional formatting preservation
- ✅ **Version Control**: Multiple resume variations and template management

#### Cover Letter Generation ✅
- ✅ **Handlebars Templates**: Dynamic content insertion with 20+ variables
- ✅ **Job-specific Personalization**: Company research and role messaging
- ✅ **Salary-aware Content**: Appropriate compensation discussions
- ✅ **Domain-specific Focus**: Technical emphasis based on job requirements
- ✅ **Output Validation**: Grammar, formatting, and completeness checks

#### Content Quality Assurance ✅
- ✅ **Template Integrity**: Proper variable substitution and formatting
- ✅ **Content Relevance**: Job-specific customization accuracy
- ✅ **Professional Standards**: Appropriate tone and messaging
- ✅ **Error Handling**: Graceful failure with missing data
- ✅ **Performance**: <2 second generation times

### Phase 4 - Automated Job Intake Testing ✅ COMPLETE
**Target Coverage: 92%+ | Status: ✅ COMPLETE - 18/18 Tests Passing (100%)**

#### Gmail API Integration ✅
- ✅ **OAuth 2.0 Flow**: Complete authentication with automatic token refresh
- ✅ **Email Parsing**: Intelligent job extraction from recruiter emails
- ✅ **Base64 Decoding**: Full email body parsing including attachments
- ✅ **Rate Limiting**: Respectful API usage within Google's limits
- ✅ **Error Recovery**: Token expiration and API failure handling

#### LinkedIn Jobs Integration ✅
- ✅ **Mock API Testing**: Comprehensive LinkedIn job processing simulation
- ✅ **Data Extraction**: High-confidence job parsing from API responses
- ✅ **Search Parameters**: Configurable salary, location, and keyword filtering
- ✅ **Rate Limiting**: Built-in request throttling and API courtesy
- ✅ **Response Validation**: Proper handling of various LinkedIn API responses

#### Multi-source Job Aggregation ✅
- ✅ **Unified Processing**: Single endpoint for all active job sources
- ✅ **Cross-platform Deduplication**: SHA256-based duplicate prevention
- ✅ **Background Processing**: Non-blocking job discovery and processing
- ✅ **Error Isolation**: Individual source failures don't affect others
- ✅ **Scheduling Logic**: Interval-based sync with configurable frequencies

#### Advanced Job Processing ✅
- ✅ **Intelligent Extraction**: Multi-pattern regex for job details
- ✅ **Confidence Scoring**: Quality assessment of extracted information (0.0-1.0)
- ✅ **Automated Filtering**: All discovered jobs through existing Phase 2 filters
- ✅ **Audit Trail**: Complete logging of discovery, processing, and error states
- ✅ **Performance Monitoring**: Detailed statistics on discovery rates

### Phase 5 - Frontend Automated Testing ⏳ PLANNED
**Target Coverage: 95%+ | Status: Architecture Designed, Implementation Pending**

#### Browser Testing Strategy: Chrome + Playwright

**Strategic Decision**: Chrome/Chromium for Development AND Testing

JobHunter's frontend testing uses **Playwright with Chromium (Chrome-equivalent)** as the primary test target for maximum accuracy, reliability, and developer productivity.

**Rationale for Chrome-First Strategy:**

1. **Perfect Testing Accuracy** (Critical)
   - Playwright Chromium = Google Chrome (identical rendering engine)
   - Zero gap between "works in daily use" and "passes in tests"
   - What the developer sees = What the tests validate = What users experience
   - Eliminates "works on my machine" problems

2. **Best Developer Experience**
   - Chrome DevTools: Industry-leading debugging, profiling, React integration
   - Fastest feedback loops (Chromium tests run 2-3x faster than Firefox/WebKit)
   - Superior network inspector, performance profiler, memory leak detection
   - Largest developer community, most Stack Overflow solutions

3. **Market Reality**
   - Chrome/Chromium: ~65% global browser market share
   - Testing Chrome = validating experience for 2/3 of internet users
   - Chromium-based browsers (Edge, Brave) use same engine = automatically covered

4. **Technical Excellence**
   - Playwright's primary target (most stable, most features, best maintained)
   - Microsoft develops both Playwright and Edge (Chromium-based)
   - Fewer edge cases and quirks than Safari/WebKit
   - Fastest execution times = tests run more frequently = bugs caught earlier

5. **Simplicity Principle**
   - Software is complicated enough - reduce unnecessary complexity
   - One browser for development + testing = simpler, more predictable
   - Cross-browser testing in CI/CD catches edge cases without daily friction

**Multi-Browser Testing Approach:**

| Browser | Coverage | When | Purpose |
|---------|----------|------|---------|
| **Chromium** | 100% | Every test run, every commit | Primary validation, daily development |
| **Firefox** | 100% | CI/CD only (before releases) | Cross-browser validation, Gecko engine coverage |
| **WebKit** | 100% | CI/CD only (macOS runners) | Safari-equivalent testing (~90% Safari accuracy) |

**Cross-Browser Test Execution:**
- **Local Development**: Chromium only (fast feedback)
- **Pull Requests**: Chromium + Firefox + WebKit (comprehensive validation)
- **Production Releases**: Full multi-browser suite with visual regression testing

#### Playwright Test Architecture

**Test Structure:**
```
frontend/e2e/
├── tests/
│   ├── 01-setup-load.spec.ts           # Setup & Initial Load (2 sections)
│   ├── 02-tab-navigation.spec.ts       # Tab Navigation & Filtering (2 sections)
│   ├── 03-job-status-updates.spec.ts   # Job Status Updates (2 sections)
│   ├── 04-content-generation.spec.ts   # Content Generation (2 sections)
│   ├── 05-job-details.spec.ts          # Job Details View (2 sections)
│   ├── 06-statistics.spec.ts           # Statistics & Real-time Updates (2 sections)
│   ├── 07-filtered-jobs.spec.ts        # Filtered Jobs Display (1 section)
│   ├── 08-responsive-design.spec.ts    # Responsive Design (3 sections)
│   ├── 09-error-handling.spec.ts       # Error Handling & Edge Cases (4 sections)
│   ├── 10-performance.spec.ts          # Performance Validation (1 section)
│   └── 11-accessibility.spec.ts        # Accessibility Testing (2 sections)
├── pages/
│   ├── DashboardPage.ts                # Page Object Model for dashboard
│   ├── JobCardComponent.ts             # Job card interactions
│   └── ModalComponent.ts               # Modal interactions
├── fixtures/
│   ├── test-data.ts                    # Sample job data
│   └── test-helpers.ts                 # Utility functions
└── playwright.config.ts                # Multi-browser configuration
```

**Test Coverage Mapping:**
Each of the 24 sections from the Manual Frontend Testing Checklist (below) maps to automated Playwright tests:
- 24 manual test sections → 11 Playwright spec files
- 150+ manual checkpoints → 144+ automated assertions
- 100% critical path coverage: Tab navigation, status updates, content generation
- 100% feature coverage: Job details, statistics, filtered jobs
- 100% quality coverage: Responsive design, error handling, accessibility

**Page Object Model Architecture:**
- **Maintainability**: UI changes only require updating Page Objects, not individual tests
- **Reusability**: Common interactions (click job card, approve job) defined once
- **Readability**: Tests read like user stories, technical details abstracted

**Test Execution Strategy:**
- **Parallel Execution**: 4 workers (tests run simultaneously)
- **Automatic Retries**: Flaky tests retry 2x before failing
- **Visual Regression**: Screenshot comparison for critical pages
- **Performance Monitoring**: Page load (<3s), API calls (<100ms), content gen (<2s)

**CI/CD Integration:**
```yaml
GitHub Actions Workflow:
- Trigger: On push to main, all pull requests
- Matrix: ubuntu-latest (Chromium, Firefox), macos-latest (WebKit)
- Parallel: 4 test shards for speed
- Artifacts: Screenshots, videos, HTML reports (30-day retention)
- Quality Gates: 100% pass required to merge
```

**Why NOT Cypress or Selenium?**
- **Cypress**: WebKit support is experimental, uses Playwright WebKit internally (why not use Playwright directly?)
- **Selenium**: Legacy architecture, slower, more flaky tests, weaker TypeScript support
- **Playwright**: Modern, fast, reliable, excellent TypeScript support, best Chrome/Chromium integration

**Implementation Timeline:** 4-5 weeks (part-time) or 2-3 weeks (full-time)

**Success Metrics:**
- ✅ 144+ automated assertions (100% manual checklist coverage)
- ✅ <5 minute full test suite execution (parallelized)
- ✅ <1% flaky test rate
- ✅ 100% critical path coverage
- ✅ Multi-browser validation in CI/CD

**Next Steps:**
1. Install Playwright: `npm init playwright@latest`
2. Configure multi-browser projects (Chromium primary, Firefox/WebKit secondary)
3. Create Page Object Models
4. Implement tests in priority order (critical paths first)
5. Set up GitHub Actions CI/CD
6. Achieve 100% automation of manual testing checklist

## Test Infrastructure & Dependencies

### TAP-Based TypeScript Testing Architecture

**Why TAP (Test Anything Protocol)?**
- **Strict TypeScript Compliance**: Full type safety with `@types/tap`
- **Language Agnostic**: Consistent output format across all test types
- **CI/CD Friendly**: Clean, parseable output for automated systems
- **Streaming Results**: Real-time test output as they execute
- **Rich Ecosystem**: Excellent reporter and tooling support

### Backend Testing Stack (Rust)
```toml
[dev-dependencies]
tokio-test = "0.4"      # Async testing framework
sqlx-test = "0.6"       # Database testing utilities
mockall = "0.11"        # Mock object generation
wiremock = "0.5"        # HTTP service mocking
criterion = "0.5"       # Performance benchmarking
proptest = "1.2"        # Property-based testing
```

### Frontend Testing Stack (TAP-Based TypeScript) - ⚠️ Infrastructure Only
```json
{
  "scripts": {
    "test": "tap test/**/*.test.ts",
    "test:coverage": "tap --coverage test/**/*.test.ts",
    "test:watch": "tap --watch test/**/*.test.ts",
    "test:reporter": "tap --reporter=tap-spec test/**/*.test.ts"
  },
  "devDependencies": {
    "tap": "^18.5.0",
    "@types/tap": "^15.0.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.0",
    "jsdom": "^22.1.0",
    "@types/jsdom": "^21.1.0",
    "ts-node": "^10.9.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^13.5.0",
    "msw": "^1.2.0",
    "tap-junit": "^5.0.0",
    "tap-spec": "^5.0.0",
    "tap-dot": "^2.0.0"
  }
}
```

**Note**: TAP 18 removed `--ts` flag (TypeScript supported by default). Frontend tests currently fail with ES Module cycle errors and cannot execute.

### TAP Test Examples for JobHunter

#### Backend API Testing (TypeScript + TAP)
```typescript
// test/api/jobs.test.ts
import tap from 'tap'
import supertest from 'supertest'
import { createTestApp } from '../helpers/test-app'

const app = createTestApp()
const request = supertest(app)

tap.test('Job API Integration Tests', async (t) => {
  t.plan(4)

  await t.test('GET /api/jobs returns job list', async (t) => {
    const response = await request
      .get('/api/jobs')
      .expect(200)

    t.ok(Array.isArray(response.body), 'Response should be an array')
    t.type(response.body[0]?.job_id, 'string', 'Job should have UUID')
  })

  await t.test('POST /api/jobs creates new job with filtering', async (t) => {
    const newJob = {
      title: 'Senior AI Test Engineer',
      company: 'TechCorp',
      salary: 155000,
      location: 'Remote'
    }

    const response = await request
      .post('/api/jobs')
      .send(newJob)
      .expect(201)

    t.equal(response.body.status, 'new', 'High-salary job should pass filter')
    t.ok(response.body.job_id, 'Should return job ID')
  })
})
```

#### Frontend Component Testing (TAP + React Testing Library)
```typescript
// test/components/JobCard.test.ts
import tap from 'tap'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobCard } from '../../src/components/JobCard'
import { mockJob } from '../fixtures/jobs'

tap.test('JobCard Component Tests', async (t) => {
  t.plan(3)

  await t.test('renders job information correctly', async (t) => {
    render(<JobCard job={mockJob} />)

    t.ok(screen.getByText(mockJob.title), 'Should display job title')
    t.ok(screen.getByText(mockJob.company), 'Should display company name')
    t.ok(screen.getByText(`$${mockJob.salary?.toLocaleString()}`), 'Should display formatted salary')
  })

  await t.test('approve button triggers status update', async (t) => {
    const onStatusChange = tap.createSpy()
    render(<JobCard job={mockJob} onStatusChange={onStatusChange} />)

    fireEvent.click(screen.getByText('Approve'))

    t.equal(onStatusChange.callCount, 1, 'Should call status change handler')
    t.same(onStatusChange.getCall(0).args, [mockJob.job_id, 'approved'], 'Should pass correct parameters')
  })
})
```

#### Job Filtering Logic Testing (TypeScript + TAP)
```typescript
// test/services/job-filter.test.ts
import tap from 'tap'
import { JobFilterEngine } from '../../src/services/job-filter'
import { JobCriteria } from '../../src/types/job-criteria'

const criteria: JobCriteria = {
  minSalary: 130000,
  maxCommuteTime: 45,
  preferredDomains: ['Software Testing', 'AI', 'Firmware']
}

tap.test('Job Filtering Engine', async (t) => {
  const filter = new JobFilterEngine(criteria)

  await t.test('salary filtering', async (t) => {
    const highSalaryJob = { title: 'Engineer', company: 'TechCorp', salary: 150000 }
    const lowSalaryJob = { title: 'Engineer', company: 'StartupCorp', salary: 80000 }

    t.ok(filter.evaluateSalary(highSalaryJob), 'Should pass high salary job')
    t.notOk(filter.evaluateSalary(lowSalaryJob), 'Should reject low salary job')
  })

  await t.test('domain matching', async (t) => {
    const aiJob = { title: 'AI Test Engineer', company: 'MLCorp' }
    const marketingJob = { title: 'Marketing Manager', company: 'AdCorp' }

    t.ok(filter.evaluateDomain(aiJob), 'Should pass AI-related job')
    t.notOk(filter.evaluateDomain(marketingJob), 'Should reject non-tech job')
  })
})
```

### Database Testing (pgTAP + TAP Integration)
```sql
-- test/database/job-constraints.sql
SELECT plan(5);

SELECT has_table('jobs', 'jobs table exists');
SELECT has_pk('jobs', 'jobs table has primary key');
SELECT col_type_is('jobs', 'job_id', 'uuid', 'job_id is UUID type');
SELECT col_not_null('jobs', 'title', 'title cannot be null');
SELECT col_not_null('jobs', 'company', 'company cannot be null');

SELECT * FROM finish();
```

### Integration Testing (TAP Output)
```typescript
// test/integration/job-lifecycle.test.ts
import tap from 'tap'

tap.test('Complete Job Application Lifecycle', async (t) => {
  t.plan(6)

  // Test complete workflow: Discovery → Filtering → Approval → Content Generation
  await t.test('job discovery from Gmail', async (t) => {
    // Gmail API integration test
  })

  await t.test('automatic job filtering', async (t) => {
    // Filter engine validation
  })

  await t.test('manual job approval', async (t) => {
    // UI interaction test
  })

  await t.test('resume and cover letter generation', async (t) => {
    // Content generation test
  })

  await t.test('application tracking', async (t) => {
    // Status management test
  })

  await t.test('cross-source deduplication', async (t) => {
    // SHA256 hash collision test
  })
})
```

### TAP Configuration and Reporting
```javascript
// tap.config.js
module.exports = {
  ts: true,
  jsx: false,
  coverage: true,
  'coverage-report': ['text', 'html', 'lcov'],
  'check-coverage': true,
  statements: 95,
  branches: 90,
  functions: 95,
  lines: 95,
  timeout: 30,
  files: ['test/**/*.test.ts'],
  reporter: 'tap-spec'
}
```

### Database Testing (pgTAP)
- **pgTAP**: PostgreSQL-specific testing framework outputting TAP
- **Docker Compose**: Isolated test database containers
- **Test Fixtures**: Consistent seed data for scenario testing
- **Migration Testing**: Schema evolution validation

### Integration Testing (TAP-Compatible)
- **Newman**: Automated Postman collection execution with TAP output
- **Docker**: Containerized testing environments
- **GitHub Actions**: CI/CD pipeline integration with TAP parsing
- **Code Coverage**: Built-in TAP coverage reporting

## Test Database Setup

### Isolated Test Environment
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:14
    environment:
      POSTGRES_DB: jobhunter_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
      - ./database/test-fixtures.sql:/docker-entrypoint-initdb.d/fixtures.sql
```

### Test Data Management
- **Automated Setup/Teardown**: Fresh database state for each test suite
- **Fixture Management**: Consistent test data across all test scenarios
- **Transaction Rollback**: Isolated test execution without side effects
- **Seed Data**: Realistic job, company, and user data for comprehensive testing

## Performance & Security Testing

### Performance Benchmarks
- **API Response Times**: <100ms for critical endpoints
- **Database Queries**: <50ms for standard operations
- **Content Generation**: <2 seconds for resume/cover letter creation
- **Job Filtering**: <100ms for multi-criteria evaluation
- **Load Testing**: 100+ concurrent users without degradation

### Security Testing
- **Authentication**: OAuth 2.0 flow validation and token security
- **Authorization**: Proper access controls and permission validation
- **Input Validation**: SQL injection and XSS prevention
- **Rate Limiting**: API abuse prevention and DDoS protection
- **Data Privacy**: PII handling and secure data transmission

## CI/CD Integration

### Automated Test Pipeline (TAP-Integrated)
```yaml
# .github/workflows/test.yml
name: Comprehensive TAP-Based Test Suite
on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      - name: Setup test database
        run: |
          psql -h localhost -U postgres -c "CREATE DATABASE jobhunter_test;"
          psql -h localhost -U postgres -d jobhunter_test < database/schema.sql
      - name: Run Rust unit tests
        run: cargo test --verbose
      - name: Run Rust integration tests
        run: cargo test --test '*' --verbose

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      - name: Run TAP tests with coverage
        working-directory: ./frontend
        run: |
          npm run test:coverage
          npm run test:reporter > tap-results.txt
      - name: Upload TAP results
        uses: actions/upload-artifact@v3
        with:
          name: tap-test-results
          path: frontend/tap-results.txt
      - name: Parse TAP results for GitHub
        run: |
          # Convert TAP output to GitHub Actions annotations
          cat frontend/tap-results.txt | grep -E "^(not )?ok" | while read line; do
            if [[ $line == "not ok"* ]]; then
              echo "::error::Test failed: $line"
            else
              echo "::notice::Test passed: $line"
            fi
          done

  database-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v3
      - name: Install pgTAP
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-14-pgtap
      - name: Setup test database
        run: |
          psql -h localhost -U postgres -c "CREATE DATABASE jobhunter_test;"
          psql -h localhost -U postgres -d jobhunter_test < database/schema.sql
      - name: Run pgTAP tests
        run: |
          pg_prove -h localhost -U postgres -d jobhunter_test test/database/*.sql

  integration-tests:
    needs: [backend-tests, frontend-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup full test environment
        run: docker-compose -f docker-compose.test.yml up -d
      - name: Run integration tests
        working-directory: ./frontend
        run: npm run test:integration
      - name: Generate TAP summary
        run: |
          echo "# Integration Test Summary" > integration-summary.md
          echo "TAP Version: 14" >> integration-summary.md
          echo "Test Results:" >> integration-summary.md
          cat frontend/tap-results.txt >> integration-summary.md
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('integration-summary.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## 🧪 TAP Test Results\n\n```\n' + summary + '\n```'
            });
```

### Quality Gates
- **95% Code Coverage**: Minimum threshold for all components
- **Zero Security Vulnerabilities**: Automated security scanning
- **Performance Regression**: <5% degradation tolerance
- **Test Success Rate**: 100% passing tests required for deployment

## Test Categories & Scenarios

### Unit Tests (40% of test suite)
- Individual function behavior validation
- Edge case and boundary condition testing
- Mock dependencies for isolated testing
- Pure function mathematical correctness

### Integration Tests (35% of test suite)
- API endpoint comprehensive testing
- Database interaction validation
- Service-to-service communication
- Third-party API integration testing

### End-to-End Tests (15% of test suite)
- Complete user workflow validation
- Multi-step process verification
- Cross-browser compatibility testing
- Real-world scenario simulation

### Performance Tests (10% of test suite)
- Load testing and stress testing
- Memory usage and leak detection
- Database query optimization validation
- Scalability and bottleneck identification

## Success Criteria

### Coverage Targets
- **Backend Rust Code**: 95%+ line coverage
- **Frontend TypeScript**: 90%+ line coverage
- **Database Schema**: 100% constraint validation
- **API Endpoints**: 100% endpoint testing
- **Critical Workflows**: 100% E2E coverage

### Performance Standards
- **API Response Time**: <100ms (95th percentile)
- **Database Queries**: <50ms average
- **Content Generation**: <2 seconds
- **Page Load Time**: <3 seconds first contentful paint
- **Memory Usage**: <512MB backend, <256MB frontend

### Quality Standards
- **Zero Critical Security Issues**
- **Zero High-Priority Bugs**
- **100% Accessibility Compliance** (WCAG 2.1 AA)
- **Cross-browser Compatibility** (Chrome, Firefox, Safari, Edge)
- **Mobile Responsiveness** (iOS/Android)

## Manual Frontend Testing Checklist

**Purpose**: This checklist provides a systematic procedure for QA testers and developers to manually verify frontend functionality until automated browser testing is implemented (Playwright). Once Playwright tests are complete, this checklist serves as the specification that automated tests implement.

**Browser Recommendation**: Use **Chrome** for manual testing to match the automated Playwright Chromium tests (ensures consistency between manual and automated validation).

**Prerequisites**:
- Backend server running on `http://localhost:8080`
- Frontend dev server running on `http://localhost:3000`
- Test database populated with sample job data
- Browser: **Chrome** (recommended), or Firefox/Safari/Edge for cross-browser validation

### Test Procedure

#### Setup & Initial Load
1. **Page Load Test**
   - [ ] Open `http://localhost:3000` in browser
   - [ ] Verify page loads within 3 seconds
   - [ ] Confirm no console errors in browser DevTools
   - [ ] Check that JobHunter Dashboard header is visible
   - [ ] Verify statistics cards display at top (New, Approved, Applied, Filtered counts)

2. **Network Connectivity Test**
   - [ ] Open browser Network tab (F12 → Network)
   - [ ] Refresh page
   - [ ] Verify `GET /api/jobs` request returns 200 OK
   - [ ] Verify `GET /api/criteria` request returns 200 OK
   - [ ] Verify `GET /api/jobs/stats` request returns 200 OK
   - [ ] Check that response times are <100ms for API calls

#### Tab Navigation & Filtering
3. **Tab Switching Test**
   - [ ] Click "Inbox" tab → Verify only jobs with status="new" are displayed
   - [ ] Click "Approved" tab → Verify only jobs with status="approved" are displayed
   - [ ] Click "Applied" tab → Verify only jobs with status="applied" are displayed
   - [ ] Click "Filtered" tab → Verify only jobs with status="filtered" are displayed
   - [ ] Click "All" tab → Verify all jobs are displayed regardless of status
   - [ ] Verify tab active state (blue background) changes correctly
   - [ ] Verify job count badges on tabs match displayed jobs

4. **Job Card Display Test**
   - [ ] Verify each job card displays: Title, Company, Salary (if available), Location, Source
   - [ ] Check salary badge color: Green if ≥$130K, Red if <$130K
   - [ ] Check location badge color: Blue for "Remote", Gray for other locations
   - [ ] Verify commute time badge shows correct color (Green ≤45min, Orange >45min)
   - [ ] For filtered jobs: Verify "Filtered Reasons" section displays in red box
   - [ ] Verify status icons appear correctly (AlertCircle for "new", CheckCircle for "approved", etc.)

#### Job Status Updates
5. **Approve/Reject Workflow Test**
   - [ ] Navigate to "Inbox" tab
   - [ ] Click "Approve" button on a job card
   - [ ] Verify job disappears from Inbox
   - [ ] Navigate to "Approved" tab
   - [ ] Verify job now appears in Approved tab
   - [ ] Navigate back to "Inbox" tab
   - [ ] Click "Reject" button on a different job card
   - [ ] Verify job disappears from Inbox
   - [ ] Check statistics cards update correctly (New count decreased, Approved/Rejected count increased)

6. **Status Update API Validation**
   - [ ] Open Network tab while approving/rejecting
   - [ ] Verify `PUT /api/jobs/{id}/status` request is sent
   - [ ] Verify request body contains correct status: "approved" or "rejected"
   - [ ] Verify response returns 200 OK
   - [ ] Verify job list refreshes automatically after status update

#### Content Generation
7. **Generate Resume & Cover Letter Test**
   - [ ] Navigate to "Approved" tab
   - [ ] Click "Generate Resume & Cover Letter" button on an approved job
   - [ ] Verify button changes to "Generating..." with disabled state
   - [ ] Wait for content generation (should complete within 2 seconds)
   - [ ] Verify modal appears with side-by-side resume and cover letter display
   - [ ] Check resume content displays in left panel with proper formatting
   - [ ] Check cover letter displays in right panel with job-specific personalization
   - [ ] Verify company name and job title appear in cover letter
   - [ ] Check for domain-specific keywords highlighted in resume (e.g., "Test Automation", "AI", "Firmware")

8. **Content Generation Modal Test**
   - [ ] Verify modal has close button (✕) in top-right corner
   - [ ] Click close button → Verify modal closes
   - [ ] Re-open modal by generating content again
   - [ ] Click outside modal (on dark overlay) → Verify modal closes
   - [ ] Verify modal is scrollable if content exceeds viewport height

#### Job Details View
9. **Job Details Modal Test**
   - [ ] Click on any job card (not on Approve/Reject buttons)
   - [ ] Verify job details modal opens
   - [ ] Check modal displays: Title, Company, Status badge, Salary, Location, Source
   - [ ] Verify job URL link is displayed and clickable (if available)
   - [ ] Verify job description displays (if available)
   - [ ] Verify "Date Collected" shows formatted date
   - [ ] Click close button (✕) → Verify modal closes
   - [ ] Re-open modal and click outside on overlay → Verify modal closes

10. **Job Details Action Buttons**
    - [ ] Open job details for a "new" status job
    - [ ] Verify "Approve" and "Reject" buttons appear at bottom
    - [ ] Click "Approve" → Verify modal closes and job moves to Approved tab
    - [ ] Open job details for an "approved" status job
    - [ ] Verify "Generate Resume & Cover Letter" button appears
    - [ ] Click button → Verify content generation modal opens

#### Statistics & Real-time Updates
11. **Statistics Display Test**
    - [ ] Verify statistics cards at top show correct counts:
      - New: Count of jobs with status="new"
      - Approved: Count of jobs with status="approved"
      - Applied: Count of jobs with status="applied"
      - Filtered: Count of jobs with status="filtered"
    - [ ] Perform status update (approve a job)
    - [ ] Verify statistics update immediately without page refresh

12. **Criteria Configuration Test**
    - [ ] Click "Configure Criteria" button (if available in UI)
    - [ ] Verify criteria modal/panel opens
    - [ ] Check current criteria displays: Min Salary ($130,000), Max Commute (45 min), Domains (Testing, AI, Firmware)
    - [ ] If editable: Modify a criterion and save
    - [ ] Verify `PUT /api/criteria` request is sent
    - [ ] Verify criteria updates reflected in job filtering logic

#### Filtered Jobs Display
13. **Filtered Jobs Validation Test**
    - [ ] Navigate to "Filtered" tab
    - [ ] Verify filtered jobs display with orange/red "Filter" icon
    - [ ] Check each filtered job shows "Filtered Reasons" section
    - [ ] Verify reasons are specific and accurate:
      - "Salary below minimum ($130,000)" for low-salary jobs
      - "Commute time exceeds 45 minutes" for long-commute jobs
      - "Domain does not match preferred domains" for non-matching jobs
    - [ ] Verify multiple reasons listed if job fails multiple criteria

#### Responsive Design & Layout
14. **Desktop Layout Test** (1920x1080)
    - [ ] Verify page layout uses full width appropriately
    - [ ] Check job cards display in grid or list format
    - [ ] Verify statistics cards display horizontally at top
    - [ ] Check modals are centered and properly sized
    - [ ] Verify no horizontal scrolling required

15. **Tablet Layout Test** (768px width)
    - [ ] Resize browser window to 768px width
    - [ ] Verify layout remains functional
    - [ ] Check job cards stack appropriately
    - [ ] Verify modals resize to fit screen
    - [ ] Check tab navigation remains accessible

16. **Mobile Layout Test** (375px width)
    - [ ] Resize browser window to 375px width
    - [ ] Verify all content is accessible without horizontal scroll
    - [ ] Check buttons are large enough for touch targets (minimum 44x44px)
    - [ ] Verify modals occupy full screen on mobile
    - [ ] Test tab navigation on mobile view

#### Error Handling & Edge Cases
17. **API Failure Simulation Test**
    - [ ] Stop backend server
    - [ ] Refresh frontend page
    - [ ] Verify graceful error handling (sample data displayed or error message)
    - [ ] Check console for error messages
    - [ ] Restart backend server
    - [ ] Verify page recovers and loads real data

18. **Empty State Test**
    - [ ] Clear all jobs from a specific status (e.g., empty Inbox)
    - [ ] Navigate to that tab
    - [ ] Verify appropriate empty state message displays
    - [ ] Check that page doesn't break with zero jobs

19. **Long Content Test**
    - [ ] Test job with very long title (>100 characters)
    - [ ] Verify title displays without breaking layout
    - [ ] Test job with very long description
    - [ ] Verify description is scrollable in modal
    - [ ] Test job with very long company name
    - [ ] Verify company name truncates or wraps appropriately

20. **Special Characters Test**
    - [ ] Test job with special characters in title (e.g., "Sr. Test Engineer & QA Lead (Remote)")
    - [ ] Verify special characters display correctly
    - [ ] Test job with Unicode characters (e.g., company name with accents)
    - [ ] Check that filtering and sorting work correctly

#### Performance & Browser Compatibility
21. **Performance Validation**
    - [ ] Open browser Performance tab (F12 → Performance)
    - [ ] Record page load
    - [ ] Verify First Contentful Paint <3 seconds
    - [ ] Check Time to Interactive <5 seconds
    - [ ] Verify no memory leaks during navigation between tabs
    - [ ] Monitor Network tab: Verify no unnecessary duplicate API calls

22. **Cross-browser Testing**
    - [ ] **Chrome**: Repeat critical tests (tab navigation, status updates, content generation)
    - [ ] **Firefox**: Repeat critical tests
    - [ ] **Safari**: Repeat critical tests (macOS/iOS)
    - [ ] **Edge**: Repeat critical tests
    - [ ] Document any browser-specific issues

#### Accessibility Testing
23. **Keyboard Navigation Test**
    - [ ] Use Tab key to navigate through page
    - [ ] Verify all interactive elements receive focus indicator
    - [ ] Press Enter on focused buttons → Verify actions trigger
    - [ ] Use Shift+Tab to navigate backwards
    - [ ] Verify modal traps focus (Tab cycles within modal)
    - [ ] Press Escape key on modal → Verify modal closes

24. **Screen Reader Test** (Optional but Recommended)
    - [ ] Enable VoiceOver (macOS) or NVDA/JAWS (Windows)
    - [ ] Navigate page with screen reader
    - [ ] Verify job cards announce title, company, and status
    - [ ] Check that buttons announce their purpose
    - [ ] Verify form inputs have appropriate labels

### Test Completion Checklist
- [ ] All tests passing in at least 2 major browsers
- [ ] No critical console errors observed
- [ ] All user workflows functional (view jobs, approve/reject, generate content)
- [ ] Performance targets met (<3s page load, <2s content generation)
- [ ] Responsive design verified on desktop, tablet, mobile
- [ ] Documented any issues found in test execution log

### Issue Reporting Format
When issues are found, document using this format:
```
Issue ID: FE-YYYYMMDD-###
Test Section: [Section number and name]
Browser: [Chrome/Firefox/Safari/Edge + version]
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
Expected Result: [What should happen]
Actual Result: [What actually happened]
Severity: [Critical/High/Medium/Low]
Screenshot: [Attach if applicable]
```

---

## Maintenance & Evolution

### Test Suite Maintenance
- **Weekly Test Review**: Identify flaky or outdated tests
- **Monthly Performance Baseline**: Update performance expectations
- **Quarterly Security Audit**: Review and update security test scenarios
- **Continuous Test Enhancement**: Add tests for new features and bug fixes

### Documentation Updates
- **Test Results Dashboard**: Live update of test status and metrics
- **Known Issues Tracking**: Document and track test failures and fixes
- **Performance Trending**: Historical performance data and analysis
- **Coverage Evolution**: Track coverage improvements over time

This comprehensive testing strategy ensures the JobHunter system maintains the highest standards of quality, performance, and reliability as it evolves from a manual job management tool to a fully autonomous job application platform.