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
>
> **Project Status**: See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for current development phase, testing status, active issues, and project metrics.

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

> **Advanced Database Setup**: See [`README_database-setup.md`](README_database-setup.md) for instructions on setting up separate personal/dev databases, backup/restore procedures, and database switching scripts.

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

1. **Automated Job Intake & Processing** - Jobs collected and automatically filtered from email, LinkedIn, Indeed, etc.
2. **Multi-Criteria Job Scoring** - Intelligent 0-100 scoring across 7 weighted criteria for data-driven ranking
3. **Job Review & Approval** - Manual approval of jobs in unified Inbox (both auto-approved and auto-filtered)
4. **Resume & Cover Letter Generation** - Generate custom resume/cover letter for approved jobs
5. **Email Draft Creation** - One-click Gmail draft creation with cover letter body and resume attachment
6. **Application Tracking & Follow-ups** - Monitor application status, schedule interviews, and manage follow-ups

```mermaid
flowchart TD
    Start([Job Sources]) --> Sources

    subgraph Sources [" 1. Automated Job Intake "]
        Gmail[📧 Gmail] --> HTMLClean
        LinkedIn[💼 LinkedIn] --> HTMLClean
        Indeed[🔍 Indeed] --> HTMLClean
        Manual[✍️ Manual Entry] --> Extract
        HTMLClean[HTML Preprocessing<br/>Mozilla Readability] --> Extract
        Extract[LLM Extraction<br/>Title, Company, Salary, Location]
    end

    Extract --> Dedup{Deduplication<br/>SHA256 Hash}
    Dedup -->|Duplicate| Reject1[❌ Reject<br/>Already Exists]
    Dedup -->|New| Filter

    subgraph Filter [" 2. Intelligent Filtering "]
        Check[Check Criteria]
        Check --> Salary{Salary ≥ $100K?}
        Salary -->|Yes| Location{Remote or<br/>≤45min commute?}
        Salary -->|No| Filtered
        Location -->|Yes| Domain{Matches Domain?<br/>Testing/AI/Firmware}
        Location -->|No| Filtered
        Domain -->|Yes| New[✅ Status: New]
        Domain -->|No| Filtered[⚠️ Status: Filtered<br/>with Reasons]
    end

    New --> Score
    Filtered --> Score

    subgraph Scoring [" 3. Multi-Criteria Scoring "]
        Score[Calculate Job Score]
        Score --> Criteria[7 Weighted Criteria:<br/>💰 Compensation 30%<br/>🤝 Relationship 20%<br/>🏠 Remote Work 20%<br/>🎯 Domain Fit 15%<br/>⚡ Flexibility 10%<br/>🏥 Benefits 3%<br/>🏢 Industry 2%]
        Criteria --> Total[Total Score 0-100]
        Total --> Rank[Assign Rank<br/>vs. All Jobs]
    end

    Rank --> Inbox

    subgraph Review [" 4. Manual Review & Approval "]
        Inbox[📋 Inbox Tab<br/>Review All Jobs]
        Inbox --> Decision{User Decision}
        Decision -->|Approve| Approved[✅ Status: Approved]
        Decision -->|Reject| Reject2[❌ Status: Rejected]
    end

    Approved --> Generate

    subgraph Content [" 5. Content Generation "]
        Generate[Generate Resume &<br/>Cover Letter]
        Generate --> Customize[Domain-aware<br/>Customization]
        Customize --> Template[Handlebars<br/>Template Engine]
        Template --> Review2[Review Generated<br/>Content]
    end

    Review2 --> Draft

    subgraph Email [" 6. Email Draft Creation "]
        Draft[Create Gmail Draft]
        Draft --> MIME[MIME Message<br/>Construction]
        MIME --> Attach[Attach Resume PDF<br/>Base64 Encoded]
        Attach --> GmailAPI[Gmail API<br/>Create Draft]
        GmailAPI --> OpenGmail[📤 Open in Gmail]
    end

    OpenGmail --> Send{Send Email?}
    Send -->|Yes| Applied[✅ Status: Applied]
    Send -->|No| Wait[Wait for User]

    subgraph Tracking [" 7. Application Tracking & Follow-ups "]
        Applied --> Timeline[📊 Application Timeline]
        Timeline --> Interview[📅 Schedule Interviews]
        Interview --> Followup[📧 Automated Follow-ups]
        Followup --> Track[Track Response &<br/>Offer Status]
    end

    Track --> End([Complete])
    Reject1 --> End
    Reject2 --> End

    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style New fill:#d4edda
    style Filtered fill:#fff3cd
    style Approved fill:#d4edda
    style Applied fill:#d4edda
    style Reject1 fill:#f8d7da
    style Reject2 fill:#f8d7da
```

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
