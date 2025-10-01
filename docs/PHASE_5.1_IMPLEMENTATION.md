# Phase 5.1 Implementation Progress

**Status**: In Progress
**Started**: October 1, 2025
**Estimated Completion**: 2-3 weeks

## Implementation Roadmap

### ✅ Week 1 - Days 1-2: Database & Infrastructure
- [x] Create database migration (migration_phase5.1.sql)
- [x] Add new tables: interviews, follow_up_schedule, follow_up_templates
- [x] Enhance communications and applications tables
- [x] Create views: upcoming_interviews, pending_follow_ups, application_timeline
- [x] Apply migration to database
- [x] Add Google Calendar dependencies to Cargo.toml (google-calendar3, yup-oauth2)
- [ ] Build backend with new dependencies

### 🔄 Week 1 - Days 3-5: Google Calendar Integration
- [ ] Create Calendar OAuth module (`backend/src/calendar_auth.rs`)
  - [ ] OAuth 2.0 flow with Google Calendar API
  - [ ] Token storage and refresh logic
  - [ ] Error handling and retry logic

- [ ] Create Calendar Service module (`backend/src/calendar_service.rs`)
  - [ ] Create event function
  - [ ] Update event function
  - [ ] Delete event function
  - [ ] List upcoming events function
  - [ ] Add reminders to events

- [ ] Add Interview Management Endpoints
  - [ ] POST /api/applications/{id}/schedule-interview
  - [ ] GET /api/interviews/upcoming
  - [ ] PUT /api/interviews/{id}
  - [ ] DELETE /api/interviews/{id}

- [ ] Database Models
  - [ ] Interview struct
  - [ ] Interview queries (create, read, update, delete)

### ⏳ Week 2 - Days 1-3: Email Follow-up System
- [ ] Extend Gmail Integration (`backend/src/gmail_service.rs`)
  - [ ] Add sending capability (currently read-only)
  - [ ] Template rendering with Handlebars
  - [ ] Variable substitution (company, job_title, date, etc.)

- [ ] Follow-up Scheduler (`backend/src/follow_up_scheduler.rs`)
  - [ ] Calculate follow-up dates (Day 10-14, Day 21-28)
  - [ ] Create follow-up schedule entries
  - [ ] Status management (pending, approved, sent)
  - [ ] Attempt number tracking

- [ ] Follow-up Management Endpoints
  - [ ] POST /api/applications/{id}/create-follow-up
  - [ ] GET /api/follow-ups/pending
  - [ ] PUT /api/follow-ups/{id}/approve
  - [ ] POST /api/follow-ups/{id}/send
  - [ ] DELETE /api/follow-ups/{id} (cancel)

- [ ] Database Models
  - [ ] FollowUpSchedule struct
  - [ ] FollowUpTemplate struct
  - [ ] Communication log integration

### ⏳ Week 2 - Days 4-5: Application Tracking Enhancements
- [ ] Extended Status System
  - [ ] Add status: 'responded', 'interview_scheduled', 'offered'
  - [ ] Update status transition logic
  - [ ] Validate status changes

- [ ] Communication History
  - [ ] GET /api/applications/{id}/timeline
  - [ ] Link communications to interviews and follow-ups
  - [ ] Track last_contact_date automatically

- [ ] Response Tracking
  - [ ] response_received flag
  - [ ] offer_received flag
  - [ ] offer_amount field

### ⏳ Week 3 - Days 1-3: Frontend Implementation
- [ ] Calendar Tab Component (`frontend/src/CalendarTab.tsx`)
  - [ ] Display upcoming interviews (next 30 days)
  - [ ] Calendar view (list or grid)
  - [ ] Schedule interview modal
  - [ ] Interview details display
  - [ ] Edit/cancel interview functionality

- [ ] Follow-ups Tab Component (`frontend/src/FollowupsTab.tsx`)
  - [ ] Pending follow-ups list
  - [ ] Approve/edit/cancel buttons
  - [ ] Template preview
  - [ ] Send confirmation dialog
  - [ ] Follow-up history per application

- [ ] Timeline View Component (`frontend/src/TimelineView.tsx`)
  - [ ] Vertical timeline visualization
  - [ ] Event types: application, communication, interview, follow-up
  - [ ] Expandable event details
  - [ ] Integrated into job details modal

- [ ] Dashboard Enhancements
  - [ ] Upcoming interviews widget (next 7 days)
  - [ ] Follow-up queue counter
  - [ ] Response rate statistics
  - [ ] Add new tabs to navigation

### ⏳ Week 3 - Days 4-5: Testing & Documentation
- [ ] Backend Unit Tests
  - [ ] Calendar OAuth tests
  - [ ] Calendar service tests (create, update, delete events)
  - [ ] Follow-up scheduler tests
  - [ ] Email sending tests
  - [ ] Timeline query tests

- [ ] Frontend E2E Tests (Playwright)
  - [ ] Calendar tab tests (display, schedule, edit)
  - [ ] Follow-ups tab tests (approve, send, cancel)
  - [ ] Timeline view tests
  - [ ] Interview scheduling workflow
  - [ ] Follow-up approval workflow

- [ ] Integration Tests
  - [ ] End-to-end interview scheduling
  - [ ] End-to-end follow-up sending
  - [ ] Google Calendar synchronization
  - [ ] Email template rendering

- [ ] Documentation Updates
  - [ ] Update README_auto-test-plan.md
  - [ ] Update README_auto-test-results.md
  - [ ] Add API documentation for new endpoints
  - [ ] Update CLAUDE.md development guide

## Technical Architecture

### Backend Structure

```
backend/src/
├── main.rs (existing - add new endpoints)
├── calendar_auth.rs (new)
├── calendar_service.rs (new)
├── gmail_service.rs (existing - enhance for sending)
├── follow_up_scheduler.rs (new)
├── models/
│   ├── interview.rs (new)
│   ├── follow_up.rs (new)
│   └── timeline.rs (new)
└── tests/
    ├── calendar_tests.rs (new)
    ├── follow_up_tests.rs (new)
    └── integration_tests.rs (new)
```

### Frontend Structure

```
frontend/src/
├── App.tsx (existing - add new tabs)
├── CalendarTab.tsx (new)
├── FollowupsTab.tsx (new)
├── TimelineView.tsx (new)
├── components/
│   ├── InterviewModal.tsx (new)
│   ├── FollowupApprovalModal.tsx (new)
│   └── TimelineEvent.tsx (new)
└── e2e/tests/
    ├── 12-calendar-management.spec.ts (new)
    ├── 13-follow-ups.spec.ts (new)
    └── 14-timeline-view.spec.ts (new)
```

### Database Tables

```sql
interviews (interview_id, application_id, calendar_event_id, scheduled_date, ...)
follow_up_schedule (follow_up_id, application_id, scheduled_date, attempt_number, status, ...)
follow_up_templates (template_id, template_name, template_type, subject_template, body_template, ...)
communications (enhanced with calendar_event_id, follow_up_id, interview_id)
applications (enhanced with last_contact_date, response_received, offer_received, offer_amount)
```

### API Endpoints

#### Calendar Endpoints
- `POST /api/applications/{id}/schedule-interview` - Schedule new interview
- `GET /api/interviews/upcoming` - Get upcoming interviews (next 30 days)
- `GET /api/interviews/{id}` - Get interview details
- `PUT /api/interviews/{id}` - Update interview
- `DELETE /api/interviews/{id}` - Cancel interview

#### Follow-up Endpoints
- `POST /api/applications/{id}/create-follow-up` - Create follow-up schedule
- `GET /api/follow-ups/pending` - Get pending follow-ups (requiring approval)
- `GET /api/follow-ups/{id}` - Get follow-up details
- `PUT /api/follow-ups/{id}/approve` - Approve follow-up for sending
- `POST /api/follow-ups/{id}/send` - Send approved follow-up
- `PUT /api/follow-ups/{id}` - Edit follow-up content
- `DELETE /api/follow-ups/{id}` - Cancel follow-up

#### Timeline Endpoints
- `GET /api/applications/{id}/timeline` - Get complete application timeline
- `GET /api/applications/{id}/communication-history` - Get all communications

#### OAuth Endpoints
- `GET /api/auth/calendar/url` - Get Google Calendar OAuth URL
- `GET /auth/calendar/callback` - Handle Google Calendar OAuth callback

## Configuration

### Environment Variables (.env)
```bash
# Existing
DATABASE_URL=...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...

# New for Phase 5.1
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8080/auth/calendar/callback
APPLICANT_NAME=Sam Kirk
APPLICANT_EMAIL=sam@samkirk.com
PRIMARY_SKILL=Test Automation
```

### Google Calendar API Setup
1. Enable Google Calendar API in Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add redirect URI: http://localhost:8080/auth/calendar/callback
4. Add scopes:
   - https://www.googleapis.com/auth/calendar
   - https://www.googleapis.com/auth/calendar.events

## Testing Strategy

### Backend Tests (cargo test)
- Unit tests for each module (calendar, follow-up, email)
- Integration tests for OAuth flows
- Database query tests
- Template rendering tests
- **Target**: 25+ new backend tests

### Frontend Tests (Playwright)
- Calendar tab functionality
- Follow-up approval workflow
- Timeline visualization
- Interview scheduling flow
- Email template editing
- **Target**: 20+ new E2E tests

### Manual Testing Checklist
- [ ] Google Calendar OAuth flow
- [ ] Create interview in Google Calendar
- [ ] Receive calendar invite email
- [ ] Edit interview in dashboard
- [ ] Cancel interview (removes from Google Calendar)
- [ ] Create follow-up schedule
- [ ] Approve follow-up email
- [ ] Send follow-up email via Gmail
- [ ] View application timeline
- [ ] Verify response tracking

## Known Challenges

1. **Google Calendar OAuth**: Need to handle token refresh, expiration
2. **Email Rate Limiting**: Gmail API has sending limits (500/day for free tier)
3. **Time Zones**: Handle interview scheduling across time zones correctly
4. **Template Variables**: Ensure all variables are populated before sending
5. **Database Transactions**: Ensure atomic operations for status updates

## Success Criteria

- [ ] ✅ Can schedule interviews in Google Calendar from dashboard
- [ ] ✅ Calendar invites sent to interviewer email
- [ ] ✅ Upcoming interviews displayed in dashboard widget
- [ ] ✅ Follow-ups created automatically (Day 10-14 after application)
- [ ] ✅ Manual approval required before sending follow-ups
- [ ] ✅ Follow-up emails sent via Gmail with job-specific content
- [ ] ✅ Complete application timeline visible per job
- [ ] ✅ Response tracking updates automatically
- [ ] ✅ All 45+ new tests passing (25 backend + 20 E2E)
- [ ] ✅ Documentation updated

## Progress Log

### October 1, 2025
- ✅ Created database migration (migration_phase5.1.sql)
- ✅ Added 3 new tables: interviews, follow_up_schedule, follow_up_templates
- ✅ Enhanced communications and applications tables
- ✅ Created 4 new views for queries
- ✅ Applied migration to database successfully
- ✅ Added Google Calendar dependencies to Cargo.toml
- 🔄 Building backend with new dependencies (in progress)

### Next Session
- [ ] Complete backend build
- [ ] Implement Calendar OAuth module
- [ ] Create initial calendar service functions
- [ ] Add first API endpoint: POST /api/applications/{id}/schedule-interview
