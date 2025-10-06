#!/bin/bash

# JobHunter Stop Script
# Safely stops the backend and frontend processes

set -e

echo "🛑 Stopping JobHunter..."
echo ""

# Function to check if process is running
check_process() {
    local pattern=$1
    pgrep -f "$pattern" > /dev/null 2>&1
}

# Function to count processes
count_processes() {
    local pattern=$1
    pgrep -f "$pattern" 2>/dev/null | wc -l | tr -d ' '
}

# Track what we stopped
BACKEND_STOPPED=false
FRONTEND_STOPPED=false

# Try to stop backend (cargo run)
echo "🦀 Stopping backend (Rust)..."
if check_process 'cargo run'; then
    BACKEND_COUNT=$(count_processes 'cargo run')
    pkill -f 'cargo run' 2>/dev/null || true
    sleep 1

    # Check if it stopped
    if ! check_process 'cargo run'; then
        echo "✅ Backend stopped gracefully ($BACKEND_COUNT process(es))"
        BACKEND_STOPPED=true
    else
        # Try force kill
        echo "⚠️  Backend didn't stop, trying force kill..."
        pkill -9 -f 'cargo run' 2>/dev/null || true
        sleep 1

        if ! check_process 'cargo run'; then
            echo "✅ Backend stopped (forced)"
            BACKEND_STOPPED=true
        else
            echo "❌ Backend still running (may need manual intervention)"
        fi
    fi
else
    echo "ℹ️  Backend not running"
    BACKEND_STOPPED=true
fi

echo ""

# Try to stop frontend (react-scripts)
echo "⚛️  Stopping frontend (React)..."
if check_process 'react-scripts'; then
    FRONTEND_COUNT=$(count_processes 'react-scripts')
    pkill -f 'react-scripts' 2>/dev/null || true
    sleep 1

    # Check if it stopped
    if ! check_process 'react-scripts'; then
        echo "✅ Frontend stopped gracefully ($FRONTEND_COUNT process(es))"
        FRONTEND_STOPPED=true
    else
        # Try force kill
        echo "⚠️  Frontend didn't stop, trying force kill..."
        pkill -9 -f 'react-scripts' 2>/dev/null || true
        sleep 1

        if ! check_process 'react-scripts'; then
            echo "✅ Frontend stopped (forced)"
            FRONTEND_STOPPED=true
        else
            echo "❌ Frontend still running (may need manual intervention)"
        fi
    fi
else
    echo "ℹ️  Frontend not running"
    FRONTEND_STOPPED=true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final status
if [ "$BACKEND_STOPPED" = true ] && [ "$FRONTEND_STOPPED" = true ]; then
    echo "✨ JobHunter stopped successfully"
    echo ""
    echo "Note: PostgreSQL is still running"
    echo "To stop PostgreSQL: brew services stop postgresql@14"
else
    echo "⚠️  Some processes may still be running"
    echo ""
    echo "Check manually with:"
    echo "  ps aux | grep -E '(cargo run|react-scripts)'"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
