#!/bin/bash

# Restart PostgreSQL Database Service
# Restarts the PostgreSQL@14 service via Homebrew

set -e

echo "🔄 Restarting PostgreSQL..."
echo ""

# Check if PostgreSQL service exists
if ! brew services list | grep postgresql@14 > /dev/null 2>&1; then
    echo "❌ PostgreSQL@14 service not found!"
    echo "   Install with: brew install postgresql@14"
    exit 1
fi

# Restart the service
brew services restart postgresql@14

echo "✅ PostgreSQL restarted"
echo ""

# Wait a moment for it to fully start
sleep 2

# Verify it's running
if brew services list | grep postgresql@14 | grep started > /dev/null 2>&1; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✨ PostgreSQL is running"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "⚠️  PostgreSQL may not have started properly"
    echo "   Check status with: brew services list"
fi
