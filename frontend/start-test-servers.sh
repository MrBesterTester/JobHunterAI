#!/bin/bash

# Test Server Startup Script
# Starts backend and frontend for Playwright E2E tests

set -e

echo "🧪 Starting test servers..."

# Check if PostgreSQL is running
if ! brew services list | grep postgresql@14 | grep started > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Starting it..."
    brew services start postgresql@14
    sleep 3
fi

# Check if backend is already running
if curl -s http://localhost:8080/api/jobs > /dev/null 2>&1; then
    echo "✅ Backend already running on port 8080"
else
    echo "🦀 Starting backend server..."
    cd ../backend
    export TMPDIR=$HOME/tmp
    mkdir -p $TMPDIR
    cargo run > /dev/null 2>&1 &
    BACKEND_PID=$!
    cd ../frontend

    # Wait for backend to be ready
    echo "⏳ Waiting for backend..."
    for i in {1..30}; do
        if curl -s http://localhost:8080/api/jobs > /dev/null 2>&1; then
            echo "✅ Backend ready at http://localhost:8080"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Backend failed to start"
            kill $BACKEND_PID 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
fi

# Start frontend (Playwright will handle this)
echo "✅ Test servers ready"
