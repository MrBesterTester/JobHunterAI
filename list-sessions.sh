#!/bin/bash

# list-sessions.sh - List all work session tags
# Usage: ./list-sessions.sh [options]
# Examples:
#   ./list-sessions.sh              # List all session tags
#   ./list-sessions.sh --today      # Show only today's sessions
#   ./list-sessions.sh --week       # Show this week's sessions
#   ./list-sessions.sh --detailed   # Show with commit messages

set -e

MODE="${1:-all}"
TODAY=$(date +%Y-%m-%d)
WEEK_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d 2>/dev/null)

# Get all session tags (end-of-am, end-of-pm, etc.)
ALL_TAGS=$(git tag -l "*-[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]" | sort -V)

if [ -z "$ALL_TAGS" ]; then
    echo "No session tags found."
    echo ""
    echo "Create your first tag with: ./tag-session.sh end-of-pm"
    exit 0
fi

case "$MODE" in
    --today)
        echo "📅 Today's work sessions ($TODAY):"
        echo ""
        echo "$ALL_TAGS" | grep "$TODAY" || echo "  No sessions tagged today"
        ;;

    --week)
        echo "📅 This week's work sessions:"
        echo ""
        echo "$ALL_TAGS" | while read -r tag; do
            TAG_DATE=$(echo "$tag" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
            if [[ "$TAG_DATE" > "$WEEK_AGO" ]] || [[ "$TAG_DATE" == "$WEEK_AGO" ]]; then
                echo "  $tag"
            fi
        done
        ;;

    --detailed)
        echo "📅 All work sessions (with details):"
        echo ""
        echo "$ALL_TAGS" | while read -r tag; do
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "Tag: $tag"
            git show -s --format="Date: %ai%nCommit: %h%nMessage: %s%nTag Note: %N" "$tag" | grep -v "^$"
            echo ""
        done
        ;;

    *)
        echo "📅 All work session tags:"
        echo ""
        echo "$ALL_TAGS" | sed 's/^/  /'
        echo ""
        echo "Count: $(echo "$ALL_TAGS" | wc -l | xargs)"
        echo ""
        echo "Options:"
        echo "  --today      Show only today's sessions"
        echo "  --week       Show this week's sessions"
        echo "  --detailed   Show with commit details"
        ;;
esac

echo ""
echo "To view a specific tag: git show <tag-name>"
echo "To checkout a session: git checkout <tag-name>"
