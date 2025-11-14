#!/bin/bash

# JobHunter Startup Script
# Starts PostgreSQL (if needed), backend, and frontend
# Intelligently detects if services are already running

set -e

# Function to display help message
show_help() {
    cat << EOF
Usage: ./helper-scripts/start.sh [OPTIONS]

Starts JobHunter development environment (PostgreSQL, backend, frontend)

OPTIONS:
    -d, --debug-backend      Enable backend extraction debug logging (DEBUG_EXTRACTION=true)
    -f, --debug-frontend     Enable frontend debug mode (REACT_APP_DEBUG_MODE=true)
    -s, --debug-stats        Enable stats debug logging (REACT_APP_DEBUG_STATS=true)
    -b, --backend-only       Start only backend + PostgreSQL (skip frontend)
    -w, --frontend-only      Start only frontend (assumes backend is already running)
    -v, --verbose            Show console output from services (don't suppress logs)
    -n, --no-browser         Don't auto-open browser after startup
    -h, --help               Show this help message

EXAMPLES:
    # Start with backend debug logging
    ./helper-scripts/start.sh --debug-backend

    # Start with all debug modes and verbose output
    ./helper-scripts/start.sh -d -f -s -v

    # Start with stats debug logging only
    ./helper-scripts/start.sh --debug-stats

    # Start only backend (for API testing)
    ./helper-scripts/start.sh --backend-only

    # Start with frontend and stats debug, no browser
    ./helper-scripts/start.sh -f -s --no-browser

ENVIRONMENT VARIABLES:
    NO_BROWSER=1             Alternative to --no-browser flag (still supported)

EOF
}

# Parse command-line arguments
DEBUG_BACKEND=false
DEBUG_FRONTEND=false
DEBUG_STATS=false
VERBOSE=false
NO_BROWSER_FLAG=false
START_BACKEND=true
START_FRONTEND=true

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--debug-backend)
            DEBUG_BACKEND=true
            shift
            ;;
        -f|--debug-frontend)
            DEBUG_FRONTEND=true
            shift
            ;;
        -s|--debug-stats)
            DEBUG_STATS=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -n|--no-browser)
            NO_BROWSER_FLAG=true
            shift
            ;;
        -b|--backend-only)
            START_FRONTEND=false
            shift
            ;;
        -w|--frontend-only)
            START_BACKEND=false
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
if [ "$START_BACKEND" = false ] && [ "$START_FRONTEND" = false ]; then
    echo "❌ Error: Cannot use --backend-only and --frontend-only together"
    echo ""
    show_help
    exit 1
fi

# Set output redirection based on verbose flag
if [ "$VERBOSE" = true ]; then
    OUTPUT_REDIRECT=""
else
    OUTPUT_REDIRECT="> /dev/null 2>&1"
fi

echo "🚀 Starting JobHunter..."
echo ""

# Show configuration
if [ "$DEBUG_BACKEND" = true ]; then
    echo "🐛 Debug mode: Backend extraction logging enabled"
fi
if [ "$DEBUG_FRONTEND" = true ]; then
    echo "🐛 Debug mode: Frontend debug panel enabled"
fi
if [ "$VERBOSE" = true ]; then
    echo "📢 Verbose mode: Service logs will be displayed"
fi
if [ "$START_BACKEND" = false ]; then
    echo "⚠️  Frontend-only mode: Skipping backend startup"
elif [ "$START_FRONTEND" = false ]; then
    echo "⚠️  Backend-only mode: Skipping frontend startup"
fi
[ "$DEBUG_BACKEND" = true ] || [ "$DEBUG_FRONTEND" = true ] || [ "$VERBOSE" = true ] || [ "$START_BACKEND" = false ] || [ "$START_FRONTEND" = false ] && echo ""

# Check if PostgreSQL is running (skip if frontend-only mode)
if [ "$START_BACKEND" = true ]; then
    echo "📊 Checking PostgreSQL..."
    if brew services list | grep postgresql@14 | grep started > /dev/null 2>&1; then
        echo "✅ PostgreSQL is running"
    else
        echo "🔄 Starting PostgreSQL..."
        brew services start postgresql@14 > /dev/null 2>&1
        echo "✅ PostgreSQL started"
        sleep 2
    fi

    # Show active database (suppress warnings)
    if [ -f backend/.env ]; then
        DB_NAME=$(grep "^DATABASE_URL=" backend/.env 2>/dev/null | sed 's/.*\/\([^?]*\).*/\1/')
        if [ -n "$DB_NAME" ]; then
            echo "🔒 Database: $DB_NAME"
        fi
    fi

    echo ""
fi

# Start backend (skip if frontend-only mode)
if [ "$START_BACKEND" = true ]; then
    # Check if backend is already running
    BACKEND_RUNNING=false
    BACKEND_PID=""
    if lsof -i :8080 > /dev/null 2>&1; then
        BACKEND_RUNNING=true
        BACKEND_PID=$(lsof -ti :8080)
        echo "✅ Backend already running (PID: $BACKEND_PID)"
    else
        echo "🦀 Starting backend (Rust/Actix-web)..."
        cd backend
        export TMPDIR=$HOME/tmp
        mkdir -p $TMPDIR 2>/dev/null

        # Apply debug backend flag
        if [ "$DEBUG_BACKEND" = true ]; then
            export DEBUG_EXTRACTION=true
            echo "   🐛 DEBUG_EXTRACTION=true"
        fi

        # Start with or without log suppression
        if [ "$VERBOSE" = true ]; then
            cargo run &
        else
            cargo run > /dev/null 2>&1 &
        fi
        BACKEND_PID=$!
        cd ..
        echo "✅ Backend started (PID: $BACKEND_PID)"

        # Wait for backend to be ready
        echo "⏳ Waiting for backend..."
        for i in {1..30}; do
            if curl -s http://localhost:8080/api/jobs > /dev/null 2>&1; then
                echo "✅ Backend ready at http://localhost:8080"
                break
            fi
            sleep 1
        done
    fi

    echo ""
fi

# Start frontend (skip if backend-only mode)
if [ "$START_FRONTEND" = true ]; then
    # Check if frontend is already running
    FRONTEND_RUNNING=false
    FRONTEND_PID=""
    if lsof -i :3000 > /dev/null 2>&1; then
        FRONTEND_RUNNING=true
        FRONTEND_PID=$(lsof -ti :3000)
        echo "✅ Frontend already running (PID: $FRONTEND_PID)"
    else
        echo "⚛️  Starting frontend (React/TypeScript)..."
        cd frontend

        # Apply debug frontend flag
        if [ "$DEBUG_FRONTEND" = true ]; then
            # Check if .env.development.local exists and already has the flag
            if [ -f .env.development.local ] && grep -q "^REACT_APP_DEBUG_MODE=true" .env.development.local 2>/dev/null; then
                echo "   🐛 REACT_APP_DEBUG_MODE already set in .env.development.local"
            else
                echo "REACT_APP_DEBUG_MODE=true" >> .env.development.local
                echo "   🐛 REACT_APP_DEBUG_MODE=true added to .env.development.local"
            fi
        fi

        # Apply debug stats flag
        if [ "$DEBUG_STATS" = true ]; then
            # Check if .env.development.local exists and already has the flag
            if [ -f .env.development.local ] && grep -q "^REACT_APP_DEBUG_STATS=true" .env.development.local 2>/dev/null; then
                echo "   📊 REACT_APP_DEBUG_STATS already set in .env.development.local"
            else
                echo "REACT_APP_DEBUG_STATS=true" >> .env.development.local
                echo "   📊 REACT_APP_DEBUG_STATS=true added to .env.development.local"
            fi
        fi

        # Start with or without log suppression
        if [ "$VERBOSE" = true ]; then
            BROWSER=none npm start &
        else
            BROWSER=none npm start > /dev/null 2>&1 &
        fi
        FRONTEND_PID=$!
        cd ..
        echo "✅ Frontend started (PID: $FRONTEND_PID)"

        # Wait for frontend to be ready
        echo "⏳ Waiting for frontend..."
        for i in {1..60}; do
            if curl -s http://localhost:3000 > /dev/null 2>&1; then
                echo "✅ Frontend ready at http://localhost:3000"
                break
            fi
            sleep 1
        done
    fi

    echo ""
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ JobHunter is ready!"
echo ""

# Show service URLs based on what's running
if [ "$START_FRONTEND" = true ]; then
    echo "📱 Frontend: http://localhost:3000"
fi
if [ "$START_BACKEND" = true ]; then
    echo "🔌 Backend:  http://localhost:8080"
fi

echo ""

# Show stop commands for newly started services
if [ "$START_BACKEND" = true ] && [ "$START_FRONTEND" = true ]; then
    if [ "${BACKEND_RUNNING:-false}" = false ] || [ "${FRONTEND_RUNNING:-false}" = false ]; then
        echo "To stop newly started services:"
        [ "${BACKEND_RUNNING:-false}" = false ] && echo "  Backend: kill $BACKEND_PID"
        [ "${FRONTEND_RUNNING:-false}" = false ] && echo "  Frontend: kill $FRONTEND_PID"
    else
        echo "Services were already running - no new processes started"
    fi
elif [ "$START_BACKEND" = true ]; then
    if [ "${BACKEND_RUNNING:-false}" = false ]; then
        echo "To stop backend: kill $BACKEND_PID"
    else
        echo "Backend was already running - no new processes started"
    fi
elif [ "$START_FRONTEND" = true ]; then
    if [ "${FRONTEND_RUNNING:-false}" = false ]; then
        echo "To stop frontend: kill $FRONTEND_PID"
    else
        echo "Frontend was already running - no new processes started"
    fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Auto-open browser unless NO_BROWSER=1 or --no-browser flag is set, and frontend is running
if [ "$START_FRONTEND" = true ] && [ "$NO_BROWSER" != "1" ] && [ "$NO_BROWSER_FLAG" = false ]; then
    echo "🌐 Opening browser..."
    open http://localhost:3000
elif [ "$START_FRONTEND" = true ] && [ "$NO_BROWSER" = "1" ] || [ "$NO_BROWSER_FLAG" = true ]; then
    echo "ℹ️  Browser not opened (--no-browser flag or NO_BROWSER=1)"
fi

echo ""
echo "✅ Done! Services are running in background."
echo ""
