#!/bin/bash

# tag-session.sh - Tag daily work session milestones
# Usage: ./tag-session.sh [session-type] [optional-message]
# Examples:
#   ./tag-session.sh end-of-am
#   ./tag-session.sh end-of-pm
#   ./tag-session.sh end-of-pm "Completed Phase 2.4 pagination"

set -e

# Get session type (default: end-of-pm)
SESSION_TYPE="${1:-end-of-pm}"

# Get current date in YYYY-MM-DD format
DATE=$(date +%Y-%m-%d)

# Construct tag name
TAG_NAME="${SESSION_TYPE}-${DATE}"

# Get optional message (default: generic message)
if [ -n "$2" ]; then
    MESSAGE="$2"
else
    MESSAGE="Work session: ${SESSION_TYPE} on ${DATE}"
fi

# Check if tag already exists
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo "❌ Tag '$TAG_NAME' already exists!"
    echo ""
    echo "Options:"
    echo "  1. Use a different session type: ./tag-session.sh end-of-evening"
    echo "  2. Force update (moves tag): git tag -f \"$TAG_NAME\" -m \"$MESSAGE\""
    echo "  3. View existing tag: git show \"$TAG_NAME\""
    exit 1
fi

# Create annotated tag
git tag -a "$TAG_NAME" -m "$MESSAGE"

echo "✅ Created tag: $TAG_NAME"
echo "📝 Message: $MESSAGE"
echo ""
echo "Useful commands:"
echo "  View this tag:     git show $TAG_NAME"
echo "  List all tags:     ./list-sessions.sh"
echo "  Push to remote:    git push origin $TAG_NAME"
echo "  Push all tags:     git push origin --tags"
