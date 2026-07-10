#!/bin/bash

# Smart Waste Management - Development Startup Script
# This script starts both Backend and Frontend in parallel

echo "🚀 Starting Smart Waste Management Development Environment..."

# Create logs directory
mkdir -p logs

# Function to check if port is in use
check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if Backend port 8000 is in use
if check_port 8000; then
    echo "⚠️  Port 8000 already in use. Please stop existing process or use different port."
else
    echo "📡 Starting Backend (Port 8000)..."
    cd web/Backend
    python -m uvicorn app.main:app --reload --port 8000 > ../../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "✓ Backend started (PID: $BACKEND_PID)"
    cd ../..
fi

# Wait a bit for backend to start
sleep 2

# Check if Frontend port 3000 is in use
if check_port 3000; then
    echo "⚠️  Port 3000 already in use. Please stop existing process or use different port."
else
    echo "🎨 Starting Frontend (Port 3000)..."
    cd web
    npm install > ../logs/npm-install.log 2>&1
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "✓ Frontend started (PID: $FRONTEND_PID)"
    cd ..
fi

echo ""
echo "✅ Development environment started!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "   Backend:  logs/backend.log"
echo "   Frontend: logs/frontend.log"
echo ""
echo "⏹️  To stop:"
echo "   Backend:  kill $BACKEND_PID"
echo "   Frontend: kill $FRONTEND_PID"
echo "   Or press Ctrl+C to stop all"
echo ""

# Keep script running
wait
