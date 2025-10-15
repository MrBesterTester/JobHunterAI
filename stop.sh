#!/bin/bash

# JobHunter Stop Script
# Safely stops the backend and frontend processes
# Use --full flag to also stop PostgreSQL

set -e

# Parse arguments
STOP_POSTGRES=false
if [ "$1" = "--full" ]; then
    STOP_POSTGRES=true
    echo "🛑 Stopping JobHunter (including PostgreSQL)..."
else
    echo "🛑 Stopping JobHunter..."
fi
echo ""

# Cancel any running syncs before stopping
echo "🔄 Cancelling any running syncs..."
if brew services list | grep postgresql@14 | grep started > /dev/null 2>&1; then
    # Check jobhunter_personal database first (default for this app)
    RUNNING_SYNCS=$(psql -U jobhunter_user -d jobhunter_personal -tAc "SELECT COUNT(*) FROM job_intake_logs WHERE sync_status = 'running'" 2>/dev/null || echo "0")

    if [ "$RUNNING_SYNCS" != "0" ] && [ "$RUNNING_SYNCS" -gt 0 ]; then
        echo "   Found $RUNNING_SYNCS running sync(s) in jobhunter_personal, cancelling..."
        psql -U jobhunter_user -d jobhunter_personal -c "UPDATE job_intake_logs SET sync_status = 'cancelled', sync_completed_at = NOW(), error_details = jsonb_set(COALESCE(error_details, '{}'::jsonb), '{cancellation_reason}', '\"Application shutdown\"') WHERE sync_status = 'running'" > /dev/null 2>&1
        echo "   ✅ Cancelled $RUNNING_SYNCS sync(s)"
    else
        echo "   ℹ️  No running syncs in jobhunter_personal"
    fi
else
    echo "   ℹ️  PostgreSQL not running, skipping sync cleanup"
fi
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
POSTGRES_STOPPED=false

# Try to stop backend (both cargo run and the binary)
echo "🦀 Stopping backend (Rust)..."
BACKEND_RUNNING=false
if check_process 'cargo run' || check_process 'jobhunter-backend'; then
    BACKEND_RUNNING=true
    BACKEND_COUNT=$(count_processes 'cargo run|jobhunter-backend')
    pkill -f 'cargo run' 2>/dev/null || true
    pkill -f 'jobhunter-backend' 2>/dev/null || true
    sleep 1

    # Check if it stopped
    if ! check_process 'cargo run' && ! check_process 'jobhunter-backend'; then
        echo "✅ Backend stopped gracefully ($BACKEND_COUNT process(es))"
        BACKEND_STOPPED=true
    else
        # Try force kill
        echo "⚠️  Backend didn't stop, trying force kill..."
        pkill -9 -f 'cargo run' 2>/dev/null || true
        pkill -9 -f 'jobhunter-backend' 2>/dev/null || true
        sleep 1

        if ! check_process 'cargo run' && ! check_process 'jobhunter-backend'; then
            echo "✅ Backend stopped (forced)"
            BACKEND_STOPPED=true
        else
            echo "❌ Backend still running (may need manual intervention)"
        fi
    fi
fi

if [ "$BACKEND_RUNNING" = false ]; then
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

# Stop PostgreSQL if --full flag was provided
if [ "$STOP_POSTGRES" = true ]; then
    echo "📊 Stopping PostgreSQL..."

    # Check if PostgreSQL is running
    if brew services list | grep postgresql@14 | grep started > /dev/null 2>&1; then
        brew services stop postgresql@14
        sleep 2

        # Verify it stopped
        if ! brew services list | grep postgresql@14 | grep started > /dev/null 2>&1; then
            echo "✅ PostgreSQL stopped"
            POSTGRES_STOPPED=true
        else
            echo "❌ PostgreSQL may still be running"
        fi
    else
        echo "ℹ️  PostgreSQL not running"
        POSTGRES_STOPPED=true
    fi
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final status
if [ "$BACKEND_STOPPED" = true ] && [ "$FRONTEND_STOPPED" = true ]; then
    echo "✨ JobHunter application stopped successfully"
    echo ""

    if [ "$STOP_POSTGRES" = true ]; then
        if [ "$POSTGRES_STOPPED" = true ]; then
            echo "✨ PostgreSQL also stopped"
        else
            echo "⚠️  PostgreSQL may still be running"
        fi
    else
        echo "Note: PostgreSQL is still running"
        echo "To stop it: ./stop.sh --full  OR  brew services stop postgresql@14"
    fi
else
    echo "⚠️  Some processes may still be running"
    echo ""
    echo "Check manually with:"
    echo "  ps aux | grep -E '(cargo run|react-scripts)'"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
