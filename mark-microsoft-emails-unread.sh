#!/bin/bash

# Mark Microsoft Emails as Unread in JobOps Folder
# Uses Microsoft Graph API to mark all emails in JobOps folder as unread
# Useful for testing email sync functionality

set -e

DB_USER="jobhunter_user"
DB_NAME="jobhunter_personal"

echo "🔄 Mark Microsoft Emails as Unread"
echo ""

# Get access token from database
echo "📊 Fetching Microsoft OAuth credentials from database..."
TOKEN_DATA=$(psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "
    SELECT access_token, token_expires_at
    FROM oauth_credentials
    WHERE source_id = (SELECT source_id FROM job_sources WHERE source_name = 'microsoft_email')
    LIMIT 1;
")

if [ -z "$TOKEN_DATA" ]; then
    echo "❌ No Microsoft OAuth credentials found"
    echo "   Please authenticate via the Intake tab first"
    exit 1
fi

ACCESS_TOKEN=$(echo "$TOKEN_DATA" | cut -d '|' -f 1)
EXPIRES_AT=$(echo "$TOKEN_DATA" | cut -d '|' -f 2)

echo "✅ Token found (expires: $EXPIRES_AT)"
echo ""

# Get JobOps folder ID
echo "📁 Finding JobOps folder..."
FOLDER_RESPONSE=$(curl -s -X GET \
    "https://graph.microsoft.com/v1.0/me/mailFolders?\$filter=displayName eq 'JobOps'" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")

FOLDER_ID=$(echo "$FOLDER_RESPONSE" | jq -r '.value[0].id // empty')

if [ -z "$FOLDER_ID" ]; then
    echo "❌ JobOps folder not found"
    echo "   Response: $FOLDER_RESPONSE"
    exit 1
fi

echo "✅ JobOps folder found (ID: ${FOLDER_ID:0:20}...)"
echo ""

# Get all messages in JobOps folder
echo "📧 Fetching messages from JobOps folder..."
MESSAGES_RESPONSE=$(curl -s -X GET \
    "https://graph.microsoft.com/v1.0/me/mailFolders/$FOLDER_ID/messages?\$select=id,subject,isRead&\$top=50" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")

MESSAGE_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '.value | length')
echo "✅ Found $MESSAGE_COUNT messages"
echo ""

# Mark each message as unread
UNREAD_COUNT=0
ALREADY_UNREAD=0

echo "🔄 Marking messages as unread..."
while read -r MESSAGE_ID SUBJECT IS_READ; do
    if [ "$IS_READ" = "true" ]; then
        # Mark as unread
        curl -s -X PATCH \
            "https://graph.microsoft.com/v1.0/me/messages/$MESSAGE_ID" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"isRead": false}' > /dev/null

        echo "  ✓ Marked as unread: $SUBJECT"
        ((UNREAD_COUNT++))
    else
        echo "  - Already unread: $SUBJECT"
        ((ALREADY_UNREAD++))
    fi
done < <(echo "$MESSAGES_RESPONSE" | jq -r '.value[] | "\(.id) \(.subject) \(.isRead)"')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Complete!"
echo ""
echo "  Marked as unread: $UNREAD_COUNT"
echo "  Already unread:   $ALREADY_UNREAD"
echo "  Total messages:   $MESSAGE_COUNT"
echo ""
echo "💡 You can now run Microsoft email sync in JobHunter"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
