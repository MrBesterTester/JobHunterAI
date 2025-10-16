# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobHunter is a workflow-driven job application management system built to streamline job search processes. The application helps automatically collect, filter, and manage job opportunities based on specific criteria.

**Tech Stack:**
- Backend: Rust (Actix-web framework)
- Frontend: TypeScript/React with Create React App
- Database: PostgreSQL

## Developer Preferences

### Notifications
**IMPORTANT**: Always show dialog notifications when completing long-running tasks (>30 seconds).

**Command to use:**
```bash
osascript -e 'display dialog "[message]" with title "Claude Code" buttons {"OK"} default button "OK" with icon note'
```

**When to send notifications:**
- After running test suites (backend cargo test, E2E playwright tests)
- After build operations (cargo build, npm build)
- After extended operations that take >30 seconds
- When waiting for user input after completing a complex multi-step task

**Why dialog boxes instead of silent notifications:**
- More visible (appears front and center)
- Requires user acknowledgment
- Not affected by Focus mode or notification permissions
- Works reliably across all macOS versions

**Example usage:**
```bash
# After tests complete
osascript -e 'display dialog "Test suite completed:\n\n✅ Backend: 77/78 passing (98.7%)\n✅ E2E: +30 tests fixed\n\nAll changes committed to git." with title "Claude Code - Tests Complete" buttons {"OK"} default button "OK" with icon note'

# After build
osascript -e 'display dialog "Build completed successfully" with title "Claude Code" buttons {"OK"} default button "OK" with icon note'

# Ready for input
osascript -e 'display dialog "Task completed - ready for input" with title "Claude Code" buttons {"OK"} default button "OK" with icon note'
```

## Development Commands

### Database Setup
```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create database and user
psql -U postgres
CREATE DATABASE jobhunter;
CREATE USER jobhunter_user WITH PASSWORD 'jobhunter_dev_password';
GRANT ALL PRIVILEGES ON DATABASE jobhunter TO jobhunter_user;
\q

# Run schema
psql -U jobhunter_user -d jobhunter -f database/schema.sql
```

### Backend (Rust)
```bash
cd backend
cargo build          # Build the project
cargo run            # Run development server (http://localhost:8080)
cargo test            # Run tests
```

### Frontend (React/TypeScript)
```bash
cd frontend
npm install           # Install dependencies
npm start            # Development server (http://localhost:3000)
npm run build        # Production build
npm test             # Run tests
```

## Architecture

### Core Data Models
The system centers around three main entities:
- **Jobs**: Job postings collected from various sources with filtering criteria
- **Applications**: Job applications with resume/cover letter versions
- **Communications**: Tracking of all communication related to applications

### Database Schema Key Features
- UUID primary keys throughout
- PostgreSQL-specific features (JSONB, arrays, triggers)
- Automated `updated_at` timestamps
- Views for common queries (`pending_approval_jobs`, `application_stats`, `jobs_with_applications`)
- Deduplication system using content hashes

### Job Filtering Criteria
- Minimum salary: $130,000
- Domain focus: Software/Firmware Testing, Test Automation, Generative AI
- Location: Remote preferred, or ≤45 min from Fremont, CA
- Commute: ≤3 days/week if required

### Development Phases
1. **Phase 1 (Current)**: Core system with manual job entry
2. **Phase 2**: Gmail integration and automated filtering
3. **Phase 3**: Resume/cover letter generation with LLM integration
4. **Phase 4**: Job board integrations (LinkedIn, Indeed, Dice)
5. **Phase 5**: Advanced features (scheduling, analytics, mobile)

## File Structure
```
backend/src/main.rs    # Single Rust file with full backend implementation
frontend/src/App.tsx   # Main React application component
database/schema.sql    # PostgreSQL database schema
docs/PRD.md           # Product Requirements Document
```

## API Endpoints
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/{id}` - Get specific job
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/{id}/status` - Update job status
- `GET /api/jobs/status/{status}` - Get jobs by status
- `GET /api/applications` - List all applications
- `POST /api/applications` - Create new application