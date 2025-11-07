#!/bin/bash
#
# Cleanup orphaned email_jobs records that correspond to rejected emails
# (emails with JobOps-OLD label in Gmail)
#
# This script:
# 1. Queries Gmail API for messages with JobOps-OLD label
# 2. Deletes email_jobs records that match those message IDs AND have job_id IS NULL
# 3. Reports what was deleted

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Cleaning up orphaned rejected emails...${NC}"
echo ""

# Get database name from .env or use default
DB_NAME=${POSTGRES_DB:-jobhunter_personal}

# Get Gmail OAuth token from database
echo -e "${BLUE}📧 Getting Gmail OAuth token...${NC}"
ACCESS_TOKEN=$(psql -U jobhunter_user -d "$DB_NAME" -t -c "
    SELECT access_token FROM oauth_credentials
    WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'gmail' LIMIT 1)
    LIMIT 1
" | xargs)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "" ]; then
    echo -e "${RED}❌ Error: No Gmail OAuth token found${NC}"
    echo "Please sync Gmail in the app to refresh the token"
    exit 1
fi

echo -e "${GREEN}✅ OAuth token retrieved${NC}"
echo ""

# Get JobOps-OLD label ID
echo -e "${BLUE}🏷️  Getting JobOps-OLD label ID...${NC}"
LABELS_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://gmail.googleapis.com/gmail/v1/users/me/labels")

JOBOPS_OLD_LABEL_ID=$(echo "$LABELS_RESPONSE" | jq -r '.labels[] | select(.name == "JobOps-OLD") | .id')

if [ -z "$JOBOPS_OLD_LABEL_ID" ] || [ "$JOBOPS_OLD_LABEL_ID" = "null" ]; then
    echo -e "${YELLOW}⚠️  JobOps-OLD label not found in Gmail${NC}"
    echo "No cleanup needed - no rejected emails to remove"
    exit 0
fi

echo -e "${GREEN}✅ JobOps-OLD label ID: $JOBOPS_OLD_LABEL_ID${NC}"
echo ""

# Get all messages with JobOps-OLD label
echo -e "${BLUE}📬 Fetching messages with JobOps-OLD label...${NC}"
MESSAGES_RESPONSE=$(curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=$JOBOPS_OLD_LABEL_ID&maxResults=500")

# Extract message IDs
MESSAGE_IDS=$(echo "$MESSAGES_RESPONSE" | jq -r '.messages[]?.id' | grep -v '^$' || true)

if [ -z "$MESSAGE_IDS" ]; then
    echo -e "${YELLOW}⚠️  No messages with JobOps-OLD label found${NC}"
    echo "No cleanup needed"
    exit 0
fi

MESSAGE_COUNT=$(echo "$MESSAGE_IDS" | wc -l | xargs)
echo -e "${GREEN}✅ Found $MESSAGE_COUNT messages with JobOps-OLD label${NC}"
echo ""

# Show which email_jobs will be deleted
echo -e "${BLUE}🔍 Checking which orphaned email_jobs match...${NC}"

# Build SQL array of message IDs
MESSAGE_IDS_ARRAY=$(echo "$MESSAGE_IDS" | awk '{printf "\047%s\047,", $0}' | sed 's/,$//')

MATCHING_RECORDS=$(psql -U jobhunter_user -d "$DB_NAME" -t -c "
    SELECT email_job_id, message_id, subject, sender_email
    FROM email_jobs
    WHERE job_id IS NULL
    AND message_id IN ($MESSAGE_IDS_ARRAY)
" || true)

if [ -z "$MATCHING_RECORDS" ]; then
    echo -e "${YELLOW}⚠️  No orphaned email_jobs found matching JobOps-OLD messages${NC}"
    echo "Database already clean"
    exit 0
fi

echo -e "${YELLOW}📋 Will delete the following orphaned email_jobs:${NC}"
echo "$MATCHING_RECORDS"
echo ""

# Ask for confirmation
read -p "$(echo -e ${YELLOW}Delete these records? [y/N]: ${NC})" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}ℹ️  Cleanup cancelled${NC}"
    exit 0
fi

# Delete the records
echo -e "${BLUE}🗑️  Deleting orphaned email_jobs...${NC}"

DELETE_RESULT=$(psql -U jobhunter_user -d "$DB_NAME" -t -c "
    DELETE FROM email_jobs
    WHERE job_id IS NULL
    AND message_id IN ($MESSAGE_IDS_ARRAY)
    RETURNING email_job_id
")

DELETED_COUNT=$(echo "$DELETE_RESULT" | grep -v '^$' | wc -l | xargs)

echo -e "${GREEN}✅ Deleted $DELETED_COUNT orphaned email_jobs records${NC}"
echo ""

# Show remaining orphaned records
REMAINING=$(psql -U jobhunter_user -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM email_jobs WHERE job_id IS NULL
" | xargs)

echo -e "${BLUE}📊 Summary:${NC}"
echo "  - Deleted: $DELETED_COUNT rejected email records"
echo "  - Remaining orphaned: $REMAINING"
echo ""

if [ "$REMAINING" -gt 0 ]; then
    echo -e "${YELLOW}ℹ️  Remaining orphaned records are genuinely ignored non-job emails${NC}"
    psql -U jobhunter_user -d "$DB_NAME" -c "
        SELECT message_id, subject, sender_email, received_date
        FROM email_jobs
        WHERE job_id IS NULL
        ORDER BY received_date DESC
    "
fi

echo ""
echo -e "${GREEN}✅ Cleanup complete!${NC}"
