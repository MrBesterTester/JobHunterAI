<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [JobHunter](#jobhunter)
  - [Overview](#overview)
  - [Tech Stack](#tech-stack)
  - [Quick Start](#quick-start)
    - [🚀 One-Command Startup (Easiest)](#-one-command-startup-easiest)
    - [📋 Initial Setup (First Time Only)](#-initial-setup-first-time-only)
  - [Job Criteria](#job-criteria)
  - [How It Works](#how-it-works)
  - [UI Overview](#ui-overview)
  - [Configuration](#configuration)
  - [Testing](#testing)
  - [Bug Tracking](#bug-tracking)
  - [Contributing](#contributing)
  - [License](#license)
  - [Contact](#contact)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# JobHunter

> **For Developers**: See [README_dev.md](README_dev.md) for technical documentation, API endpoints, testing procedures, and implementation details.

A workflow-driven job application management system to streamline your job search.

## Overview

JobHunter automates and streamlines your entire job search workflow. The system intelligently filters opportunities, prevents duplicates, and generates personalized application materials tailored to each role.

**Key Features:**
- **Automated Job Intake**: Gmail integration with intelligent email processing
- **Smart Job Filtering**: Automatically filters based on salary, location, and domain preferences
- **AI-Powered Content Generation**: Claude AI generates personalized resumes and cover letters
- **Gmail Draft Creation**: One-click email draft creation with attachments
- **Resume Management**: Upload and manage multiple resume versions
- **Real-time Dashboard**: Track job statuses with 8-tab interface covering the complete workflow
- **Deduplication**: Prevents processing duplicate job postings

## Tech Stack

- **Backend**: Rust (Actix-web)
- **Frontend**: TypeScript/React
- **Database**: PostgreSQL
- **AI**: Claude 3.5 Haiku (Anthropic)

## Quick Start

### 🚀 One-Command Startup (Easiest)

If you've already completed the initial setup, just run:

```bash
./start.sh
```

This will start PostgreSQL (if needed), the backend server (http://localhost:8080), and the frontend app (http://localhost:3000).

---

### 📋 Initial Setup (First Time Only)

**Prerequisites:**
- Rust (latest stable) - [Install from rustup.rs](https://rustup.rs/)
- Node.js 18+ and npm
- PostgreSQL 14+

**1. Database Setup**

```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create database
psql -d postgres
CREATE DATABASE jobhunter;
CREATE USER jobhunter_user WITH PASSWORD 'jobhunter_dev_password';
GRANT ALL PRIVILEGES ON DATABASE jobhunter TO jobhunter_user;
\q

# Run schema
psql -U jobhunter_user -d jobhunter -f database/schema.sql
```

**2. Backend Setup**

```bash
cd backend
cargo build
cargo run
```

Backend runs on http://localhost:8080

**3. Frontend Setup**

```bash
cd frontend
npm install
npm start
```

Frontend opens at http://localhost:3000

**4. Done! Use `./start.sh` for subsequent runs**

## Job Criteria

Configure your preferences (default criteria shown):
- **Minimum Salary**: $130,000
- **Domain**: Software/Firmware Testing, Test Automation, Generative AI
- **Location**: Remote preferred, or ≤45 min from Fremont, CA
- **Commute**: ≤3 days/week if required

## How It Works

1. **Automated Job Intake** - Jobs collected from Gmail, LinkedIn, Indeed, etc.
2. **Smart Filtering** - Automatically filters based on your criteria
3. **Review & Approve** - Review jobs in the Inbox tab and approve promising ones
4. **Generate Materials** - AI creates custom resume and cover letter for each job
5. **Create Gmail Draft** - One-click draft with cover letter and resume
6. **Track Applications** - Monitor status, schedule interviews, manage follow-ups

## UI Overview

The dashboard provides 8 tabs for complete workflow management:

- **📥 Intake**: Manage Gmail/LinkedIn/Indeed integrations with one-click OAuth
- **📋 Inbox**: Review and approve new jobs (both auto-approved and filtered)
- **✅ Approved**: Jobs approved for application
- **📤 Applied**: Track submitted applications
- **❌ Failed**: Jobs that couldn't be processed
- **⊕ Duplicates**: Duplicate job postings (automatically detected)
- **🔍 Filtered**: Jobs that didn't meet criteria (with reasons)
- **📊 All**: Complete job list with search and filtering

## Configuration

See [README_dev.md](README_dev.md) for:
- Gmail OAuth setup instructions
- Environment variable configuration
- Database management scripts
- API endpoint documentation

## Testing

JobHunter has comprehensive test coverage:
- **Backend**: 404 Rust unit tests (100% coverage)
- **Frontend**: Playwright E2E tests (94.1% coverage)

Run tests:
```bash
# Backend
cd backend && cargo test

# Frontend E2E
cd frontend && npm run test:e2e
```

## Bug Tracking

JobHunter uses a file-based bug tracking system optimized for LLM-assisted development. See the [bugs/](bugs/) directory:
- `bugs/open/` - Active bugs requiring attention
- `bugs/mitigated/` - Partially fixed bugs
- `bugs/fixed/` - Fully resolved bugs
- `bugs/README.md` - Auto-generated bug index

Report bugs by filing an issue in the appropriate directory using the template in `bugs/BUG-TEMPLATE.md`.

## Contributing

Contributions are welcome! Please:
1. Check the [bugs/](bugs/) directory for open issues
2. See [README_dev.md](README_dev.md) for development setup
3. Follow the existing code style
4. Add tests for new features
5. Update documentation as needed

## License

MIT License - See LICENSE file for details

## Contact

For questions or feedback, please file an issue in the [bugs/](bugs/) directory.

---

**Technical Documentation**: For detailed technical information, see [README_dev.md](README_dev.md)
