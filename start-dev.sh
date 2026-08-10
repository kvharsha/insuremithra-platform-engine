#!/bin/bash

# InsureMithra Development Startup Script
echo "🚀 Starting InsureMithra Development Environment..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node start-server.js" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

# Start backend server
echo "🔧 Starting backend server..."
cd /Users/dishan/Documents/PES/Sem_5/SE/InsureMithra
node start-server.js &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Backend server is running on http://localhost:3001"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

# Start frontend server
echo "🎨 Starting frontend server..."
cd /Users/dishan/Documents/PES/Sem_5/SE/InsureMithra/frontend
npm start &
FRONTEND_PID=$!

echo ""
echo "🎉 InsureMithra Development Environment Started!"
echo ""
echo "📊 Backend API: http://localhost:3001"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait

# Cleanup on exit
echo ""
echo "🛑 Stopping servers..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
echo "✅ All servers stopped"
