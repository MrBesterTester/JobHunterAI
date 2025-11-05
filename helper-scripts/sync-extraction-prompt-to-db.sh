#!/bin/bash
# Sync extraction prompt from markdown file to database
# Automatically removes TOC section before syncing

set -e  # Exit on error

PROMPT_FILE="prompts/job_extraction_default.md"
DB_USER="jobhunter_user"
DB_NAME="jobhunter_personal"

echo "═══════════════════════════════════════════"
echo "Extraction Prompt Sync Tool"
echo "═══════════════════════════════════════════"
echo ""

# Check if prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "❌ Error: Prompt file not found: $PROMPT_FILE"
    exit 1
fi

# Read the file and remove the TOC section (first 33 lines)
echo "📄 Reading prompt from: $PROMPT_FILE"
PROMPT_CONTENT=$(sed '1,33d' "$PROMPT_FILE")

# Get file size info
ORIGINAL_SIZE=$(wc -c < "$PROMPT_FILE")
CLEANED_SIZE=$(echo "$PROMPT_CONTENT" | wc -c)
SAVED_BYTES=$((ORIGINAL_SIZE - CLEANED_SIZE))

echo "   Original size: $ORIGINAL_SIZE bytes"
echo "   Cleaned size:  $CLEANED_SIZE bytes"
echo "   TOC removed:   $SAVED_BYTES bytes saved"
echo ""

# Get current database prompt info
echo "📊 Current database prompt info:"
CURRENT_VERSION=$(psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT version FROM extraction_prompts WHERE is_active = true;")
CURRENT_SIZE=$(psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT LENGTH(prompt_content) FROM extraction_prompts WHERE is_active = true;")
echo "   Version: $CURRENT_VERSION"
echo "   Size:    $CURRENT_SIZE bytes"
echo ""

# Confirm before syncing
read -p "🔄 Sync to database (version will be incremented to $((CURRENT_VERSION + 1)))? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Sync cancelled"
    exit 0
fi

# Create SQL file with dollar-quote syntax
echo "💾 Syncing to database..."

# Use heredoc with proper escaping
psql -U "$DB_USER" -d "$DB_NAME" <<EOF
UPDATE extraction_prompts
SET prompt_content = \$PROMPT\$
$PROMPT_CONTENT
\$PROMPT\$,
version = version + 1,
updated_at = NOW()
WHERE is_active = true;
EOF

# Verify the update
NEW_VERSION=$(psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT version FROM extraction_prompts WHERE is_active = true;")
NEW_SIZE=$(psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT LENGTH(prompt_content) FROM extraction_prompts WHERE is_active = true;")

echo ""
echo "═══════════════════════════════════════════"
echo "✅ Sync completed successfully!"
echo "═══════════════════════════════════════════"
echo "   New version: $NEW_VERSION"
echo "   New size:    $NEW_SIZE bytes"
echo ""
echo "💡 The prompt is now active in the database."
echo "   Next job extractions will use this version."
echo ""
