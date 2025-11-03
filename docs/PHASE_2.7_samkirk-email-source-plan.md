<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Phase 2.7: Microsoft Email Source Integration (sam@samkirk.com)](#phase-27-microsoft-email-source-integration-samsamkirkcom)
  - [Phase Numbering Rationale](#phase-numbering-rationale)
  - [Executive Summary](#executive-summary)
  - [What is Microsoft Graph API? (And Why "Graph"?)](#what-is-microsoft-graph-api-and-why-graph)
    - [What It Is](#what-it-is)
    - [Why "Graph"?](#why-graph)
    - [What It Includes (Scope)](#what-it-includes-scope)
    - [What We're Using (Narrow Scope)](#what-were-using-narrow-scope)
    - [Comparison to Gmail API](#comparison-to-gmail-api)
  - [Background](#background)
  - [Objectives](#objectives)
  - [Challenges](#challenges)
    - [Challenge 1: Sparse Job Offers](#challenge-1-sparse-job-offers)
    - [Challenge 2: API Differences](#challenge-2-api-differences)
    - [Challenge 3: Email Format Variability](#challenge-3-email-format-variability)
  - [Microsoft Graph API vs Gmail API](#microsoft-graph-api-vs-gmail-api)
    - [Key Differences](#key-differences)
    - [Authentication Flow](#authentication-flow)
    - [API Endpoints](#api-endpoints)
  - [Proposed Architecture](#proposed-architecture)
    - [Option 1: Parallel Implementation (Recommended)](#option-1-parallel-implementation-recommended)
    - [Option 2: Unified Email Abstraction Layer](#option-2-unified-email-abstraction-layer)
  - [Implementation Plan](#implementation-plan)
    - [Phase 1: Microsoft Graph API Integration (Days 1-3)](#phase-1-microsoft-graph-api-integration-days-1-3)
    - [Phase 2: JobOps Folder Strategy (Days 4-5)](#phase-2-jobops-folder-strategy-days-4-5)
    - [Phase 3: Testing & Optimization (Days 6-7)](#phase-3-testing--optimization-days-6-7)
  - [JobOps Folder Strategy](#jobops-folder-strategy)
    - [Manual Curation Workflow](#manual-curation-workflow)
    - [Folder-Based Filtering](#folder-based-filtering)
  - [Database Schema Considerations](#database-schema-considerations)
  - [Frontend Changes](#frontend-changes)
  - [Success Metrics](#success-metrics)
  - [Risks & Mitigation](#risks--mitigation)
  - [Dependencies](#dependencies)
    - [New Crates](#new-crates)
    - [Environment Variables](#environment-variables)
    - [Microsoft Azure App Registration](#microsoft-azure-app-registration)
  - [Cost Considerations](#cost-considerations)
    - [API Usage Costs (All FREE! 🎉)](#api-usage-costs-all-free-)
    - [LLM Costs (The Only Real Cost!)](#llm-costs-the-only-real-cost)
    - [Total Additional Cost for Phase 2.7](#total-additional-cost-for-phase-27)
    - [Cost Comparison to Alternative Solutions](#cost-comparison-to-alternative-solutions)
  - [Timeline Estimate](#timeline-estimate)
  - [Testing Strategy](#testing-strategy)
    - [Unit Tests](#unit-tests)
    - [Integration Tests](#integration-tests)
    - [E2E Tests](#e2e-tests)
  - [Rollback Plan](#rollback-plan)
  - [Future Enhancements](#future-enhancements)
  - [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Phase 2.7: Microsoft Email Source Integration (sam@samkirk.com)

## Phase Numbering Rationale

**IMPORTANT**: This document is numbered as **Phase 2.7** to account for the expected resolution of **ISSUE-007** (Phase Documentation Naming Conflict).

**Context from ISSUE-007:**
- Phase 2.4, 5.2, and 5.3 are currently misnamed and should be sub-phases of Phase 2 (email/Gmail integration)
- When ISSUE-007 is resolved, the expected renaming will be:
  1. **Phase 2.4 (Calendar)** → **Phase 2.4**
  2. **Phase 2.5 (Email Composition)** → **Phase 2.5**
  3. **Phase 2.6 (LLM Extraction)** → **Phase 2.6**
  4. **Microsoft email (this document)** → **Phase 2.7**

This numbering ensures:
- No collision with future Phase 2.x numbering after ISSUE-007 resolution
- Semantic alignment: Microsoft email is an intake source (Phase 2), not a job board (Phase 4) or advanced feature (Phase 5)
- Clear sub-phase relationship to Phase 2 (Email Integration)

**Reference**: See `bugs/open/ISSUE-007-phase-documentation-naming-conflict.md` for full context.

---

## Executive Summary

This phase adds support for a **second email source** (`sam@samkirk.com`) using the **Microsoft Graph API**. This professional consulting inbox serves a different phase of the job search workflow than the existing Gmail integration.

**Business Purpose:**
- **Gmail** (MrBesterTester@gmail.com): High-volume prospecting and initial discovery
- **Microsoft** (sam@samkirk.com): Professional engagement once opportunities become serious
- **Integration Goal**: Track the complete lifecycle from prospecting through hiring

**Key Differences from Gmail Integration:**
- Uses Microsoft Graph API (OAuth 2.0) instead of Gmail API
- Lower volume but higher quality (business-critical communications)
- May require manual folder curation (JobOps folder) to separate job-related emails
- Requires separate authentication flow and token management

**Status**: Planning phase - implementation pending resolution of ISSUE-007 and completion of Phase 4.1.

---

## What is Microsoft Graph API? (And Why "Graph"?)

**TL;DR**: Microsoft Graph is just Microsoft's branding for their unified REST API gateway. We're only using the email portion—it's not more complex or "fancier" than Gmail API.

### What It Is
**Microsoft Graph** is Microsoft's unified REST API endpoint (`https://graph.microsoft.com`) that provides access to data across their entire Microsoft 365 cloud ecosystem. Think of it as a single gateway into all Microsoft cloud services.

### Why "Graph"?
The name comes from **graph theory** in mathematics—representing relationships between interconnected objects. Microsoft Graph treats your data as an **interconnected network**:
- **Nodes**: Users, emails, calendar events, files, groups, teams
- **Edges**: Relationships connecting them

For example, you can navigate: Email → Sender → Sender's calendar → Sender's team members. Everything is interconnected like a graph data structure, and you can traverse these relationships through the API.

### What It Includes (Scope)
Microsoft Graph provides access to:
- **Microsoft 365**: Outlook/Exchange (email), Calendar, Teams, SharePoint, OneDrive
- **Azure Active Directory**: User management, authentication
- **Enterprise Mobility + Security**: Intune, threat protection
- **Windows**: Device info, notifications, activities
- **Dynamics 365**, Partner Center, and more

### What We're Using (Narrow Scope)
**We only need the Mail API portion** (`/me/messages`, `/me/mailFolders`) to:
- Read emails from sam@samkirk.com inbox
- List folder structure
- Filter by folder (e.g., "JobOps" folder)
- Get message content (subject, sender, body)

**Key Takeaway**: Despite the broad scope of Microsoft Graph, we're using it the same way we use Gmail API—just for reading email messages. The "Graph" name simply reflects Microsoft's design philosophy for their entire cloud platform, but we can use it narrowly for email access without touching any other services.

### Comparison to Gmail API

| Aspect | Gmail API | Microsoft Graph API |
|--------|-----------|---------------------|
| **Purpose for JobHunter** | Read emails from MrBesterTester@gmail.com | Read emails from sam@samkirk.com |
| **Scope We Use** | Email only (`/gmail/v1/users/me/messages`) | Email only (`/me/messages`) |
| **Authentication** | Google OAuth 2.0 | Microsoft OAuth 2.0 (Azure AD) |
| **Full API Scope** | Gmail-specific features | Entire Microsoft 365 ecosystem |
| **Complexity for Our Use Case** | Simple (email read-only) | Simple (email read-only) |

Both APIs are straightforward for our email-reading use case. The difference is just authentication provider and message format.

---

## Background

**Current State:**
- Phase 2 (Gmail integration) successfully extracts job offers from Gmail inbox ✅
- Phase 2.6 (LLM-based extraction) provides robust job parsing ✅
- All email processing infrastructure exists for Gmail

**Business Need:**
- Secondary consulting inbox (`sam@samkirk.com`) also receives job opportunities
- These opportunities are currently not captured by JobHunter
- Manual processing is time-consuming and error-prone

**Business Relationship Between Email Accounts:**

The two email accounts serve different phases of the professional relationship lifecycle:

1. **MrBesterTester@gmail.com** (Gmail) - **Prospecting Phase**
   - Initial contact point for job opportunities
   - Receives high-volume job listings from recruiters, job boards, newsletters
   - Acts as the "public-facing" job search inbox
   - Lower signal-to-noise ratio (many irrelevant opportunities)
   - **Current Status**: ✅ Fully integrated with JobHunter

2. **sam@samkirk.com** (Microsoft) - **Professional Engagement Phase**
   - Used when opportunities become serious/qualified
   - Receives communication during:
     - Active consulting retainers
     - Employee onboarding processes
     - Serious job negotiations
     - Professional follow-ups
   - Higher signal-to-noise ratio (curated opportunities)
   - More business-critical communications
   - **Current Status**: ❌ Not integrated - requires manual tracking

**Workflow Pattern:**
- **Initial Discovery**: Jobs appear in MrBesterTester@gmail.com
- **Qualification**: Promising opportunities are moved/replied-to using sam@samkirk.com
- **Engagement**: Ongoing communication happens via sam@samkirk.com
- **Gap**: Once communication moves to sam@samkirk.com, JobHunter loses visibility

**Why This Integration Matters:**
- **Continuity**: Track the complete lifecycle from prospecting → engagement → hiring
- **Visibility**: Don't lose track of opportunities that "graduate" to sam@samkirk.com
- **Professionalism**: Keep business-critical communications separate from high-volume prospecting
- **Completeness**: Unified view of all active opportunities regardless of communication channel

**Strategic Context:**
- This is the **second and final** email source planned (per PRD Section 4.1)
- No additional email sources beyond Gmail and sam@samkirk.com are intended

---

## Objectives

1. **Add Microsoft email as intake source** without disrupting Gmail integration
2. **Reuse existing LLM extraction pipeline** (Phase 2.6) for job parsing
3. **Support folder-based filtering** (JobOps folder) for sparse job offers
4. **Maintain separate authentication** for Gmail and Microsoft accounts
5. **Provide unified job approval UI** regardless of source

---

## Challenges

### Challenge 1: Sparse Job Offers
**Problem**: The sam@samkirk.com inbox contains far fewer job offers than Gmail.

**Impact**:
- Most emails are not job-related
- Manual curation may be necessary
- Higher false-positive rate without folder filtering

**Proposed Solution**:
- Implement **folder-based filtering** (JobOps folder)
- User manually moves job emails to JobOps folder
- JobHunter only processes emails in JobOps folder
- Reduces noise and improves precision

### Challenge 2: API Differences
**Problem**: Microsoft Graph API has different authentication, rate limits, and data structures than Gmail API.

**Impact**:
- Separate OAuth flow required
- Different token refresh logic
- Different email metadata structure

**Proposed Solution**:
- Implement parallel Microsoft Graph client
- Abstract common operations behind trait interface
- Maintain separate token storage per provider

### Challenge 3: Email Format Variability
**Problem**: Job offers may be formatted differently than Gmail job offers.

**Impact**:
- LLM extraction prompts may need adjustment
- Different recruiter patterns

**Proposed Solution**:
- Leverage existing LLM-based extraction (Phase 2.6) which is format-agnostic
- Monitor extraction quality metrics separately per source
- Adjust prompts if needed based on empirical data

---

## Microsoft Graph API vs Gmail API

### Key Differences

| Feature | Gmail API | Microsoft Graph API |
|---------|-----------|---------------------|
| **Authentication** | Google OAuth 2.0 | Microsoft OAuth 2.0 (Azure AD) |
| **Base URL** | `https://gmail.googleapis.com/gmail/v1` | `https://graph.microsoft.com/v1.0` |
| **List Messages** | `/users/me/messages` | `/me/messages` or `/me/mailFolders/{id}/messages` |
| **Get Message** | `/users/me/messages/{id}` | `/me/messages/{id}` |
| **Message Body** | `payload.parts[].body.data` (base64) | `body.content` (HTML/text) |
| **Folders** | Labels (multi-assignment) | Folders (single parent) |
| **Rate Limits** | 250 quota units/user/second | 10,000 requests/app/10 minutes |
| **Scopes** | `https://www.googleapis.com/auth/gmail.readonly` | `Mail.Read`, `Mail.ReadWrite` |

### Authentication Flow

**Microsoft OAuth 2.0 (Azure AD):**
1. Register app in Azure Portal (get Client ID + Client Secret)
2. Request authorization: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
3. User consents to `Mail.Read` scope
4. Exchange code for access token + refresh token
5. Store tokens in database (separate from Gmail tokens)
6. Refresh tokens expire after 90 days (vs Gmail which can last indefinitely)

**Token Storage:**
```sql
-- New table or extend existing email_accounts table
CREATE TABLE email_accounts (
  account_id UUID PRIMARY KEY,
  email_address TEXT NOT NULL,
  provider TEXT NOT NULL,  -- 'gmail' or 'microsoft'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

**List messages in folder:**
```
GET https://graph.microsoft.com/v1.0/me/mailFolders/{folderId}/messages
  ?$select=id,subject,from,receivedDateTime,bodyPreview
  &$filter=receivedDateTime ge {date}
  &$orderby=receivedDateTime desc
  &$top=50
```

**Get message content:**
```
GET https://graph.microsoft.com/v1.0/me/messages/{messageId}
  ?$select=id,subject,from,receivedDateTime,body,toRecipients
```

**List folders:**
```
GET https://graph.microsoft.com/v1.0/me/mailFolders
  ?$select=id,displayName,childFolderCount
```

---

## Proposed Architecture

### Option 1: Parallel Implementation (Recommended)

**Approach**: Implement separate Microsoft Graph client alongside existing Gmail client.

**Structure:**
```rust
// backend/src/email_providers/mod.rs
pub mod gmail;
pub mod microsoft;

pub trait EmailProvider {
    async fn authenticate(&self, auth_code: String) -> Result<TokenSet>;
    async fn refresh_token(&self, refresh_token: String) -> Result<TokenSet>;
    async fn list_messages(&self, folder: Option<String>, since: DateTime) -> Result<Vec<EmailMessage>>;
    async fn get_message(&self, message_id: String) -> Result<EmailMessage>;
    async fn list_folders(&self) -> Result<Vec<EmailFolder>>;
}

pub struct GmailProvider { /* existing */ }
pub struct MicrosoftProvider { /* new */ }

impl EmailProvider for GmailProvider { /* existing */ }
impl EmailProvider for MicrosoftProvider { /* new */ }
```

**Pros:**
- Clear separation of concerns
- Easy to maintain separate API logic
- No disruption to existing Gmail integration
- Can deploy incrementally

**Cons:**
- Some code duplication (OAuth flows, token refresh)
- Two separate token management systems

### Option 2: Unified Email Abstraction Layer

**Approach**: Create abstract email service that hides provider differences.

**Structure:**
```rust
pub struct EmailService {
    providers: HashMap<EmailProvider, Box<dyn EmailClient>>,
}

impl EmailService {
    pub async fn fetch_jobs_from_all_sources(&self) -> Result<Vec<Job>> {
        let mut jobs = Vec::new();

        for provider in self.providers.values() {
            let messages = provider.list_messages(None, last_sync).await?;
            for msg in messages {
                jobs.extend(self.extract_jobs(msg).await?);
            }
        }

        Ok(jobs)
    }
}
```

**Pros:**
- Single interface for all email sources
- Easier to add future email providers (unlikely)
- Centralized job extraction logic

**Cons:**
- More complex abstraction
- Higher upfront implementation cost
- May not be needed (only 2 email sources planned)

**Recommendation**: **Option 1** (Parallel Implementation) - simpler, clearer, and sufficient for 2 email sources.

---

## Implementation Plan

### Phase 1: Microsoft Graph API Integration (Days 1-3)

**Tasks:**
1. ✅ **Azure App Registration**
   - Create Azure AD app registration
   - Configure OAuth redirect URI
   - Note Client ID and Client Secret
   - Set required API permissions: `Mail.Read`, `Mail.ReadWrite`

2. ✅ **Backend: Microsoft Graph Client**
   - Create `backend/src/email_providers/microsoft.rs`
   - Implement OAuth 2.0 authorization flow
   - Implement token refresh logic
   - Implement message listing and retrieval
   - Add folder listing support

3. ✅ **Database: Email Account Storage**
   - Extend `email_accounts` table (or create new)
   - Add `provider` enum column ('gmail', 'microsoft')
   - Store separate tokens per provider
   - Add migration script

4. ✅ **Backend: API Endpoints**
   - `GET /api/email/microsoft/auth-url` - Get OAuth URL
   - `POST /api/email/microsoft/callback` - Handle OAuth callback
   - `GET /api/email/microsoft/folders` - List folders
   - `POST /api/email/microsoft/sync` - Trigger email sync
   - `GET /api/email/microsoft/status` - Check connection status

5. ✅ **Testing**
   - Unit tests for Microsoft Graph client
   - Integration tests with test Microsoft account
   - Token refresh flow testing

**Deliverables:**
- Working Microsoft Graph API integration
- Separate authentication for sam@samkirk.com
- Ability to list and retrieve messages

### Phase 2: JobOps Folder Strategy (Days 4-5)

**Tasks:**
1. ✅ **Folder-based filtering**
   - Add folder selection to email account config
   - UI for user to select "JobOps" folder
   - Filter email sync to only process selected folder

2. ✅ **Manual curation workflow**
   - Document process for moving emails to JobOps
   - Add UI guidance/tooltips
   - Add folder statistics (email count, last sync)

3. ✅ **Fallback strategy**
   - Support "all emails" mode if no folder selected
   - Add warning about high false-positive rate
   - Allow switching between folder modes

**Deliverables:**
- Folder-based email filtering
- UI for folder selection
- Documentation for manual curation workflow

### Phase 3: Testing & Optimization (Days 6-7)

**Tasks:**
1. ✅ **End-to-end testing**
   - Test complete flow: Auth → Sync → Extract → Approve
   - Test with real sam@samkirk.com emails
   - Verify LLM extraction quality

2. ✅ **Performance testing**
   - Measure sync time for typical inbox
   - Test token refresh under load
   - Verify rate limit handling

3. ✅ **UI polish**
   - Add source indicator badges (Gmail vs Microsoft)
   - Show sync status per email account
   - Add error handling and user feedback

**Deliverables:**
- Comprehensive test coverage
- Performance benchmarks
- Polished user experience

---

## JobOps Folder Strategy

### Manual Curation Workflow

**User Process:**
1. User reviews sam@samkirk.com inbox periodically (weekly/daily)
2. User manually moves job-related emails to **JobOps** folder
3. JobHunter syncs only from JobOps folder
4. LLM extracts job details from curated emails
5. User approves/rejects jobs in JobHunter UI

**Benefits:**
- Higher precision (fewer false positives)
- Lower LLM API costs (fewer emails to process)
- User maintains control over what's processed
- Reduces noise from non-job emails

**Trade-offs:**
- Requires manual email curation
- Slight delay (user must move emails first)
- Risk of forgetting to move emails

### Folder-Based Filtering

**Configuration Storage:**
```rust
pub struct EmailAccount {
    pub account_id: Uuid,
    pub email_address: String,
    pub provider: EmailProvider,
    pub folder_filter: Option<String>,  // "JobOps" or None for all
    pub access_token: String,
    pub refresh_token: Option<String>,
    // ...
}
```

**Sync Logic:**
```rust
async fn sync_microsoft_email(&self, account: &EmailAccount) -> Result<Vec<EmailMessage>> {
    let folder_id = match &account.folder_filter {
        Some(folder_name) => {
            // Look up folder ID by name
            self.microsoft_client.find_folder_by_name(folder_name).await?
        }
        None => {
            // Use inbox folder
            "inbox".to_string()
        }
    };

    self.microsoft_client.list_messages(Some(folder_id), last_sync_date).await
}
```

**UI Implementation:**
- Dropdown to select folder during account setup
- "All emails" vs "Specific folder" toggle
- Folder browser to pick JobOps folder
- Warning badge if "All emails" mode is selected

---

## Database Schema Considerations

**Option A: Extend Existing `jobs` Table** (Recommended)
- Add `source_provider` column ('gmail', 'microsoft', 'manual', 'linkedin', etc.)
- Keep existing `source` column for original email/message ID
- No schema migration needed

**Option B: New `email_sources` Table**
- Create separate table to track email account metadata
- Link jobs to email source via foreign key
- More normalized but adds complexity

**Recommendation**: **Option A** - simpler and sufficient.

**Migration:**
```sql
-- Add provider column to jobs table
ALTER TABLE jobs
ADD COLUMN source_provider TEXT DEFAULT 'gmail';

-- Backfill existing jobs
UPDATE jobs
SET source_provider = 'gmail'
WHERE source LIKE '%gmail%' OR source LIKE '%@%';

-- Add index for filtering
CREATE INDEX idx_jobs_source_provider ON jobs(source_provider);
```

---

## Frontend Changes

**Email Account Management UI:**
- List of connected email accounts (Gmail, Microsoft)
- "Connect Microsoft Account" button
- Per-account status indicators:
  - ✅ Connected
  - 🔄 Syncing
  - ❌ Authentication expired
  - 📁 Folder: JobOps (5 emails)
- "Sync Now" button per account
- "Configure Folder" link to select JobOps

**Job List UI:**
- Add source badge to each job card:
  - 📧 Gmail
  - 🟦 Microsoft
  - 🌐 LinkedIn (future)
- Filter jobs by source provider
- Show "Last synced" timestamp per provider

**Settings UI:**
- Email Accounts section
- Per-account folder configuration
- Token refresh status
- Sync frequency settings

---

## Success Metrics

**Primary Metrics:**
- ✅ Successful authentication for sam@samkirk.com
- ✅ Emails retrieved from Microsoft Graph API
- ✅ Jobs extracted from Microsoft emails
- ✅ Folder filtering works correctly

**Quality Metrics:**
- False positive rate: <5% (emails processed that aren't jobs)
- Extraction accuracy: >90% (job details correct)
- Sync reliability: >99% (no dropped emails)

**Performance Metrics:**
- Sync time: <5 seconds for 50 emails
- Token refresh: <2 seconds
- API error rate: <1%

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Microsoft API rate limits** | Sync failures | Medium | Implement exponential backoff, batch requests |
| **Token expiry (90 days)** | Auth failures | High | Proactive refresh warnings, re-auth flow |
| **Folder structure changes** | Sync failures | Low | Graceful degradation, folder re-selection UI |
| **Sparse job emails** | Low value | High | Folder-based filtering, manual curation |
| **Different email formats** | Extraction failures | Medium | LLM-based extraction is format-agnostic |
| **Azure AD policy changes** | Auth failures | Low | Monitor Microsoft Graph API changelog |

---

## Dependencies

### New Crates

```toml
# Cargo.toml additions
[dependencies]
# Microsoft Graph API client
reqwest = { version = "0.11", features = ["json"] }
oauth2 = "4.4"  # OAuth 2.0 client (if not already present)

# Existing crates (verify compatibility)
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = { version = "0.4", features = ["serde"] }
```

### Environment Variables

```bash
# .env additions
# Microsoft Azure App Registration
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_REDIRECT_URI=http://localhost:8080/api/email/microsoft/callback

# Optional: Azure tenant ID (use 'common' for personal accounts)
MICROSOFT_TENANT_ID=common
```

### Microsoft Azure App Registration

**Required Setup:**
1. Go to Azure Portal → Azure Active Directory → App Registrations
2. Create new registration:
   - Name: "JobHunter Email Integration"
   - Supported account types: "Personal Microsoft accounts only"
   - Redirect URI: `http://localhost:8080/api/email/microsoft/callback`
3. Note Application (client) ID
4. Create client secret in "Certificates & secrets"
5. Add API permissions:
   - Microsoft Graph → Delegated permissions
   - ✅ Mail.Read
   - ✅ Mail.ReadWrite (for mark-as-read functionality)
   - ✅ MailboxSettings.Read (for folder access)
6. Grant admin consent (if required)

---

## Cost Considerations

### API Usage Costs (All FREE! 🎉)

**Microsoft Graph API (Mail):**
- ✅ **FREE**: Outlook mail REST API is currently free (confirmed by Microsoft)
- ✅ **Rate Limit**: 10,000 requests per 10 minutes per application
- ✅ **No per-request charges** for basic Mail API operations
- ✅ **No Azure subscription required** for personal Microsoft accounts
- ✅ **No overage charges** - only rate-limited if exceeded

**Gmail API (Current Integration):**
- ✅ **FREE**: Completely free within generous quotas
- ✅ **Rate Limit**: 1.2M quota units/minute per project, 15K/minute per user
- ✅ **No billing even if quotas exceeded** - only rate-limited temporarily
- ✅ **Official**: "All use of Gmail API is available at no additional cost"

**Google Calendar API (Current Integration):**
- ✅ **FREE**: Completely free, no charges
- ✅ **Official**: "All use of the Google Calendar API is available at no additional cost"
- ✅ **No overage charges** - rate-limited but never billed

### LLM Costs (The Only Real Cost!)

**Anthropic Claude Haiku (Phase 2.6 - Job Extraction):**
- **Current cost**: ~$3-5/month for 100 emails (Gmail)
- **Additional cost**: Similar for sam@samkirk.com emails
- **Potential savings**: Lower volume expected in sam@samkirk.com (higher signal-to-noise)
- **Folder filtering**: JobOps folder strategy further reduces LLM API calls
- **Estimated additional cost**: **$1-3/month** (fewer emails to process)

**Anthropic Claude Haiku (Phase 3.1 - Content Generation):**
- **Per application**: ~$0.25 per resume/cover letter generation
- **This cost exists regardless** of email source (Gmail or Microsoft)

### Total Additional Cost for Phase 2.7

**API costs**: **$0** (all email/calendar APIs are free)
**LLM costs**: **$1-3/month** (job extraction from sam@samkirk.com emails)
**Total**: **$1-3/month additional** (only if processing many emails)

### Cost Comparison to Alternative Solutions

| Solution | Monthly Cost | Notes |
|----------|--------------|-------|
| **JobHunter (Phase 2.7)** | **$1-3/month** | Only LLM costs, all APIs free |
| Manual email processing | $0 | Time cost: ~2-5 hours/month |
| Third-party job trackers | $10-50/month | Subscription fees |
| Email parsing services | $20-100/month | Per-email processing fees |

**Key Insight**: The real cost is LLM usage for intelligent job extraction, not API access. Phase 2.7 adds minimal additional cost (~$1-3/month) while providing complete lifecycle tracking from prospecting to professional engagement.

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: API Integration | 3 days | Azure app registration |
| Phase 2: Folder Strategy | 2 days | Phase 1 complete |
| Phase 3: Testing | 2 days | Phase 2 complete |
| **Total** | **~7 days** | |

**Assumptions:**
- Developer familiar with OAuth 2.0 flows
- Azure app registration completed before Phase 1
- Test Microsoft account available
- No major API issues

---

## Testing Strategy

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_microsoft_auth_flow() {
        // Test OAuth URL generation
        // Test token exchange
        // Test token refresh
    }

    #[tokio::test]
    async fn test_list_messages_with_folder_filter() {
        // Test message listing with folder ID
        // Test pagination
        // Test date filtering
    }

    #[tokio::test]
    async fn test_get_message_content() {
        // Test message retrieval
        // Test HTML parsing
        // Test attachment handling (future)
    }
}
```

### Integration Tests
- Real Microsoft account with test emails
- OAuth flow end-to-end
- Folder listing and selection
- Email sync with LLM extraction

### E2E Tests
- Full user journey: Connect → Sync → Extract → Approve
- Error handling (expired tokens, rate limits)
- UI feedback and status updates

---

## Rollback Plan

**If integration fails or causes issues:**

1. **Disable Microsoft sync**:
   - Add feature flag: `ENABLE_MICROSOFT_EMAIL=false`
   - Gracefully skip Microsoft provider in sync loop
   - Gmail continues to work normally

2. **Database rollback**:
   - Migration script to revert schema changes
   - Mark Microsoft-sourced jobs with `archived=true`
   - No data loss (jobs remain in database)

3. **Frontend rollback**:
   - Hide Microsoft account UI components
   - Remove source badge filtering for Microsoft
   - Gmail-only mode

**Rollback time**: <1 hour

---

## Future Enhancements

**Phase 2.7.1: Automatic Folder Detection** (Optional)
- Heuristics to detect job-related folders automatically
- ML-based folder suggestion
- Automatic folder creation

**Phase 2.7.2: Email Rules Integration** (Optional)
- Leverage existing Outlook rules
- Sync rule-based categorization
- Bi-directional sync (mark as read, apply labels)

**Phase 2.7.3: Multi-Account Support** (Optional)
- Support multiple Microsoft accounts
- Support multiple Gmail accounts
- Account switching UI

---

## References

- **Microsoft Graph API Documentation**: https://docs.microsoft.com/en-us/graph/api/resources/mail-api-overview
- **OAuth 2.0 Flow for Microsoft**: https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
- **PRD Section 4.1 (Intake Sources)**: `docs/PRD.md`
- **Phase 2.6 (LLM Extraction)**: `docs/PHASE_2.6_llm-job-extraction.md`
- **ISSUE-007 (Naming Conflict)**: `bugs/open/ISSUE-007-phase-documentation-naming-conflict.md`
- **Existing Gmail Integration**: `backend/src/main.rs` (Gmail API client)

---

**Status**: ⏸️ **Planning Complete - Awaiting ISSUE-007 Resolution & Phase 4.1 Completion**

**Next Steps**:
1. Resolve ISSUE-007 (phase documentation renaming)
2. Complete Phase 4.1 (RapidAPI job boards)
3. Review and approve this plan
4. Create Azure app registration
5. Begin Phase 2.7 implementation
