#!/bin/bash

# Kill all existing development processes
echo "🧹 Cleaning up existing processes..."
pkill -f "expo start" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3000,3001,8081 2>/dev/null | xargs kill -9 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

echo "🚀 Starting backend server on port 3000..."
# Start backend in background
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

echo "📱 Starting mobile Expo server..."
# Start mobile app
cd mobile && npx expo start --clear

# Cleanup function for when script exits
cleanup() {
    echo "🛑 Stopping all processes..."
    kill $BACKEND_PID 2>/dev/null || true
    pkill -f "expo start" 2>/dev/null || true
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM