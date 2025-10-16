<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Product Requirements Document (PRD)](#product-requirements-document-prd)
  - [Table of Contents](#table-of-contents)
  - [1. Overview](#1-overview)
  - [2. Goals & Objectives](#2-goals--objectives)
  - [3. Job Criteria](#3-job-criteria)
    - [3.1 Job Domain & Technical Focus](#31-job-domain--technical-focus)
    - [3.2 Compensation Structure](#32-compensation-structure)
    - [3.3 Employment Relationship](#33-employment-relationship)
    - [3.4 Work Location & Remote Policy](#34-work-location--remote-policy)
    - [3.5 Commute Considerations (for hybrid/onsite roles)](#35-commute-considerations-for-hybridonsite-roles)
    - [3.6 Job Evaluation Framework](#36-job-evaluation-framework)
  - [4. Workflow](#4-workflow)
    - [4.1 Intake Sources](#41-intake-sources)
    - [4.2 Processing Pipeline](#42-processing-pipeline)
    - [4.3 Resume & Cover Letter Generation](#43-resume--cover-letter-generation)
    - [4.4 Email Composition & Sending](#44-email-composition--sending)
    - [4.5 Application & Tracking](#45-application--tracking)
  - [5. Database Schema](#5-database-schema)
  - [6. User Interface](#6-user-interface)
    - [6.1 Dashboard (Frontend: TypeScript)](#61-dashboard-frontend-typescript)
  - [7. Technical Implementation](#7-technical-implementation)
    - [7.1 Frontend](#71-frontend)
    - [7.2 Backend](#72-backend)
    - [7.3 Database](#73-database)
  - [8. Success Metrics](#8-success-metrics)
  - [9. Risks & Mitigations](#9-risks--mitigations)
  - [10. Next Steps](#10-next-steps)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Product Requirements Document (PRD)
**Project Name:** JobHunter
**Prepared by:** Sam Kirk
**Date:** 2025-09-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Objectives](#2-goals--objectives)
3. [Job Criteria](#3-job-criteria)
   - [3.1 Job Domain & Technical Focus](#31-job-domain--technical-focus)
   - [3.2 Compensation Structure](#32-compensation-structure)
   - [3.3 Employment Relationship](#33-employment-relationship)
   - [3.4 Work Location & Remote Policy](#34-work-location--remote-policy)
   - [3.5 Commute Considerations](#35-commute-considerations-for-hybridonsite-roles)
   - [3.6 Job Evaluation Framework](#36-job-evaluation-framework)
4. [Workflow](#4-workflow)
   - [4.1 Intake Sources](#41-intake-sources)
   - [4.2 Processing Pipeline](#42-processing-pipeline)
   - [4.3 Resume & Cover Letter Generation](#43-resume--cover-letter-generation)
   - [4.4 Email Composition & Sending](#44-email-composition--sending)
   - [4.5 Application & Tracking](#45-application--tracking)
5. [Database Schema](#5-database-schema)
6. [User Interface](#6-user-interface)
   - [6.1 Dashboard (Frontend: TypeScript)](#61-dashboard-frontend-typescript)
7. [Technical Implementation](#7-technical-implementation)
   - [7.1 Frontend](#71-frontend)
   - [7.2 Backend](#72-backend)
   - [7.3 Database](#73-database)
8. [Success Metrics](#8-success-metrics)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Next Steps](#10-next-steps)

---

## 1. Overview

**JobHunter** is a workflow-driven system to help identify, evaluate, and apply to job opportunities that meet specific requirements. The system automates intake from multiple sources, filters and deduplicates jobs, supports manual approval, and generates custom resumes and cover letters. It also maintains a database for tracking job applications and follow-up activities.  

The implementation stack is:  
- **Frontend:** TypeScript  
- **Backend:** Rust  
- **Database:** Relational (PostgreSQL or SQLite)  

---

## 2. Goals & Objectives

- Streamline the job search process by automating repetitive tasks.
- Ensure only relevant, high-paying job offers are considered.
- Prevent duplicate processing of the same job.
- Generate tailored resumes and cover letters for each approved application.
- Send application emails using cover letter as email body with resume attached.
- Maintain a complete record of job offers, applications, and communication history.
- Provide a dashboard for monitoring progress and managing applications.  

---

## 3. Job Criteria

**Philosophy**: Job evaluation is based on trade-offs across multiple dimensions, not binary pass/fail. The system extracts rich data to inform manual decision-making. Confidence scoring measures extraction quality, not job acceptability.

### 3.1 Job Domain & Technical Focus

**Dominant field**: Software/Firmware Engineering with emphasis on Testing & QA

- **Testing Scope**: All levels of the stack welcome:
  - BIOS/Power-On Self Tests (POST)
  - Chip-level and board-level testing
  - Integration testing
  - System testing
  - Web UI and end-to-end testing
- **Test Automation**: Highly preferred
- **Quality Assurance**: Core competency area
- **Generative AI**: Bonus if role involves:
  - AI-augmented testing
  - Prompt engineering for test generation
  - LLM-based test tooling
- **Test Equipment**: ATE (Automatic Test Equipment), oscilloscopes, cellular radio testing, etc. acceptable
- **Related Fields**: Technically adjacent roles (DevOps, Release Engineering, etc.) considered on case-by-case basis
- **Key Insight**: Summary job description is critical for evaluation

### 3.2 Compensation Structure

**Preference Order**: Schedule C consulting > 1099 contract > Annual W-2 salary > Hourly W-2 temp

**Compensation Types:**
- **Annual Salary**: Preferred baseline structure
  - Minimum: $130,000/year
  - Better: Higher compensation
- **Hourly Rate**: Less preferred than annual salary
  - Must convert to annual equivalent (assume 2080 hours/year)
  - Minimum: $62.50/hour (= $130K annual)
- **Consulting Contract**: Highly preferred, especially:
  - Contract with retainer arrangement
  - Corp-to-corp arrangements
  - Project-based with ongoing relationship
- **Daily Rate**: Convert to annual equivalent for comparison
- **Tax Structure Preference**: Schedule C (own consulting firm) > 1099 independent contractor > W-2 employee

**Trade-off Principle**: A W-2 role at $160K might be less attractive than a 1099 contract at $140K due to tax advantages.

### 3.3 Employment Relationship

**Preference Order**: Direct consulting > Direct hire > Agency placement

- **Direct Hire**: Preferred for stability
- **Direct Consulting**: Most preferred if through own consulting firm (Schedule C income)
- **Staffing Agency**: Less preferred but acceptable for strong opportunities
  - Agency typically means W-2 (least preferred tax structure)
  - Evaluate based on other compensating factors
- **Contract-to-Hire**: Acceptable if strong conversion likelihood

**Trade-off Principle**: Agency placement at higher rate might compensate for less preferred relationship structure.

### 3.4 Work Location & Remote Policy

**Strong preference for remote work**

- **Fully Remote**: Ideal situation
- **Hybrid**: Acceptable if ≤ 3 days/week onsite
  - Better: 1-2 days/week
  - Acceptable: 3 days/week
  - Concerning: 4+ days/week
- **Fully Onsite**: Only for exceptional compensation or opportunity

**Trade-off Principle**: Higher compensation or better role can offset onsite requirements.

### 3.5 Commute Considerations (for hybrid/onsite roles)

When remote work is not available, commute factors become critical:

**Distance/Time from Fremont, CA:**
- **Ideal**: ≤ 45 minutes one-way
- **Acceptable**: Up to 60 minutes with company transportation
- **Concerning**: > 60 minutes

**Commute Perks & Benefits:**
- **Company Bus/Shuttle**: Significantly extends acceptable commute time
  - Productive travel time (work on bus)
  - No driving stress
  - Can extend acceptable commute to ~60 minutes
- **FasTrak/Express Lane Reimbursement**: Highly valued perk
  - Reduces commute time variability
  - Makes longer commutes more tolerable
- **Schedule Flexibility**: Late-morning and evening commute hours preferred
  - Avoid peak traffic
  - Better work-life balance
- **Other Perks**: Parking, transit passes, flexible hours

**Acceptable Locations** (within 45 min typical):
- Hayward, CA
- Menlo Park, CA
- Newark, CA
- Union City, CA
- Milpitas, CA
- San Jose, CA (parts)
- Mountain View, CA
- Palo Alto, CA

**Trade-off Principle**: A role with company shuttle and FasTrak at 55 minutes may be better than a role at 40 minutes without perks.

### 3.6 Job Evaluation Framework

All criteria interact in a multidimensional trade-off space. The system extracts data across all dimensions, and you make final acceptability decisions based on your assessment of the specific opportunity.

**Example Trade-offs:**
- Agency W-2 at $150K + fully remote might beat direct hire W-2 at $140K + 3 days onsite
- Direct hire W-2 at $145K + 30 min commute + company shuttle might beat remote 1099 at $135K
- 1099 contract at $130K might beat W-2 at $140K due to tax advantages

---

## 4. Workflow

### 4.1 Intake Sources
- Gmail inbox (primary)
- Consulting inbox (`sam@samkirk.com`)
- SMS/text messages
- Job sites (LinkedIn, Dice, Indeed, etc.)
- Manual entry  

### 4.2 Processing Pipeline
1. **Collect** jobs from all sources.  
2. **Filter** jobs against criteria (salary, domain, commute, remote preference).  
3. **Deduplicate** against existing database entries.  
4. **Approval Gate**: User manually reviews and approves jobs before proceeding.  

### 4.3 Resume & Cover Letter Generation
- Extract relevant content from **master resume**.  
- Auto-generate **customized resume** highlighting job-relevant experience.  
- Generate **cover letter**:  
  - Personalized for the role.  
  - Includes metadata to trace back to original job source.  
- Export in **same format/media as job posting** (email, portal, etc.).  

### 4.4 Email Composition & Sending
- **Email body is the cover letter**: The generated cover letter serves as the email content.
- **Resume is attached**: Attach the customized resume in whatever format was generated.
- **Draft-based workflow for user approval**:
  - Create email as a draft in Gmail.
  - User reviews and edits the draft in Gmail before sending.
  - User manually sends the email from Gmail after approval.
- **Gmail Integration**:
  - Use Gmail API to create drafts with cover letter as body and resume attachment.
  - Track when draft is created and monitor for sent status.
- **After sending**:
  - Record sent email in Communications table with full content and metadata.
  - Update application status to "sent" upon successful delivery.
- Support different delivery methods based on application requirements (direct email, portal upload, etc.).

### 4.5 Application & Tracking
- Track application status: Sent, Pending, Follow-up, Closed.
- Store all communication history in database.
- Enable reminders for follow-ups.  

---

## 5. Database Schema

The database consists of three main tables within a single PostgreSQL database:

**Table: Jobs**
*Stores job postings collected from various sources.*

- `job_id` (PK)
- `title`
- `company`
- `location`
- `source` (email/site/text/manual)
- `salary`
- `commute_time`
- `status` (new, filtered, approved, rejected, applied, closed)
- `date_collected`

**Table: Applications**
*Stores your applications to specific jobs, including the customized resume and cover letter versions used.*

- `application_id` (PK)
- `job_id` (FK)
- `resume_version`
- `cover_letter_version`
- `application_status` (sent, pending, follow-up, closed)
- `date_applied`

**Table: Communications**
*Tracks all communication history related to applications (sent emails, received responses, phone calls, etc.). Provides a complete audit trail of all interactions for each job application.*

- `communication_id` (PK)
- `application_id` (FK)
- `message_content`
- `message_date`
- `channel` (email, text, portal, phone)  

---

## 6. User Interface

### 6.1 Dashboard (Frontend: TypeScript)
- **Inbox Panel:** List of new jobs (from all sources).
- **Filter Panel:** Show why jobs were rejected or approved.
- **Approval Panel:** User reviews and approves/rejects jobs.
- **Email Composer:** Interface to prepare application emails with:
  - Preview of cover letter as email body with resume attachment.
  - "Create Gmail Draft" button to generate draft for user review.
  - Link to open Gmail draft for editing and sending.
  - Copy functionality as backup option.
- **Application Tracker:** Displays status of each job application.
- **Follow-up Alerts:** Notifications for pending follow-ups.  

---

## 7. Technical Implementation

### 7.1 Frontend
- **Language:** TypeScript  
- **Framework:** React or Angular (to be decided)  
- **Features:**  
  - Job approval dashboard.  
  - Resume/cover letter preview.  
  - Application tracker with filters.  

### 7.2 Backend
- **Language:** Rust
- **Features:**
  - Intake API to pull from email, text, job boards, manual input.
  - Filtering and deduplication engine.
  - Resume/cover letter generator (templating + LLM integration optional).
  - Gmail API integration to create email drafts (cover letter as body, resume as attachment).
  - Database interface.  

### 7.3 Database
- **Type:** PostgreSQL (primary choice), SQLite (fallback for local use).  
- **Purpose:** Store job offers, applications, resumes, cover letters, communications, statuses.  

---

## 8. Success Metrics

- Reduction in duplicate job processing.  
- Time saved per job application.  
- % of job postings filtered out vs. approved.  
- % of resumes/cover letters auto-generated successfully.  
- Improved follow-up rates through reminders.  

---

## 9. Risks & Mitigations

- **Risk:** Overly strict filters may discard valid jobs.  
  - *Mitigation:* Allow user override.  
- **Risk:** AI-generated cover letters may not reflect tone/fit.  
  - *Mitigation:* User edit before sending.  
- **Risk:** Multiple job sources could cause data silos.  
  - *Mitigation:* Centralized intake layer with standard schema.  

---

## 10. Next Steps

1. Validate requirements and constraints.  
2. Define detailed UI wireframes.  
3. Implement intake + filter + deduplication backend.  
4. Integrate resume/cover letter generation.  
5. Build frontend dashboard.  
6. Test end-to-end flow with sample jobs.  

---
