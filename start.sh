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
cargo run &
BACKEND_PID=$!
cd ..

echo "✅ Backend started (PID: $BACKEND_PID)"
echo "   Server: http://localhost:8080"
echo ""

# Wait a moment for backend to start
sleep 3

echo "⚛️  Starting frontend (React/TypeScript)..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo "   Server: http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ JobHunter is running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:8080"
echo ""
echo "To stop:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  OR press Ctrl+C and run: pkill -f 'cargo run'; pkill -f 'react-scripts'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
