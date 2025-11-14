#!/bin/bash

# JobHunter Stop Script
# Safely stops the backend and frontend processes
# Use --full flag to also stop PostgreSQL

set -e

# Function to display help message
show_help() {
    cat << EOF
Usage: ./helper-scripts/stop.sh [OPTIONS]

Stops JobHunter services (backend, frontend, and optionally PostgreSQL)

OPTIONS:
    -b, --backend-only       Stop only backend (keep frontend running)
    -f, --frontend-only      Stop only frontend (keep backend running)
    --full                   Stop all services including PostgreSQL
    -h, --help               Show this help message

EXAMPLES:
    # Stop backend and frontend (default)
    ./helper-scripts/stop.sh

    # Stop everything including PostgreSQL
    ./helper-scripts/stop.sh --full

    # Stop only backend
    ./helper-scripts/stop.sh --backend-only

    # Stop only frontend
    ./helper-scripts/stop.sh --frontend-only

NOTE:
    By default, PostgreSQL remains running (required for tests).
    Use --full to stop PostgreSQL as well.

EOF
}

# Parse arguments
STOP_POSTGRES=false
STOP_BACKEND=true
STOP_FRONTEND=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            STOP_POSTGRES=true
            shift
            ;;
        -b|--backend-only)
            STOP_FRONTEND=false
            shift
            ;;
        -f|--frontend-only)
            STOP_BACKEND=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# Validate configuration
if [ "$STOP_BACKEND" = false ] && [ "$STOP_FRONTEND" = false ]; then
    echo "❌ Error: Cannot use --backend-only and --frontend-only together"
    echo ""
    show_help
    exit 1
fi

# Show what we're stopping
if [ "$STOP_POSTGRES" = true ]; then
    echo "🛑 Stopping JobHunter (including PostgreSQL)..."
elif [ "$STOP_BACKEND" = false ]; then
    echo "🛑 Stopping frontend only..."
elif [ "$STOP_FRONTEND" = false ]; then
    echo "🛑 Stopping backend only..."
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
if [ "$STOP_BACKEND" = true ]; then
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
else
    # Skip backend, assume it's stopped successfully
    BACKEND_STOPPED=true
fi

# Try to stop frontend (react-scripts and rsbuild)
if [ "$STOP_FRONTEND" = true ]; then
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
else
    # Skip frontend, assume it's stopped successfully
    FRONTEND_STOPPED=true
fi

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

# Check for orphaned cargo test processes
if check_process 'cargo test'; then
    ORPHANED_PROCESSES=true
    CARGO_TEST_COUNT=$(count_processes 'cargo test')
    echo "   Found $CARGO_TEST_COUNT orphaned cargo test process(es)"
    pkill -f 'cargo test' 2>/dev/null || true
    sleep 1

    if ! check_process 'cargo test'; then
        echo "   ✅ Cleaned up cargo test processes"
    else
        echo "   ⚠️  Some cargo test processes may still be running"
    fi
fi

# Check for orphaned npm/jest test processes
if check_process 'jest'; then
    ORPHANED_PROCESSES=true
    JEST_COUNT=$(count_processes 'jest')
    echo "   Found $JEST_COUNT orphaned jest process(es)"
    pkill -f 'jest' 2>/dev/null || true
    sleep 1

    if ! check_process 'jest'; then
        echo "   ✅ Cleaned up jest processes"
    else
        echo "   ⚠️  Some jest processes may still be running"
    fi
fi

# Check for orphaned Rust compiler processes (rustc, rust-analyzer)
if check_process 'rustc.*jobhunter'; then
    ORPHANED_PROCESSES=true
    RUSTC_COUNT=$(count_processes 'rustc.*jobhunter')
    echo "   Found $RUSTC_COUNT orphaned rustc process(es)"
    pkill -f 'rustc.*jobhunter' 2>/dev/null || true
    sleep 1

    if ! check_process 'rustc.*jobhunter'; then
        echo "   ✅ Cleaned up rustc processes"
    else
        echo "   ⚠️  Some rustc processes may still be running"
    fi
fi

# Force kill anything still on ports 8080 or 3000 (last resort)
if lsof -ti:8080 > /dev/null 2>&1; then
    ORPHANED_PROCESSES=true
    PORT_8080_PIDS=$(lsof -ti:8080 | tr '\n' ' ')
    echo "   Found process(es) on port 8080: $PORT_8080_PIDS"
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 1

    if ! lsof -ti:8080 > /dev/null 2>&1; then
        echo "   ✅ Cleaned up port 8080"
    else
        echo "   ⚠️  Port 8080 may still be occupied"
    fi
fi

if lsof -ti:3000 > /dev/null 2>&1; then
    ORPHANED_PROCESSES=true
    PORT_3000_PIDS=$(lsof -ti:3000 | tr '\n' ' ')
    echo "   Found process(es) on port 3000: $PORT_3000_PIDS"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1

    if ! lsof -ti:3000 > /dev/null 2>&1; then
        echo "   ✅ Cleaned up port 3000"
    else
        echo "   ⚠️  Port 3000 may still be occupied"
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
