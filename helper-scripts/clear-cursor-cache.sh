#!/bin/bash
# Helper script to clear Cursor's cache (fix markdown preview issues)
# Based on item 4 in README_md-preview-fix.md

set -e

CACHE_DIR="$HOME/Library/Application Support/Cursor/Cache"

echo "🧹 Cursor Cache Cleaner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Detect if running inside Cursor's integrated terminal
if [ -n "$VSCODE_GIT_ASKPASS_NODE" ] || [ -n "$VSCODE_INJECTION" ] || [ "$TERM_PROGRAM" = "vscode" ]; then
    echo "❌ ERROR: This script is running inside Cursor's terminal!"
    echo ""
    echo "This script needs to quit Cursor, which would kill this terminal"
    echo "before the cache can be cleared."
    echo ""
    echo "Please run this script from an external terminal:"
    echo "  1. Open Terminal.app (or iTerm2)"
    echo "  2. Navigate to this directory:"
    echo "     cd \"$(pwd)\""
    echo "  3. Run the script:"
    echo "     ./clear-cursor-cache.sh"
    echo ""
    exit 1
fi

echo ""

# Pre-flight checklist
echo "📋 Pre-flight Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Before clearing the cache, please ensure:"
echo "  1. All files in Cursor are closed (Cmd+W until no tabs remain)"
echo "  2. Claude Code session has been exited (type /exit in Claude Code)"
echo ""
read -p "Have you completed these steps? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "ℹ️  Please complete the checklist steps above, then run this script again."
    echo ""
    exit 0
fi

echo ""
echo "✓ Pre-flight checklist confirmed"
echo ""

# Check if Cursor is running
if pgrep -x "Cursor" > /dev/null; then
    echo "⏹️  Quitting Cursor..."
    osascript -e 'quit app "Cursor"'

    # Wait for Cursor to fully quit
    sleep 2

    # Double-check it's closed
    if pgrep -x "Cursor" > /dev/null; then
        echo "⚠️  Cursor is still running. Please quit Cursor manually and try again."
        exit 1
    fi
else
    echo "✓ Cursor is not running"
fi

echo ""

# Check if cache directory exists
if [ -d "$CACHE_DIR" ]; then
    echo "🗑️  Clearing cache directory..."
    rm -rf "$CACHE_DIR"
    echo "✓ Cache cleared: $CACHE_DIR"
else
    echo "ℹ️  Cache directory doesn't exist (already clean)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done!"
echo ""

# Ask if user wants to restart Cursor
read -p "Restart Cursor now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Launching Cursor..."
    open -a "Cursor"
    echo "✓ Cursor launched"
else
    echo "ℹ️  You can restart Cursor manually when ready"
fi

echo ""
