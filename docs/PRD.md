# Product Requirements Document (PRD)
**Project Name:** JobHunter
**Prepared by:** Sam Kirk
**Date:** 2025-09-11

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Objectives](#2-goals--objectives)
3. [Job Criteria](#3-job-criteria)
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

- **Compensation:** Equivalent to ≥ $130K annual salary.  
- **Domain:** Software/Firmware Engineering, with high preference for:  
  - Testing and test automation at all levels of the software stack.  
  - Generative AI applied to software development and testing (e.g., prompt engineering).  
- **Work Location:**  
  - Strong preference for remote work.  
  - If commuting:  
    - ≤ 3 times weekly.  
    - ≤ 45 minutes from Fremont, CA (e.g., Hayward, Menlo Park, Newark, Union City, Milpitas).  
    - Late-morning to evening commuting hours.  
    - Company-provided bus service may extend acceptable distance.  

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
