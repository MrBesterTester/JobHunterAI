#!/bin/bash

# JobHunter Startup Script
# Starts PostgreSQL (if needed), backend, and frontend

set -e

echo "🚀 Starting JobHunter..."
echo ""

# Check if PostgreSQL is running
echo "📊 Checking PostgreSQL status..."
if brew services list | grep postgresql@14 | grep started > /dev/null 2>&1; then
    echo "✅ PostgreSQL is already running"
else
    echo "🔄 Starting PostgreSQL..."
    brew services start postgresql@14
    echo "✅ PostgreSQL started"
    # Give PostgreSQL a moment to fully start
    sleep 2
fi

echo ""
echo "🦀 Starting backend (Rust/Actix-web)..."
cd backend
# Set TMPDIR to avoid permission issues with system temp directories
export TMPDIR=$HOME/tmp
mkdir -p $TMPDIR
cargo run &
BACKEND_PID=$!
cd ..

echo "✅ Backend process started (PID: $BACKEND_PID)"
echo ""

echo "⚛️  Starting frontend (React/TypeScript)..."
cd frontend
BROWSER=none npm start > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

echo "✅ Frontend process started (PID: $FRONTEND_PID)"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
BACKEND_READY=false
for i in {1..30}; do
    if curl -s http://localhost:8080/api/jobs > /dev/null 2>&1; then
        BACKEND_READY=true
        echo "✅ Backend is ready at http://localhost:8080"
        break
    fi
    sleep 1
done

if [ "$BACKEND_READY" = false ]; then
    echo "❌ Backend failed to start within 30 seconds"
    echo "   Check the logs for errors"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
FRONTEND_READY=false
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        FRONTEND_READY=true
        echo "✅ Frontend is ready at http://localhost:3000"
        break
    fi
    sleep 1
done

if [ "$FRONTEND_READY" = false ]; then
    echo "❌ Frontend failed to start within 60 seconds"
    echo "   Check the logs for errors"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ JobHunter is ready!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:8080"
echo ""
echo "To stop:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  OR press Ctrl+C and run: pkill -f 'cargo run'; pkill -f 'react-scripts'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Auto-open browser unless NO_BROWSER=1 is set
if [ "$NO_BROWSER" != "1" ]; then
    echo "🌐 Opening browser..."
    open http://localhost:3000
    echo ""
fi

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
