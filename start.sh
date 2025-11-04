#!/bin/bash

# JobHunter Startup Script
# Starts PostgreSQL (if needed), backend, and frontend
# Intelligently detects if services are already running

set -e

echo "🚀 Starting JobHunter..."
echo ""

# Check if PostgreSQL is running
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
    cargo run > /dev/null 2>&1 &
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
    BROWSER=none npm start > /dev/null 2>&1 &
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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ JobHunter is ready!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:8080"
echo ""
if [ "$BACKEND_RUNNING" = false ] || [ "$FRONTEND_RUNNING" = false ]; then
    echo "To stop newly started services:"
    [ "$BACKEND_RUNNING" = false ] && echo "  Backend: kill $BACKEND_PID"
    [ "$FRONTEND_RUNNING" = false ] && echo "  Frontend: kill $FRONTEND_PID"
else
    echo "Services were already running - no new processes started"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Auto-open browser unless NO_BROWSER=1 is set
if [ "$NO_BROWSER" != "1" ]; then
    echo "🌐 Opening browser..."
    open http://localhost:3000
fi

echo ""
echo "✅ Done! Services are running in background."
echo ""
