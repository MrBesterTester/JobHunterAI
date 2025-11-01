<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Product Requirements Document (PRD)](#product-requirements-document-prd)
  - [1. Overview](#1-overview)
  - [2. Goals & Objectives](#2-goals--objectives)
  - [3. Job Criteria](#3-job-criteria)
    - [3.1 Job Domain & Technical Focus](#31-job-domain--technical-focus)
    - [3.2 Compensation Structure](#32-compensation-structure)
    - [3.3 Employment Relationship](#33-employment-relationship)
    - [3.4 Work Location & Remote Policy](#34-work-location--remote-policy)
    - [3.5 Commute Considerations (for hybrid/onsite roles)](#35-commute-considerations-for-hybridonsite-roles)
    - [3.6 Job Evaluation Framework](#36-job-evaluation-framework)
      - [Scoring Calculation Formulas](#scoring-calculation-formulas)
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

**Minimum Threshold**: $100,000 annual equivalent (after conversion and adjustments)
**Target Baseline**: $130,000 annual equivalent

**Compensation Types & Equivalence:**

- **Annual Salary**: Preferred baseline structure
  - Use as-is (or average of min/max if range provided)
  - Minimum: $100,000/year (hard filter)
  - Target: $130,000/year (baseline for scoring)

- **Hourly Rate**: Convert to annual equivalent
  - Formula: Hourly rate × 2080 hours/year
  - Example: $62.50/hour = $130,000 annual
  - Minimum: $48.08/hour (= $100K annual)

- **Daily Rate**: Convert to annual equivalent
  - Formula: Daily rate × 250 days/year
  - Example: $520/day = $130,000 annual
  - Minimum: $400/day (= $100K annual)

- **Consulting Contract**: Highly preferred, especially:
  - **Contract with retainer arrangement** (most preferred)
    - 3-day retainer: Excellent (high autonomy + stability)
    - 2-day retainer: Very good
    - 1-day retainer: Good
  - Corp-to-corp arrangements
  - Project-based with ongoing relationship

**Tax Structure Adjustments** (effective value):
- **Schedule C** (own consulting firm): Multiply equivalent by 1.15 (+15% value)
  - Reason: Business expense deductions, QBI deduction, tax optimization
- **1099 Independent Contractor**: Multiply equivalent by 1.10 (+10% value)
  - Reason: Tax flexibility, business expense deductions
- **W-2 Employee**: Use as-is (1.0 multiplier, baseline)
  - Standard withholding, limited deductions

**Equity & Bonus**:
- **Equity Offered**: Multiply stated value by 0.20 (80% discount factor)
  - Reason: Illiquid, uncertain value, long vesting schedules
  - Add discounted value to total compensation
- **Bonus Structure**: Add stated percentage to base salary
  - Example: 10% bonus on $130K = add $13,000 to equivalent
  - Use stated percentage if available, otherwise ignore

**Trade-off Principle**:
- A W-2 role at $160K might be less attractive than a 1099 contract at $140K due to tax advantages ($140K × 1.10 = $154K equivalent)
- A Schedule C contract at $135K might equal a W-2 at $155K ($135K × 1.15 = $155K equivalent)

### 3.3 Employment Relationship

**Preference Order** (descending):
1. **Direct Hire** (full-time employee with hiring company)
2. **Staffing Agency** (agency places candidate; candidate is W-2 employee of hiring company or agency; agency receives placement fee from employer)
3. **Contract Agency** (candidate works for agency; agency contracts candidate's services to employer; candidate may be W-2 of agency or 1099)
4. **Contract-to-Hire** (starts as contract, potential conversion)

**Definitions & Clarifications:**

- **Direct Hire**: Traditional full-time employment
  - Most stable relationship
  - Direct benefits from employer
  - W-2 employee of hiring company

- **Direct Consulting** (via own firm): **Highest preference when available**
  - Schedule C income (own consulting business)
  - Contract directly with client company
  - Maximum autonomy and tax advantages
  - Often includes retainer arrangements

- **Staffing Agency / Recruiter**:
  - Agency identifies and places candidates for employer
  - Employer pays agency placement fee (usually % of first-year salary)
  - Candidate becomes employee of hiring company (not agency)
  - Typically W-2 structure (least preferred tax-wise)
  - Acceptable for strong opportunities with good compensation

- **Contract Agency**:
  - Candidate works for agency on behalf of employer
  - Agency contracts out candidate's services to client
  - Candidate may be W-2 of agency or 1099 contractor
  - Less direct relationship with end client

- **Contract-to-Hire**:
  - Starts as contractor (1099 or W-2 of agency)
  - Potential conversion to direct hire after trial period
  - Lower priority unless conversion likelihood is very high

**Trade-off Principle**:
- Agency placement at $150K direct hire might beat direct hire at $140K due to compensation difference
- Contract agency with 1099 structure at $135K might beat staffing agency W-2 at $140K due to tax advantages ($135K × 1.10 = $148.5K equivalent)

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

All criteria interact in a multidimensional trade-off space. The system extracts data across all dimensions, then **ranks jobs using a weighted scoring system** (see ISSUE-004) to support informed decision-making.

**Multi-Criteria Weighted Scoring** (Implemented in ISSUE-004):

The system calculates a 0-100 score for each job based on 7 weighted criteria:

| Criterion | Weight | Key Factors |
|-----------|--------|-------------|
| Compensation | 30% | Equivalent annual value + tax adjustments + equity/bonus |
| Employment Relationship | 20% | Direct hire > Staffing agency > Contract agency > Contract-to-hire |
| Remote Work Policy | 20% | Fully remote > Hybrid (1-3 days) > Onsite + shuttle/perks |
| Domain/Technical Fit | 15% | Testing/QA focus > Automation > GenAI > Adjacent tech |
| Flexibility & Perks | 10% | Retainer > Schedule flexibility > Shuttles > Standard |
| Benefits | 3% | Private insurance > Comprehensive > Standard > Minimal |
| Company Industry | 2% | Healthcare tech > Enterprise SaaS > Consulting > Other |

**Total: 100%** (weights sum to 1.0)

#### Scoring Calculation Formulas

Each criterion is scored on a 0-100 scale using the following algorithms:

**1. Compensation Score (0-100, Weight: 30%)**

Formula: Linear interpolation across salary bands
- Calculate annual equivalent:
  - Salary: Use as-is (or average if range)
  - Hourly: Rate × 2080 hours/year
  - Daily: Rate × 250 days/year
- Apply tax structure multiplier:
  - W-2: ×1.0 (baseline)
  - 1099: ×1.10 (+10% value)
  - Schedule C: ×1.15 (+15% value)
- Add bonus (if stated percentage)
- Add equity × 0.20 (80% discount factor)
- Score:
  - ≤$100K: 0 points
  - $100K-$130K: 0-50 points (linear)
  - $130K-$160K: 50-75 points (linear)
  - $160K-$200K: 75-100 points (linear)
  - ≥$200K: 100 points

**2. Employment Relationship Score (0-100, Weight: 20%)**

Priority rankings:
- Schedule C consulting: 100 points (highest autonomy)
- Contract with retainer: 90 points (stability + flexibility)
- Direct hire / Full-time: 100 points
- Staffing agency: 60 points
- Contract agency: 40 points
- Contract-to-hire: 20 points
- Standard contract: 40 points
- Unknown: 30 points

**3. Remote Work Score (0-100, Weight: 20%)**

Base policy score:
- Fully remote: 100 points
- Hybrid 1 day/week: 90 points
- Hybrid 2 days/week: 80 points
- Hybrid 3 days/week: 60 points
- Hybrid 4 days/week: 30 points
- Hybrid 5 days/week: 10 points
- Onsite: 0 points

Bonuses (if not fully remote):
- Company shuttle: +15 points
- FasTrak reimbursement: +10 points
- Schedule flexibility: +5 points
- Max total: 100 points

**4. Domain/Technical Fit Score (0-100, Weight: 15%)**

Base category score:
- Testing/QA: 100 points
- Test Automation: 90 points
- Firmware Testing: 85 points
- Software Engineering (testing focus): 80 points
- Software Engineering (no testing): 40 points
- DevOps / Release Engineering: 60 points
- Other: 20 points

Bonuses:
- Automation focus: +10 points
- Generative AI usage: +10 points
- Tech stack includes Playwright/Cypress/Selenium: +5 points
- Title contains "test"/"qa"/"quality": +5 points

Penalties:
- Management role (manager/director/executive): -20 points
- Final score: max(0, min(100, score))

**5. Flexibility & Perks Score (0-100, Weight: 10%)**

Retainer arrangements (highest priority):
- 3-day retainer: 100 points
- 2-day retainer: 85 points
- 1-day retainer: 70 points
- Standard contract: 40 points

If no retainer, score based on perks:
- Schedule flexibility: 60 points
- Company shuttle: 50 points
- FasTrak reimbursement: 40 points
- Parking: 30 points
- Standard benefits: 20 points
- None: 0 points

**6. Benefits Score (0-100, Weight: 3%)**

Insurance quality:
- Private insurance (Blue Shield, Aetna, Kaiser, Cigna): 100 points
- Comprehensive (full package): 70 points
- Standard (health + dental): 50 points
- Health only: 30 points
- Unknown/neutral: 40 points

**7. Company Industry Score (0-100, Weight: 2%)**

Industry rankings:
- Healthcare + Tech: 100 points
- SaaS / Enterprise: 90 points
- Financial / FinTech: 80 points
- Consulting: 70 points
- E-commerce: 60 points
- Telecom: 50 points
- Other/Unknown: 40 points

**Final Score Calculation:**
```
total_score = (compensation_score × 0.30) +
              (relationship_score × 0.20) +
              (remote_work_score × 0.20) +
              (domain_fit_score × 0.15) +
              (flexibility_score × 0.10) +
              (benefits_score × 0.03) +
              (industry_score × 0.02)
```

Jobs are ranked by descending total_score.

**Benefits Considerations** (Low priority but nice-to-have):
- **Private Insurance** (e.g., Blue Shield, Aetna): Preferred over standard plans
  - Has Medicare/Kaiser baseline coverage
  - Private insurance provides additional options and flexibility
- **Comprehensive Benefits**: Standard health, dental, vision, 401(k)
- **Minimal Benefits**: Basic coverage only
- **Note**: Benefits are a low-weighted factor (3%) in overall scoring

**Flexibility & Perks Prioritization**:
1. **Retainer Arrangements** (Highest value):
   - 3-day retainer: Excellent (high autonomy + guaranteed income)
   - 2-day retainer: Very good
   - 1-day retainer: Good
   - Provides flexibility and stability for contract work

2. **Company Shuttle/Bus**: Significantly extends acceptable commute
   - Can work during commute (productive time)
   - No driving stress
   - Extends acceptable commute from 45 to 60 minutes

3. **FasTrak/Express Lane Reimbursement**: Reduces commute variability
   - Makes longer commutes more predictable
   - Valued perk for hybrid/onsite roles

4. **Schedule Flexibility**:
   - Late-morning start preferred (avoid peak traffic)
   - Evening flexibility for work-life balance
   - Flexible hours valued for hybrid/onsite roles

5. **Other Perks**: Parking, transit passes, gym membership (minor factors)

**Example Trade-offs:**
- Agency W-2 at $150K + fully remote might beat direct hire W-2 at $140K + 3 days onsite
  - Compensation: $150K vs $140K (+$10K)
  - Remote: Fully remote vs 3-day hybrid (better flexibility)
  - Relationship: Agency vs Direct (direct hire preferred but offset by other factors)

- Direct hire W-2 at $145K + 30 min commute + company shuttle might beat remote 1099 at $135K
  - Compensation: $145K vs $148.5K equivalent ($135K × 1.10)
  - Commute: Short with shuttle (productive time) vs none
  - Relationship: Direct hire vs 1099 (direct hire preferred in this case)

- 1099 contract at $130K might beat W-2 at $140K due to tax advantages
  - Compensation: $143K equivalent ($130K × 1.10) vs $140K
  - Tax structure: 1099 flexibility vs W-2 standard withholding
  - Note: Close call, other factors would decide (remote work, tech fit, etc.)

**Decision Process**:
1. System calculates weighted score for each job (0-100)
2. Jobs ranked by total score in UI
3. User reviews top-ranked jobs with full criteria visibility
4. User makes final decision based on total picture
5. Future: User can manually adjust scores for intangible factors (Option C)

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

**Testing Safety Requirements**:
- **Test Email Override**: All automated test scripts that send Gmail messages MUST use `MrBesterTester@gmail.com` as the recipient address.
- **Production Behavior**: The actual working code should use the real reply-to email address from the job offer, with user approval required before sending.
- **Test vs Production Separation**:
  - Automated tests: Always send to `MrBesterTester@gmail.com`
  - Manual/production workflow: Use actual recruiter email addresses (requires user approval)
- **Rationale**: Prevents test emails from accidentally being sent to real recruiters/companies during development and testing.

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
