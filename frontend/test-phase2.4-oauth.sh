#!/bin/bash
# Phase 2.4 OAuth Integration Test Script
# Tests actual Google Calendar event creation and Gmail email sending

set -e

echo "🧪 Phase 2.4 OAuth Integration Testing"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get application ID for testing
APP_ID=$(psql -U jobhunter_user -d jobhunter_personal -t -c \
  "SELECT application_id FROM applications ORDER BY date_applied DESC LIMIT 1;")
APP_ID=$(echo $APP_ID | xargs) # trim whitespace

if [ -z "$APP_ID" ]; then
  echo "❌ No applications found. Please create an application first."
  exit 1
fi

echo -e "${BLUE}Using application ID: $APP_ID${NC}"
echo ""

# Test 1: Create Interview (triggers Google Calendar event creation)
echo "📅 Test 1: Creating interview (should create Google Calendar event)"
echo "-------------------------------------------------------------------"

INTERVIEW_DATE=$(date -u -v+7d '+%Y-%m-%dT10:00:00Z' 2>/dev/null || date -u -d '+7 days' '+%Y-%m-%dT10:00:00Z')

INTERVIEW_RESPONSE=$(curl -s -X POST http://localhost:8080/api/interviews \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "'"$APP_ID"'",
    "interview_type": "phone",
    "scheduled_date": "'"$INTERVIEW_DATE"'",
    "duration_minutes": 60,
    "location": "Phone call",
    "interviewer_name": "Jane Smith",
    "interviewer_email": "jane.smith@example.com",
    "notes": "Phase 2.4 OAuth integration test"
  }')

echo "$INTERVIEW_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INTERVIEW_RESPONSE"
echo ""

INTERVIEW_ID=$(echo "$INTERVIEW_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('interview_id', ''))" 2>/dev/null || echo "")

if [ -n "$INTERVIEW_ID" ]; then
  echo -e "${GREEN}✅ Interview created: $INTERVIEW_ID${NC}"

  # Check if calendar_event_id was set
  CALENDAR_EVENT_ID=$(psql -U jobhunter_user -d jobhunter_personal -t -c \
    "SELECT calendar_event_id FROM interviews WHERE interview_id = '$INTERVIEW_ID';")
  CALENDAR_EVENT_ID=$(echo $CALENDAR_EVENT_ID | xargs)

  if [ -n "$CALENDAR_EVENT_ID" ]; then
    echo -e "${GREEN}✅ Google Calendar event created: $CALENDAR_EVENT_ID${NC}"
    echo -e "${YELLOW}👉 Please check your Google Calendar at: https://calendar.google.com${NC}"
  else
    echo -e "${YELLOW}⚠️  No calendar_event_id found (OAuth may not be configured or failed)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Interview creation failed or returned unexpected response${NC}"
fi

echo ""
echo ""

# Test 2: Create Follow-up Schedule (doesn't send immediately)
echo "📧 Test 2: Creating follow-up schedule"
echo "---------------------------------------"

FOLLOWUP_DATE=$(date -u '+%Y-%m-%dT10:00:00Z')

FOLLOWUP_RESPONSE=$(curl -s -X POST http://localhost:8080/api/follow-ups \
  -H "Content-Type: application/json" \
  -d '{
    "application_id": "'"$APP_ID"'",
    "scheduled_date": "'"$FOLLOWUP_DATE"'",
    "attempt_number": 1,
    "template_id": null,
    "custom_subject": "Following up on my application",
    "custom_body": "Hello,\n\nI wanted to follow up on my application for the {{job_title}} position at {{company}}.\n\nBest regards,\n{{applicant_name}}"
  }')

echo "$FOLLOWUP_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$FOLLOWUP_RESPONSE"
echo ""

FOLLOWUP_ID=$(echo "$FOLLOWUP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('follow_up_id', ''))" 2>/dev/null || echo "")

if [ -n "$FOLLOWUP_ID" ]; then
  echo -e "${GREEN}✅ Follow-up schedule created: $FOLLOWUP_ID${NC}"
  echo ""

  # Test 3: Send Follow-up (triggers Gmail API email sending)
  echo "📧 Test 3: Sending follow-up email (should send via Gmail API)"
  echo "--------------------------------------------------------------"

  SEND_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/follow-ups/$FOLLOWUP_ID/send" \
    -H "Content-Type: application/json")

  echo "$SEND_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SEND_RESPONSE"
  echo ""

  # Check if email was sent
  FOLLOWUP_STATUS=$(psql -U jobhunter_user -d jobhunter_personal -t -c \
    "SELECT status FROM follow_up_schedule WHERE follow_up_id = '$FOLLOWUP_ID';")
  FOLLOWUP_STATUS=$(echo $FOLLOWUP_STATUS | xargs)

  if [ "$FOLLOWUP_STATUS" = "sent" ]; then
    echo -e "${GREEN}✅ Follow-up email sent successfully!${NC}"
    echo -e "${YELLOW}👉 Please check your Gmail sent folder at: https://mail.google.com/mail/u/0/#sent${NC}"

    # Show communication record
    echo ""
    echo "Communication record:"
    psql -U jobhunter_user -d jobhunter_personal -c \
      "SELECT communication_id, communication_type, direction, subject, sent_date
       FROM communications
       WHERE application_id = '$APP_ID'
       ORDER BY sent_date DESC LIMIT 1;"
  else
    echo -e "${YELLOW}⚠️  Follow-up status is: $FOLLOWUP_STATUS (expected 'sent')${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Follow-up creation failed or returned unexpected response${NC}"
fi

echo ""
echo ""
echo "📊 Summary"
echo "=========="
echo ""
echo "Database state after testing:"
echo ""
echo "Interviews:"
psql -U jobhunter_user -d jobhunter_personal -c \
  "SELECT interview_id, interview_type, scheduled_date, status,
          calendar_event_id IS NOT NULL as has_calendar_event
   FROM interviews
   WHERE application_id = '$APP_ID';"

echo ""
echo "Follow-ups:"
psql -U jobhunter_user -d jobhunter_personal -c \
  "SELECT follow_up_id, scheduled_date, status, attempt_number
   FROM follow_up_schedule
   WHERE application_id = '$APP_ID';"

echo ""
echo "Communications:"
psql -U jobhunter_user -d jobhunter_personal -c \
  "SELECT communication_type, direction, subject, sent_date
   FROM communications
   WHERE application_id = '$APP_ID'
   ORDER BY sent_date DESC
   LIMIT 3;"

echo ""
echo "✅ Phase 2.4 OAuth integration testing complete!"
echo ""
echo "Manual Verification Steps:"
echo "1. Check Google Calendar: https://calendar.google.com"
echo "   - Look for interview event on $(date -u -v+7d '+%Y-%m-%d' 2>/dev/null || date -u -d '+7 days' '+%Y-%m-%d')"
echo "2. Check Gmail sent folder: https://mail.google.com/mail/u/0/#sent"
echo "   - Look for follow-up email sent just now"
echo ""
