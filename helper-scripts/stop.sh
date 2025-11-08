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

# Try to stop frontend (react-scripts and rsbuild)
echo "⚛️  Stopping frontend (React/RSBuild)..."
FRONTEND_RUNNING=false

# Check for react-scripts
if check_process 'react-scripts'; then
    FRONTEND_RUNNING=true
    FRONTEND_COUNT=$(count_processes 'react-scripts')
    pkill -f 'react-scripts' 2>/dev/null || true
    sleep 1

    # Check if it stopped
    if ! check_process 'react-scripts'; then
        echo "✅ React frontend stopped gracefully ($FRONTEND_COUNT process(es))"
        FRONTEND_STOPPED=true
    else
        # Try force kill
        echo "⚠️  React frontend didn't stop, trying force kill..."
        pkill -9 -f 'react-scripts' 2>/dev/null || true
        sleep 1

        if ! check_process 'react-scripts'; then
            echo "✅ React frontend stopped (forced)"
            FRONTEND_STOPPED=true
        else
            echo "❌ React frontend still running (may need manual intervention)"
        fi
    fi
fi

# Check for rsbuild
if check_process 'rsbuild'; then
    FRONTEND_RUNNING=true
    RSBUILD_COUNT=$(count_processes 'rsbuild')
    pkill -f 'rsbuild' 2>/dev/null || true
    sleep 1

    # Check if it stopped
    if ! check_process 'rsbuild'; then
        echo "✅ RSBuild frontend stopped gracefully ($RSBUILD_COUNT process(es))"
        FRONTEND_STOPPED=true
    else
        # Try force kill
        echo "⚠️  RSBuild frontend didn't stop, trying force kill..."
        pkill -9 -f 'rsbuild' 2>/dev/null || true
        sleep 1

        if ! check_process 'rsbuild'; then
            echo "✅ RSBuild frontend stopped (forced)"
            FRONTEND_STOPPED=true
        else
            echo "❌ RSBuild frontend still running (may need manual intervention)"
        fi
    fi
fi

if [ "$FRONTEND_RUNNING" = false ]; then
    echo "ℹ️  Frontend not running"
    FRONTEND_STOPPED=true
fi

echo ""

# Clean up orphaned test processes
echo "🧹 Cleaning up orphaned test processes..."
ORPHANED_PROCESSES=false

# Check for orphaned Playwright processes
if check_process 'playwright test'; then
    ORPHANED_PROCESSES=true
    PLAYWRIGHT_COUNT=$(count_processes 'playwright test')
    echo "   Found $PLAYWRIGHT_COUNT orphaned Playwright process(es)"
    pkill -f 'playwright test' 2>/dev/null || true
    sleep 1

    if ! check_process 'playwright test'; then
        echo "   ✅ Cleaned up Playwright processes"
    else
        echo "   ⚠️  Some Playwright processes may still be running"
    fi
fi

if [ "$ORPHANED_PROCESSES" = false ]; then
    echo "ℹ️  No orphaned processes found"
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

# Verify ports are available (for preflight use)
echo "🔌 Verifying ports are available..."
PORT_CHECK_FAILED=false

# Check port 8080 (backend)
if lsof -ti:8080 > /dev/null 2>&1; then
    PORT_8080_PID=$(lsof -ti:8080)
    echo "⚠️  Port 8080 still in use by PID $PORT_8080_PID"
    PORT_CHECK_FAILED=true
else
    echo "✅ Port 8080 available"
fi

# Check port 3000 (frontend)
if lsof -ti:3000 > /dev/null 2>&1; then
    PORT_3000_PID=$(lsof -ti:3000)
    echo "⚠️  Port 3000 still in use by PID $PORT_3000_PID"
    PORT_CHECK_FAILED=true
else
    echo "✅ Port 3000 available"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Final status
if [ "$BACKEND_STOPPED" = true ] && [ "$FRONTEND_STOPPED" = true ] && [ "$PORT_CHECK_FAILED" = false ]; then
    echo "✨ JobHunter application stopped successfully"
    echo "✅ All ports available for testing"
    echo ""

    if [ "$STOP_POSTGRES" = true ]; then
        if [ "$POSTGRES_STOPPED" = true ]; then
            echo "✨ PostgreSQL also stopped"
        else
            echo "⚠️  PostgreSQL may still be running"
        fi
    else
        echo "Note: PostgreSQL is still running (required for tests)"
        echo "To stop it: ./stop.sh --full  OR  brew services stop postgresql@14"
    fi

    # Exit 0 for success (for preflight use)
    exit 0
else
    echo "⚠️  Some processes may still be running or ports occupied"
    echo ""
    echo "Check manually with:"
    echo "  ps aux | grep -E '(cargo run|react-scripts|rsbuild|playwright)'"
    echo "  lsof -ti:8080  # Check backend port"
    echo "  lsof -ti:3000  # Check frontend port"

    # Exit 1 for failure (for preflight use)
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
