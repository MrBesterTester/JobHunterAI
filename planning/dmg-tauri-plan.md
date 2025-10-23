<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Tauri Desktop Application Implementation Plan](#tauri-desktop-application-implementation-plan)
  - [Overview: Why Tauri is Perfect for JobHunter](#overview-why-tauri-is-perfect-for-jobhunter)
    - [What is Tauri?](#what-is-tauri)
    - [Why Tauri Makes Sense Here](#why-tauri-makes-sense-here)
  - [Architecture Changes](#architecture-changes)
    - [Current Architecture (Web-based)](#current-architecture-web-based)
    - [Tauri Architecture (Desktop)](#tauri-architecture-desktop)
    - [Key Differences](#key-differences)
  - [Implementation Phases](#implementation-phases)
    - [Phase 0: Prerequisites (15 minutes)](#phase-0-prerequisites-15-minutes)
      - [Install Tauri CLI](#install-tauri-cli)
      - [Install macOS Development Dependencies](#install-macos-development-dependencies)
    - [Phase 1: Database Migration (PostgreSQL → SQLite) (2-3 hours)](#phase-1-database-migration-postgresql-%E2%86%92-sqlite-2-3-hours)
      - [Step 1.1: Create SQLite Schema](#step-11-create-sqlite-schema)
      - [Step 1.2: Update Cargo.toml Dependencies](#step-12-update-cargotoml-dependencies)
      - [Step 1.3: Update Backend Code for SQLite](#step-13-update-backend-code-for-sqlite)
      - [Step 1.4: Test SQLite Migration Locally](#step-14-test-sqlite-migration-locally)
    - [Phase 2: Tauri Setup (1-2 hours)](#phase-2-tauri-setup-1-2-hours)
      - [Step 2.1: Initialize Tauri in Your Project](#step-21-initialize-tauri-in-your-project)
      - [Step 2.2: Configure tauri.conf.json](#step-22-configure-tauriconfjson)
      - [Step 2.3: Integration Strategy Decision](#step-23-integration-strategy-decision)
    - [Phase 3: Frontend Integration (1 hour)](#phase-3-frontend-integration-1-hour)
      - [Step 3.1: Update Frontend API Base URL](#step-31-update-frontend-api-base-url)
      - [Step 3.2: Update API Calls](#step-32-update-api-calls)
      - [Step 3.3: Add Desktop-Specific Features (Optional)](#step-33-add-desktop-specific-features-optional)
    - [Phase 4: Database Path Configuration (30 minutes)](#phase-4-database-path-configuration-30-minutes)
      - [Step 4.1: Set Database Location](#step-41-set-database-location)
    - [Phase 5: Create App Icons (30 minutes)](#phase-5-create-app-icons-30-minutes)
      - [Step 5.1: Create Icon Source](#step-51-create-icon-source)
      - [Step 5.2: Generate All Required Sizes](#step-52-generate-all-required-sizes)
    - [Phase 6: Build & Test (1 hour)](#phase-6-build--test-1-hour)
      - [Step 6.1: Development Build](#step-61-development-build)
      - [Step 6.2: Production Build](#step-62-production-build)
      - [Step 6.3: Test DMG](#step-63-test-dmg)
    - [Phase 7: Code Signing & Notarization (Optional, 1-2 hours)](#phase-7-code-signing--notarization-optional-1-2-hours)
      - [Step 7.1: Get Developer Certificate](#step-71-get-developer-certificate)
      - [Step 7.2: Configure Signing in tauri.conf.json](#step-72-configure-signing-in-tauriconfjson)
      - [Step 7.3: Create Entitlements File](#step-73-create-entitlements-file)
      - [Step 7.4: Build Signed DMG](#step-74-build-signed-dmg)
  - [Distribution Options](#distribution-options)
    - [Option 1: GitHub Releases (Free)](#option-1-github-releases-free)
    - [Option 2: Personal Website](#option-2-personal-website)
    - [Option 3: Mac App Store (Advanced)](#option-3-mac-app-store-advanced)
  - [File Structure After Tauri Setup](#file-structure-after-tauri-setup)
  - [Testing Strategy](#testing-strategy)
    - [Unit Tests (Backend)](#unit-tests-backend)
    - [Integration Tests (Frontend)](#integration-tests-frontend)
    - [Manual Testing Checklist](#manual-testing-checklist)
  - [Benefits vs Tradeoffs](#benefits-vs-tradeoffs)
    - [Benefits of Desktop App](#benefits-of-desktop-app)
    - [Tradeoffs](#tradeoffs)
  - [Recommended Approach: Both Web & Desktop](#recommended-approach-both-web--desktop)
    - [Strategy: Support Both Distributions](#strategy-support-both-distributions)
  - [Timeline & Effort](#timeline--effort)
    - [Phase-by-Phase Estimates](#phase-by-phase-estimates)
  - [Decision Matrix: Should You Build Desktop Version?](#decision-matrix-should-you-build-desktop-version)
    - [Strong YES If:](#strong-yes-if)
    - [Maybe If:](#maybe-if)
    - [Probably NO If:](#probably-no-if)
  - [Recommended Next Steps](#recommended-next-steps)
    - [Path A: Desktop-First (You Use It Daily)](#path-a-desktop-first-you-use-it-daily)
    - [Path B: Web-First (Portfolio Showcase)](#path-b-web-first-portfolio-showcase)
    - [Path C: Both (Most Complete)](#path-c-both-most-complete)
  - [Success Criteria](#success-criteria)
    - [Minimum Viable Desktop App](#minimum-viable-desktop-app)
    - [Production-Ready Desktop App](#production-ready-desktop-app)
  - [Resources](#resources)
    - [Documentation](#documentation)
    - [Tools](#tools)
    - [Examples](#examples)
  - [Questions to Decide](#questions-to-decide)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Tauri Desktop Application Implementation Plan

**Date**: October 1, 2025
**Project**: JobHunter Desktop
**Goal**: Create a native macOS application (.app/.dmg) using Tauri

---

## Overview: Why Tauri is Perfect for JobHunter

### What is Tauri?

Tauri is a framework for building desktop applications using web technologies (React, TypeScript) for the frontend and Rust for the backend. Unlike Electron, it uses the system's native webview instead of bundling Chromium.

### Why Tauri Makes Sense Here

**Perfect Fit**:
- ✅ **Backend is Already Rust** - Minimal changes needed
- ✅ **Frontend is Already React** - Reuse 100% of existing UI
- ✅ **Lightweight** - ~3-5MB app vs ~50MB+ with Electron
- ✅ **Native Performance** - Uses system WebView (WebKit on macOS)
- ✅ **Single Binary** - No separate backend server needed
- ✅ **Cross-Platform** - Can build for macOS, Windows, Linux from same code

**What You Get**:
```
JobHunter.app (double-click to launch)
├── Embedded Rust backend
├── Embedded SQLite database
├── React frontend (bundled)
├── Native macOS menu bar
├── System tray integration
└── No installation dependencies
```

---

## Architecture Changes

### Current Architecture (Web-based)
```
┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐
│  React Frontend │ ◄─────► │   Rust Backend  │ ◄─────► │  PostgreSQL  │
│  (localhost:    │  HTTP   │  (Actix-web)    │   SQL   │  (External)  │
│   3000)         │         │  (localhost:    │         │              │
│                 │         │   8080)         │         │              │
└─────────────────┘         └─────────────────┘         └──────────────┘
    ↑
    User's Browser
```

### Tauri Architecture (Desktop)
```
┌────────────────────────────────────────────────────────┐
│  JobHunter.app (Native macOS Application)              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  React Frontend (Embedded WebView)               │  │
│  │  - Same UI code                                  │  │
│  │  - Uses tauri:// protocol instead of http://    │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │ IPC (Tauri Commands)               │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │  Rust Backend (Tauri Core)                      │  │
│  │  - Embedded HTTP server OR                      │  │
│  │  - Direct Tauri command handlers                │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │ SQLx                               │
│  ┌────────────────▼─────────────────────────────────┐  │
│  │  SQLite Database (Embedded)                      │  │
│  │  ~/Library/Application Support/JobHunter/db.db  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### Key Differences

| Aspect | Web Version | Tauri Desktop |
|--------|-------------|---------------|
| **Backend** | Actix-web HTTP server | Tauri IPC or embedded Actix |
| **Database** | PostgreSQL (external) | SQLite (embedded) |
| **Frontend** | Browser at localhost:3000 | System WebView (native) |
| **Distribution** | Server deployment | DMG installer |
| **Dependencies** | User installs Postgres | None - self-contained |
| **Updates** | Deploy to server | New DMG download or auto-update |

---

## Implementation Phases

### Phase 0: Prerequisites (15 minutes)

#### Install Tauri CLI

```bash
# Install Tauri CLI
cargo install tauri-cli

# Verify installation
cargo tauri --version
```

#### Install macOS Development Dependencies

```bash
# Install Xcode Command Line Tools (if not already)
xcode-select --install

# Verify you have:
# - Xcode Command Line Tools
# - Rust (already installed)
# - Node.js (already installed)
```

---

### Phase 1: Database Migration (PostgreSQL → SQLite) (2-3 hours)

#### Step 1.1: Create SQLite Schema

Create `database/schema-sqlite.sql`:

```sql
-- SQLite version of schema.sql
-- Key differences: UUID → TEXT, JSONB → TEXT, Arrays → TEXT (JSON)

-- Jobs table
CREATE TABLE jobs (
    job_id TEXT PRIMARY KEY,  -- UUID as TEXT
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    salary INTEGER,
    commute_time_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'approved', 'rejected', 'applied', 'filtered')),
    source TEXT NOT NULL,
    source_url TEXT,
    description TEXT,
    requirements TEXT,  -- JSON as TEXT
    benefits TEXT,      -- JSON as TEXT
    contact_info TEXT,  -- JSON as TEXT
    notes TEXT,
    filter_reason TEXT,
    content_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Job deduplication table
CREATE TABLE job_deduplication (
    dedup_id TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL UNIQUE,
    url_hash TEXT,
    first_job_id TEXT NOT NULL,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (first_job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

-- Resume versions table
CREATE TABLE resume_versions (
    version_id TEXT PRIMARY KEY,
    version_name TEXT NOT NULL,
    content TEXT NOT NULL,  -- Markdown content
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))  -- Boolean as INTEGER
);

-- Cover letter templates table
CREATE TABLE cover_letter_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_content TEXT NOT NULL,  -- Handlebars template
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))
);

-- Applications table
CREATE TABLE applications (
    application_id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    resume_version_id TEXT,
    cover_letter_content TEXT,
    application_status TEXT NOT NULL DEFAULT 'pending' CHECK(application_status IN ('pending', 'sent', 'accepted', 'rejected', 'withdrawn')),
    applied_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (resume_version_id) REFERENCES resume_versions(version_id) ON DELETE SET NULL
);

-- Communications table
CREATE TABLE communications (
    communication_id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    communication_type TEXT NOT NULL CHECK(communication_type IN ('email', 'phone', 'text', 'portal', 'other')),
    direction TEXT NOT NULL CHECK(direction IN ('incoming', 'outgoing')),
    subject TEXT,
    content TEXT,
    communication_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE
);

-- Job filtering criteria table
CREATE TABLE job_filtering_criteria (
    criteria_id TEXT PRIMARY KEY,
    min_salary INTEGER NOT NULL DEFAULT 130000,
    max_commute_minutes INTEGER NOT NULL DEFAULT 45,
    preferred_domains TEXT NOT NULL,  -- JSON array as TEXT
    preferred_locations TEXT NOT NULL,  -- JSON array as TEXT
    required_keywords TEXT,  -- JSON array as TEXT
    excluded_keywords TEXT,  -- JSON array as TEXT
    remote_preference TEXT NOT NULL DEFAULT 'strongly_preferred' CHECK(remote_preference IN ('required', 'strongly_preferred', 'nice_to_have', 'no_preference')),
    max_commute_days_per_week INTEGER DEFAULT 3,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_dedup_content_hash ON job_deduplication(content_hash);
CREATE INDEX idx_dedup_url_hash ON job_deduplication(url_hash);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(application_status);
CREATE INDEX idx_communications_app_id ON communications(application_id);

-- Triggers for updated_at (SQLite version)
CREATE TRIGGER update_jobs_timestamp
AFTER UPDATE ON jobs
BEGIN
    UPDATE jobs SET updated_at = datetime('now') WHERE job_id = NEW.job_id;
END;

CREATE TRIGGER update_applications_timestamp
AFTER UPDATE ON applications
BEGIN
    UPDATE applications SET updated_at = datetime('now') WHERE application_id = NEW.application_id;
END;

CREATE TRIGGER update_criteria_timestamp
AFTER UPDATE ON job_filtering_criteria
BEGIN
    UPDATE job_filtering_criteria SET updated_at = datetime('now') WHERE criteria_id = NEW.criteria_id;
END;

-- Insert default job filtering criteria
INSERT INTO job_filtering_criteria (
    criteria_id,
    min_salary,
    max_commute_minutes,
    preferred_domains,
    preferred_locations,
    remote_preference,
    max_commute_days_per_week
) VALUES (
    lower(hex(randomblob(16))),
    130000,
    45,
    '["Testing", "Test Automation", "QA", "Quality Engineering", "AI", "Generative AI", "LLM", "Firmware", "Embedded"]',
    '["Remote", "Fremont", "Hayward", "Newark", "Union City", "Milpitas", "Menlo Park"]',
    'strongly_preferred',
    3
);
```

#### Step 1.2: Update Cargo.toml Dependencies

```toml
[dependencies]
# Replace postgres features with sqlite
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "sqlite", "uuid", "chrono"] }

# Add for UUID generation in SQLite
uuid = { version = "1.0", features = ["v4", "serde"] }

# Rest stays the same
actix-web = "4.4"
actix-cors = "0.7"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.35", features = ["full"] }
dotenv = "0.15"
chrono = { version = "0.4", features = ["serde"] }
sha2 = "0.10"
handlebars = "5.1"
```

#### Step 1.3: Update Backend Code for SQLite

Key changes needed in `backend/src/main.rs`:

```rust
// Change connection pool setup
// OLD (PostgreSQL):
let pool = PgPoolOptions::new()
    .max_connections(5)
    .connect(&database_url)
    .await?;

// NEW (SQLite):
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};

let pool = SqlitePoolOptions::new()
    .max_connections(5)
    .connect(&database_url)  // e.g., "sqlite://./jobhunter.db"
    .await?;

// UUID handling changes:
// PostgreSQL has native UUID type, SQLite stores as TEXT
// OLD:
sqlx::query!("INSERT INTO jobs (job_id, ...) VALUES ($1, ...)", job_id, ...)

// NEW:
sqlx::query!("INSERT INTO jobs (job_id, ...) VALUES (?1, ...)", job_id.to_string(), ...)

// JSONB → JSON text handling:
// OLD:
sqlx::query!("SELECT requirements FROM jobs WHERE requirements @> $1", json_filter)

// NEW:
sqlx::query!("SELECT requirements FROM jobs WHERE json_extract(requirements, '$.key') = ?1", value)

// Date handling:
// OLD: PostgreSQL TIMESTAMP
// NEW: SQLite TEXT with datetime('now')
```

**Note**: You'll need to update all SQL queries to use SQLite syntax. This is the most time-consuming part.

#### Step 1.4: Test SQLite Migration Locally

```bash
# Set environment for SQLite
echo "DATABASE_URL=sqlite://./jobhunter.db" > backend/.env

# Run schema
sqlite3 jobhunter.db < database/schema-sqlite.sql

# Test backend with SQLite
cd backend
cargo run

# Verify API endpoints work
curl http://localhost:8080/api/jobs
```

---

### Phase 2: Tauri Setup (1-2 hours)

#### Step 2.1: Initialize Tauri in Your Project

```bash
cd /Users/sam/Projects/JobHuntAI

# Initialize Tauri (will ask questions)
cargo tauri init
```

**Answer prompts**:
- App name: `JobHunter`
- Window title: `JobHunter`
- Web assets location: `../frontend/build`
- Dev server URL: `http://localhost:3000`
- Frontend dev command: `cd frontend && npm start`
- Frontend build command: `cd frontend && npm run build`

This creates:
```
src-tauri/
├── Cargo.toml          # Tauri dependencies
├── tauri.conf.json     # Tauri configuration
├── build.rs            # Build script
├── icons/              # App icons
└── src/
    └── main.rs         # Tauri entry point
```

#### Step 2.2: Configure tauri.conf.json

Edit `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeDevCommand": "cd frontend && npm start",
    "beforeBuildCommand": "cd frontend && npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../frontend/build",
    "withGlobalTauri": false
  },
  "package": {
    "productName": "JobHunter",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "createDir": true,
        "scope": ["$APPDATA/*", "$APPLOCALDATA/*", "$APPLOG/*"]
      },
      "http": {
        "all": true,
        "request": true,
        "scope": ["http://localhost:8080/**"]
      }
    },
    "bundle": {
      "active": true,
      "category": "Productivity",
      "copyright": "Copyright (c) 2025 Samuel Kirk",
      "deb": {
        "depends": []
      },
      "externalBin": [],
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "identifier": "com.samkirk.jobhunter",
      "longDescription": "A comprehensive workflow-driven job application management system with automated filtering and content generation.",
      "macOS": {
        "entitlements": null,
        "exceptionDomain": "",
        "frameworks": [],
        "providerShortName": null,
        "signingIdentity": null
      },
      "resources": [],
      "shortDescription": "Job Application Management System",
      "targets": ["dmg"],
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    },
    "security": {
      "csp": null
    },
    "updater": {
      "active": false
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 900,
        "resizable": true,
        "title": "JobHunter",
        "width": 1400,
        "minWidth": 1000,
        "minHeight": 700
      }
    ]
  }
}
```

#### Step 2.3: Integration Strategy Decision

**Option A: Keep Actix-web (Easier)**

Keep your existing Actix backend running as an embedded HTTP server:

```rust
// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::thread;

fn main() {
    // Start Actix backend in separate thread
    thread::spawn(|| {
        actix_web::rt::System::new().block_on(async {
            // Your existing backend/src/main.rs code here
            start_backend_server().await
        })
    });

    // Start Tauri frontend
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Pros**: Minimal code changes, keep existing API
**Cons**: Slightly larger binary, extra thread

**Option B: Pure Tauri Commands (More Native)**

Replace HTTP endpoints with Tauri command handlers:

```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn get_jobs(state: tauri::State<'_, AppState>) -> Result<Vec<Job>, String> {
    // Your existing jobs logic, but as a Tauri command
    Ok(jobs)
}

fn main() {
    tauri::Builder::default()
        .manage(AppState { pool: init_db() })
        .invoke_handler(tauri::generate_handler![get_jobs, create_job, /* ... */])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Pros**: More efficient, smaller binary, truly native
**Cons**: Need to rewrite all API endpoints as Tauri commands

**Recommendation**: Start with **Option A** (keep Actix), migrate to Option B later if desired.

---

### Phase 3: Frontend Integration (1 hour)

#### Step 3.1: Update Frontend API Base URL

Create `frontend/src/config.ts`:

```typescript
// Detect if running in Tauri
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

export const isDesktop = !!window.__TAURI__;

export const API_BASE_URL = isDesktop
  ? 'http://localhost:8080/api'  // Embedded backend
  : process.env.REACT_APP_API_URL || 'http://localhost:8080/api';  // Web version

export const config = {
  apiBaseUrl: API_BASE_URL,
  isDesktop,
};
```

#### Step 3.2: Update API Calls

In `frontend/src/App.tsx`, replace hardcoded URLs:

```typescript
import { config } from './config';

// OLD:
const response = await fetch('http://localhost:8080/api/jobs');

// NEW:
const response = await fetch(`${config.apiBaseUrl}/jobs`);
```

#### Step 3.3: Add Desktop-Specific Features (Optional)

```typescript
import { isDesktop } from './config';

// Show different UI for desktop
{isDesktop && (
  <button onClick={() => window.__TAURI__.shell.open('https://github.com/...')}>
    Open GitHub
  </button>
)}

// Native notifications (desktop only)
if (isDesktop) {
  const { isPermissionGranted, requestPermission, sendNotification } = window.__TAURI__.notification;

  if (await isPermissionGranted()) {
    sendNotification({ title: 'New Job', body: 'Job added successfully!' });
  }
}
```

---

### Phase 4: Database Path Configuration (30 minutes)

#### Step 4.1: Set Database Location

For desktop apps, store database in user's application data directory:

```rust
// src-tauri/src/main.rs
use tauri::api::path::app_data_dir;
use std::fs;

fn get_database_path(config: &tauri::Config) -> String {
    let app_dir = app_data_dir(config)
        .expect("Failed to get app data directory");

    // Create directory if doesn't exist
    fs::create_dir_all(&app_dir).expect("Failed to create app directory");

    let db_path = app_dir.join("jobhunter.db");

    // Return as SQLite connection string
    format!("sqlite://{}", db_path.display())
}

#[tokio::main]
async fn main() {
    let context = tauri::generate_context!();
    let db_url = get_database_path(context.config());

    // Initialize database with schema if doesn't exist
    let pool = init_database(&db_url).await;

    // Start app...
}
```

**Database Location**:
- macOS: `~/Library/Application Support/com.samkirk.jobhunter/jobhunter.db`
- Windows: `C:\Users\{user}\AppData\Roaming\com.samkirk.jobhunter\jobhunter.db`
- Linux: `~/.local/share/com.samkirk.jobhunter/jobhunter.db`

---

### Phase 5: Create App Icons (30 minutes)

#### Step 5.1: Create Icon Source

Create a 1024x1024 PNG icon for JobHunter. You can:
- Design one yourself
- Use an icon generator
- Hire designer on Fiverr (~$10-20)

#### Step 5.2: Generate All Required Sizes

```bash
# Install icon generator
cargo install tauri-cli

# Generate icons from source (1024x1024 PNG)
cd src-tauri
cargo tauri icon path/to/your-icon-1024x1024.png
```

This generates:
```
src-tauri/icons/
├── 32x32.png
├── 128x128.png
├── 128x128@2x.png
├── icon.icns      # macOS
├── icon.ico       # Windows
└── icon.png
```

---

### Phase 6: Build & Test (1 hour)

#### Step 6.1: Development Build

```bash
# Run in development mode
cargo tauri dev
```

This will:
1. Start React dev server (frontend)
2. Start Rust backend
3. Open Tauri window
4. Enable hot-reload for both frontend and backend

**Test**:
- All features work
- Database saves correctly
- UI renders properly
- No console errors

#### Step 6.2: Production Build

```bash
# Build for production
cargo tauri build
```

**Build output**:
```
src-tauri/target/release/
└── bundle/
    └── dmg/
        └── JobHunter_1.0.0_x64.dmg  (~5-10MB)
```

#### Step 6.3: Test DMG

```bash
# Open DMG
open src-tauri/target/release/bundle/dmg/JobHunter_1.0.0_x64.dmg

# Install by dragging to Applications
# Test the installed app
open /Applications/JobHunter.app
```

**Test Checklist**:
- ✅ App launches without errors
- ✅ Database creates in correct location
- ✅ Can create, view, update jobs
- ✅ Content generation works
- ✅ All tabs and features functional
- ✅ App persists data between launches
- ✅ Performance is smooth

---

### Phase 7: Code Signing & Notarization (Optional, 1-2 hours)

**Required for**: Distribution without "unidentified developer" warnings

**Prerequisites**:
- Apple Developer Account ($99/year)
- Valid Developer ID Application certificate

#### Step 7.1: Get Developer Certificate

1. Join Apple Developer Program: https://developer.apple.com
2. Create certificates:
   - Developer ID Application (for distribution)
   - Developer ID Installer (optional)
3. Download and install in Keychain

#### Step 7.2: Configure Signing in tauri.conf.json

```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAMID)",
        "entitlements": "entitlements.plist",
        "providerShortName": "TEAMID"
      }
    }
  }
}
```

#### Step 7.3: Create Entitlements File

Create `src-tauri/entitlements.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
```

#### Step 7.4: Build Signed DMG

```bash
# Build with signing
cargo tauri build

# Notarize with Apple (required for macOS 10.15+)
xcrun notarytool submit \
  src-tauri/target/release/bundle/dmg/JobHunter_1.0.0_x64.dmg \
  --apple-id "your-apple-id@email.com" \
  --password "app-specific-password" \
  --team-id "TEAMID" \
  --wait

# Staple notarization ticket
xcrun stapler staple src-tauri/target/release/bundle/dmg/JobHunter_1.0.0_x64.dmg
```

**Result**: DMG that installs without warnings on any Mac

---

## Distribution Options

### Option 1: GitHub Releases (Free)

```bash
# Create release
gh release create v1.0.0 \
  src-tauri/target/release/bundle/dmg/JobHunter_1.0.0_x64.dmg \
  --title "JobHunter v1.0.0" \
  --notes "Initial release of JobHunter desktop application"
```

Users download from: `https://github.com/yourusername/JobHuntAI/releases`

### Option 2: Personal Website

Upload DMG to your website: `https://samkirk.com/downloads/jobhunter.dmg`

### Option 3: Mac App Store (Advanced)

Requires:
- Mac App Store distribution certificate
- App Store Connect setup
- App review process
- Sandboxing compliance

**Not recommended for first version**

---

## File Structure After Tauri Setup

```
JobHuntAI/
├── backend/                      # Original Rust backend (reference)
├── frontend/                     # React frontend (shared)
├── database/
│   ├── schema.sql               # PostgreSQL (web version)
│   └── schema-sqlite.sql        # SQLite (desktop version)
├── src-tauri/                   # NEW: Tauri desktop app
│   ├── Cargo.toml              # Tauri dependencies
│   ├── tauri.conf.json         # App configuration
│   ├── build.rs
│   ├── icons/                  # App icons
│   └── src/
│       ├── main.rs             # Tauri entry point
│       ├── db.rs               # Database handling
│       └── backend.rs          # Backend logic (or embedded Actix)
├── .github/
│   └── workflows/
│       ├── backend-tests.yml
│       ├── frontend-tests.yml
│       └── build-desktop.yml   # NEW: Build DMG on release
└── README.md
```

---

## Testing Strategy

### Unit Tests (Backend)

```bash
cd src-tauri
cargo test
```

Same backend tests, just with SQLite instead of PostgreSQL.

### Integration Tests (Frontend)

Playwright can test Tauri apps with some setup:

```typescript
// frontend/playwright.config.ts
export default {
  use: {
    // For Tauri testing
    launchOptions: {
      executablePath: '../src-tauri/target/release/JobHunter',
    }
  }
}
```

### Manual Testing Checklist

**Installation**:
- ✅ DMG opens cleanly
- ✅ Drag to Applications works
- ✅ App launches from Applications folder
- ✅ No security warnings (if signed)

**First Launch**:
- ✅ Database creates automatically
- ✅ Default criteria loads
- ✅ UI renders correctly
- ✅ No JavaScript errors

**Core Functionality**:
- ✅ Create job manually
- ✅ View all jobs
- ✅ Filter jobs by status
- ✅ Update job status (approve/reject)
- ✅ Generate resume & cover letter
- ✅ View filtered jobs with reasons
- ✅ Statistics update correctly

**Data Persistence**:
- ✅ Close and reopen app
- ✅ Jobs still present
- ✅ Settings preserved

**Performance**:
- ✅ Fast launch (<2 seconds)
- ✅ Smooth UI interactions
- ✅ No memory leaks over extended use

---

## Benefits vs Tradeoffs

### Benefits of Desktop App

**For You (Developer)**:
- ✅ No server hosting costs
- ✅ No database management
- ✅ Simpler deployment (just a file)
- ✅ Offline functionality
- ✅ Native OS integration
- ✅ One-click distribution

**For Users**:
- ✅ No installation dependencies
- ✅ Runs offline
- ✅ Fast (no network latency)
- ✅ Private (data stays local)
- ✅ Native look and feel

### Tradeoffs

**Limitations**:
- ❌ No multi-device sync (unless you add cloud backend)
- ❌ Manual updates (unless you add auto-updater)
- ❌ Platform-specific builds (macOS, Windows, Linux separate)
- ❌ Code signing cost ($99/year for macOS)
- ❌ Less impressive for portfolio (vs live web app)

**Complexity**:
- ⚠️ Database migration (PostgreSQL → SQLite)
- ⚠️ Query syntax changes
- ⚠️ Two codebases to maintain (web + desktop)
- ⚠️ Platform-specific testing

---

## Recommended Approach: Both Web & Desktop

### Strategy: Support Both Distributions

**Keep Both Versions**:
```
jobhunter-web/          # Original web version (PostgreSQL + Actix)
├── Deploy to server
└── Public portfolio showcase

jobhunter-desktop/      # Tauri desktop version (SQLite + embedded)
├── DMG distribution
└── Personal use
```

**Or: Single Codebase with Build Targets**:
```
JobHuntAI/
├── Shared frontend (React)
├── Shared backend logic (Rust)
├── Feature flags:
│   ├── --web → PostgreSQL + Actix server
│   └── --desktop → SQLite + Tauri bundle
```

---

## Timeline & Effort

### Phase-by-Phase Estimates

| Phase | Task | Time | Difficulty |
|-------|------|------|------------|
| 0 | Prerequisites | 15 min | Easy |
| 1 | Database migration (PostgreSQL → SQLite) | 2-3 hrs | Medium |
| 2 | Tauri setup | 1-2 hrs | Easy |
| 3 | Frontend integration | 1 hr | Easy |
| 4 | Database path config | 30 min | Easy |
| 5 | App icons | 30 min | Easy |
| 6 | Build & test | 1 hr | Medium |
| 7 | Code signing (optional) | 1-2 hrs | Hard |

**Total Time**:
- **Without code signing**: 6-9 hours
- **With code signing**: 7-11 hours

**Spread Over**: 2-3 coding sessions

---

## Decision Matrix: Should You Build Desktop Version?

### Strong YES If:
- ✅ You want to use JobHunter yourself daily (personal tool)
- ✅ You want offline functionality
- ✅ You want to avoid server hosting
- ✅ You want to learn Tauri/desktop development
- ✅ You want to distribute to friends/family

### Maybe If:
- ⚠️ You want both web and desktop versions
- ⚠️ You have time for database migration
- ⚠️ You're willing to pay for code signing ($99/year)

### Probably NO If:
- ❌ Primary goal is job hunting portfolio (web version better)
- ❌ You need multi-device access
- ❌ You want recruiters to test it online
- ❌ You prefer focusing on CI/CD and web deployment

---

## Recommended Next Steps

### Path A: Desktop-First (You Use It Daily)
1. ✅ Implement this Tauri plan (6-9 hours)
2. Build and use JobHunter.app for real job hunting
3. Later: Add CI/CD for automated desktop builds
4. Optional: Web version for portfolio

### Path B: Web-First (Portfolio Showcase)
1. ✅ Implement CI/CD plan first (1-2 hours)
2. Deploy web version to showcase
3. Use in browser for job hunting
4. Later: Add desktop version if desired

### Path C: Both (Most Complete)
1. Implement CI/CD for web version
2. Deploy to server for portfolio
3. Build desktop version for daily use
4. Maintain both versions

---

## Success Criteria

### Minimum Viable Desktop App
- ✅ Launches as native macOS app
- ✅ All core features work (jobs, applications, content generation)
- ✅ Data persists between sessions
- ✅ DMG installer works
- ✅ < 10MB app size

### Production-Ready Desktop App
- ✅ All MVP features
- ✅ Code signed and notarized (no warnings)
- ✅ Professional icon
- ✅ Auto-update capability
- ✅ Error reporting
- ✅ Comprehensive testing

---

## Resources

### Documentation
- Tauri Guide: https://tauri.app/v1/guides/
- Tauri API: https://tauri.app/v1/api/js/
- SQLite SQLx: https://docs.rs/sqlx/latest/sqlx/sqlite/
- macOS Code Signing: https://developer.apple.com/support/code-signing/

### Tools
- Tauri CLI: `cargo install tauri-cli`
- Icon Generator: https://tauri.app/v1/guides/features/icons/
- App Icon Template: https://github.com/tauri-apps/tauri/tree/dev/tooling/cli/templates/app-icon

### Examples
- Tauri Examples: https://github.com/tauri-apps/tauri/tree/dev/examples
- Tauri + React: https://github.com/tauri-apps/tauri/tree/dev/examples/api

---

## Questions to Decide

Before implementing, answer these:

1. **Primary Use Case**: Personal tool or portfolio showcase?
2. **Database**: Willing to migrate PostgreSQL → SQLite? (~3 hours)
3. **Code Signing**: Have Apple Developer account ($99/year)?
4. **Maintenance**: Want to maintain both web + desktop versions?
5. **Timeline**: Have 6-9 hours for initial implementation?

**Recommendation**:
- If primarily portfolio: **Do CI/CD web version first**
- If primarily personal tool: **Do Tauri desktop version**
- If both: **Do CI/CD first (quick), then Tauri (more involved)**

---

**Ready to implement?** Let me know if you want to proceed with Tauri, or if you'd prefer to focus on CI/CD web deployment first!

---

*Plan created: October 1, 2025*
*Based on: Tauri 1.5+ documentation and macOS distribution best practices*
