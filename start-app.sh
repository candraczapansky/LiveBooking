#!/bin/bash

echo "🚀 Starting Glo Head Spa App..."

# Kill any existing Node.js processes that might be using port 5000
echo "🧹 Cleaning up existing processes..."
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 2

# Try to kill any process using port 5000
echo "🔌 Freeing up port 5000..."
fuser -k 5000/tcp 2>/dev/null || true

# Wait another moment
sleep 1

echo "✅ Starting the application..."
npm run dev 