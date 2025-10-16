<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Job Card Trade-Off Information Enhancement Plan](#job-card-trade-off-information-enhancement-plan)
  - [Overview](#overview)
  - [Current State Analysis](#current-state-analysis)
    - [What's Currently Shown](#whats-currently-shown)
    - [What's Missing](#whats-missing)
  - [Proposed Badge Enhancements](#proposed-badge-enhancements)
    - [1. Company Industry Badge](#1-company-industry-badge)
    - [2. Employment Type Badge](#2-employment-type-badge)
    - [3. Seniority Level Badge](#3-seniority-level-badge)
    - [4. Contract Duration Badge](#4-contract-duration-badge)
    - [5. Agency Name Badge](#5-agency-name-badge)
    - [6. Equity Offered Badge](#6-equity-offered-badge)
    - [7. Bonus Structure Badge](#7-bonus-structure-badge)
    - [8. Days Onsite Badge](#8-days-onsite-badge)
    - [9. Tech Stack Badge](#9-tech-stack-badge)
    - [10. Automation Tools Badge](#10-automation-tools-badge)
  - [Badge Organization Strategy](#badge-organization-strategy)
    - [Row 1: Basic Info (Existing)](#row-1-basic-info-existing)
    - [Row 2: Employment Details](#row-2-employment-details)
    - [Row 3: Work Location](#row-3-work-location)
    - [Row 4: Technical & Role](#row-4-technical--role)
    - [Row 5: Compensation](#row-5-compensation)
    - [Row 6: Tools & Technologies](#row-6-tools--technologies)
  - [Smart Display Logic](#smart-display-logic)
    - [Rules:](#rules)
    - [Example Implementation:](#example-implementation)
  - [Color Coding Philosophy](#color-coding-philosophy)
  - [Code Changes Location](#code-changes-location)
    - [Implementation Approach:](#implementation-approach)
  - [Benefits](#benefits)
  - [Testing Considerations](#testing-considerations)
    - [Test Cases:](#test-cases)
    - [Edge Cases:](#edge-cases)
  - [Implementation Phases](#implementation-phases)
    - [Phase 1: Core Employment Badges](#phase-1-core-employment-badges)
    - [Phase 2: Compensation Badges](#phase-2-compensation-badges)
    - [Phase 3: Location & Work Badges](#phase-3-location--work-badges)
    - [Phase 4: Technical Badges](#phase-4-technical-badges)
    - [Phase 5: Polish & Testing](#phase-5-polish--testing)
  - [Future Enhancements](#future-enhancements)
  - [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Job Card Trade-Off Information Enhancement Plan

**Version:** 1.0
**Date:** 2025-10-16
**Status:** Planning

## Overview

This document outlines the plan to enhance the job card display in the JobHunter application to show all available LLM-extracted data fields. The goal is to provide comprehensive trade-off information to support manual approve/reject decisions.

## Current State Analysis

### What's Currently Shown
The job card (App.tsx, lines 537-720) currently displays:
- **Basic Info**: Salary, Location, Commute Time, Source, Date
- **Badges**:
  - Tax Structure (1099/Schedule C vs W2)
  - Fully Remote
  - Company Shuttle
  - Gen AI Focus
  - Testing Focus

### What's Missing
Many valuable data fields from the job extraction JSON are not displayed:
- Company industry
- Employment type (full-time/part-time/contract/temporary) with source tracking
- Seniority level
- Contract duration (for contract positions)
- Agency name (if placement through agency)
- Equity offered
- Bonus structure
- Days onsite per week (for hybrid)
- Tech stack
- Automation tools/frameworks
- Benefits details
- Clearance requirements
- Visa sponsorship
- And more...

## Proposed Badge Enhancements

### 1. Company Industry Badge
**Display Format:** "🏢 [Industry Name]" with optional "(inferred)" indicator
**Color:** Indigo (#6366f1)
**Display Logic:** Show when `raw_data.company_industry` is not null
**Inferred Indicator:** Add "(inferred)" suffix when `raw_data.company_industry_source === "inferred"`

**Example:**
```tsx
{job.raw_data?.company_industry && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#eef2ff',
    color: '#6366f1',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  }}>
    🏢 {job.raw_data.company_industry}
    {job.raw_data.company_industry_source === 'inferred' && ' (inferred)'}
  </span>
)}
```

### 2. Employment Type Badge
**Display Format:** "[Type]" (Full-Time, Part-Time, Contract, Temporary) with optional "(inferred)" indicator
**Colors:**
- Full-Time: Green (#10b981)
- Part-Time: Orange (#f59e0b)
- Contract: Yellow (#eab308)
- Temporary: Orange (#f59e0b)

**Display Logic:** Show when `raw_data.employment.employment_type` is not null
**Inferred Indicator:** Add "(inferred)" when `raw_data.employment.employment_type_source === "inferred"`

**Example:**
```tsx
{job.raw_data?.employment?.employment_type && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: job.raw_data.employment.employment_type === 'full-time' ? '#d1fae5' :
                     job.raw_data.employment.employment_type === 'part-time' ? '#fed7aa' :
                     job.raw_data.employment.employment_type === 'contract' ? '#fef3c7' : '#fed7aa',
    color: job.raw_data.employment.employment_type === 'full-time' ? '#10b981' :
           job.raw_data.employment.employment_type === 'part-time' ? '#f59e0b' :
           job.raw_data.employment.employment_type === 'contract' ? '#eab308' : '#f59e0b',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  }}>
    {job.raw_data.employment.employment_type.charAt(0).toUpperCase() +
     job.raw_data.employment.employment_type.slice(1)}
    {job.raw_data.employment.employment_type_source === 'inferred' && ' (inferred)'}
  </span>
)}
```

### 3. Seniority Level Badge
**Display Format:** "[Level]" (Junior, Mid-level, Senior, Staff, Principal, etc.)
**Color:** Blue (#3b82f6)
**Display Logic:** Show when `raw_data.seniority_level` is not null

**Example:**
```tsx
{job.raw_data?.seniority_level && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#3b82f6',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  }}>
    📊 {job.raw_data.seniority_level}
  </span>
)}
```

### 4. Contract Duration Badge
**Display Format:** "[Duration]" (e.g., "6 months", "1 year", "12 months")
**Color:** Yellow (#eab308)
**Display Logic:** Show when `raw_data.employment.contract_duration` is not null

**Example:**
```tsx
{job.raw_data?.employment?.contract_duration && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    color: '#eab308',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  }}>
    ⏱️ {job.raw_data.employment.contract_duration}
  </span>
)}
```

### 5. Agency Name Badge
**Display Format:** "via [Agency Name]"
**Color:** Orange (#f59e0b)
**Display Logic:** Show when `raw_data.employment.agency_name` is not null

**Example:**
```tsx
{job.raw_data?.employment?.agency_name && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#fed7aa',
    color: '#f59e0b',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  }}>
    🏢 via {job.raw_data.employment.agency_name}
  </span>
)}
```

### 6. Equity Offered Badge
**Display Format:** "💰 Equity" or "💰 [Equity Details]"
**Color:** Green (#10b981)
**Display Logic:** Show when `raw_data.compensation.equity_offered` is true or has details

**Example:**
```tsx
{(job.raw_data?.compensation?.equity_offered ||
  job.raw_data?.compensation?.equity_details) && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#d1fae5',
    color: '#10b981',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  }}>
    💰 {job.raw_data.compensation.equity_details || 'Equity'}
  </span>
)}
```

### 7. Bonus Structure Badge
**Display Format:** "💵 [Bonus Info]" (e.g., "20% target", "Performance bonus")
**Color:** Green (#10b981)
**Display Logic:** Show when `raw_data.compensation.bonus` is not null

**Example:**
```tsx
{job.raw_data?.compensation?.bonus && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#d1fae5',
    color: '#10b981',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  }}>
    💵 {job.raw_data.compensation.bonus}
  </span>
)}
```

### 8. Days Onsite Badge
**Display Format:** "[X] days/week onsite"
**Color:** Blue (#3b82f6)
**Display Logic:** Show when `raw_data.work_location.days_onsite_per_week` is not null

**Example:**
```tsx
{job.raw_data?.work_location?.days_onsite_per_week && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#dbeafe',
    color: '#3b82f6',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  }}>
    📅 {job.raw_data.work_location.days_onsite_per_week} days/week onsite
  </span>
)}
```

### 9. Tech Stack Badge
**Display Format:** "⚙️ [Tech1, Tech2, ...]" (truncated if too many)
**Color:** Purple (#a855f7)
**Display Logic:** Show when `raw_data.tech_stack` array is not null and not empty

**Example:**
```tsx
{job.raw_data?.tech_stack && job.raw_data.tech_stack.length > 0 && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f3e8ff',
    color: '#a855f7',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }} title={job.raw_data.tech_stack.join(', ')}>
    ⚙️ {job.raw_data.tech_stack.slice(0, 3).join(', ')}
    {job.raw_data.tech_stack.length > 3 && ` +${job.raw_data.tech_stack.length - 3} more`}
  </span>
)}
```

### 10. Automation Tools Badge
**Display Format:** "🤖 [Tool1, Tool2, ...]" (truncated if too many)
**Color:** Purple (#a855f7)
**Display Logic:** Show when `raw_data.automation_tools` array is not null and not empty

**Example:**
```tsx
{job.raw_data?.automation_tools && job.raw_data.automation_tools.length > 0 && (
  <span style={{
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f3e8ff',
    color: '#a855f7',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }} title={job.raw_data.automation_tools.join(', ')}>
    🤖 {job.raw_data.automation_tools.slice(0, 3).join(', ')}
    {job.raw_data.automation_tools.length > 3 && ` +${job.raw_data.automation_tools.length - 3} more`}
  </span>
)}
```

## Badge Organization Strategy

To make the job card scannable and support trade-off decision making, badges should be organized into logical rows:

### Row 1: Basic Info (Existing)
- Salary
- Location
- Commute Time
- Source
- Date

### Row 2: Employment Details
- Tax Structure (1099/Schedule C vs W2)
- Employment Type (Full-Time/Part-Time/Contract/Temporary)
- Contract Duration (if applicable)
- Agency Name (if applicable)

### Row 3: Work Location
- Fully Remote
- Days Onsite (if hybrid)
- Company Shuttle (if applicable)
- Company Industry

### Row 4: Technical & Role
- Seniority Level
- Testing Focus
- Gen AI Focus
- Tech Stack

### Row 5: Compensation
- Equity
- Bonus

### Row 6: Tools & Technologies
- Automation Tools

## Smart Display Logic

**Key Principle:** Only show badges when they provide useful information.

### Rules:
1. **Null/Undefined Check:** Don't display if field is null, undefined, or empty string
2. **Empty Arrays:** Don't display if array has zero length
3. **Boolean Fields:** Only display when true (e.g., don't show "No Equity" badge)
4. **Zero Values:** Don't display numeric fields that are 0 (unless 0 is meaningful)
5. **Source Annotation:** Show "(inferred)" suffix for fields where `_source === "inferred"`

### Example Implementation:
```tsx
const shouldShowBadge = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'number' && value === 0) return false;
  return true;
};
```

## Color Coding Philosophy

Colors should align with decision-making and trade-offs:

| Color | Purpose | Examples |
|-------|---------|----------|
| **Green (#10b981)** | Preferred/Positive | 1099/Schedule C, Full-Time, Equity, Bonus, Permanent |
| **Blue (#3b82f6)** | Informational/Neutral | Seniority, Fully Remote, Days Onsite |
| **Yellow (#eab308)** | Tradeoffs Required | W2, Contract positions |
| **Orange (#f59e0b)** | Caution/Less Preferred | Agency placement, Part-Time, Temporary |
| **Purple (#a855f7)** | Technical/Domain | Tech Stack, Automation Tools |
| **Indigo (#6366f1)** | Company Info | Industry |

## Code Changes Location

**File:** `frontend/src/App.tsx`
**Lines:** 537-720 (JobCard component)

### Implementation Approach:
1. Add new badge components after existing badges
2. Organize badges into rows using flexbox with gap
3. Add helper function `shouldShowBadge()` for display logic
4. Use consistent styling with existing badges
5. Add title attributes for truncated content (hover tooltips)

## Benefits

1. **Better Decision Making:** All relevant trade-off information visible at a glance
2. **Reduced Cognitive Load:** No need to click through to see important details
3. **Faster Processing:** Can quickly scan and approve/reject based on preferences
4. **Transparency:** Source tracking shows confidence level (extracted vs inferred)
5. **Cleaner UI:** Only show relevant data (no null/empty fields)

## Testing Considerations

### Test Cases:
1. **All Fields Present:** Verify all badges display correctly
2. **All Fields Null:** Verify no badges display (clean card)
3. **Mixed Data:** Some fields present, some null
4. **Inferred Data:** Verify "(inferred)" suffix appears correctly
5. **Long Arrays:** Verify truncation with "+X more" works
6. **Hover Tooltips:** Verify full content shows on hover for truncated badges
7. **Responsive Layout:** Verify badges wrap properly on narrow screens

### Edge Cases:
- Empty arrays should not display
- Zero values should not display
- Empty strings should not display
- Null should not display
- Boolean false should not display

## Implementation Phases

### Phase 1: Core Employment Badges
- Employment Type (with source tracking)
- Contract Duration
- Agency Name
- Seniority Level

### Phase 2: Compensation Badges
- Equity
- Bonus

### Phase 3: Location & Work Badges
- Days Onsite
- Company Industry (with source tracking)

### Phase 4: Technical Badges
- Tech Stack
- Automation Tools

### Phase 5: Polish & Testing
- Responsive layout adjustments
- Accessibility improvements
- Comprehensive testing
- User feedback incorporation

## Future Enhancements

Consider adding in future iterations:
- Benefits summary badge
- Clearance requirements badge
- Visa sponsorship badge
- Interview process badge
- Company size badge
- Funding stage badge (for startups)
- Remote work policy details
- PTO/vacation details

## References

- Job extraction prompt: `/prompts/job_extraction_default.md` (v1.2)
- Current job card: `/frontend/src/App.tsx` (lines 537-720)
- Database schema: `/database/schema.sql` (JSONB storage in `raw_data` column)
- Project documentation: `/CLAUDE.md`

---

**End of Plan Document**
