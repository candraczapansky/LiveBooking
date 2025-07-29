#!/bin/bash

echo "🔧 Fixing service persistence issue..."

# Set the environment variable to disable automatic service creation
export DISABLE_AUTOMATIC_SERVICE_CREATION=true

echo "✅ Set DISABLE_AUTOMATIC_SERVICE_CREATION=true"

# Kill any existing server processes
echo "🔄 Stopping existing server..."
pkill -f "npm run dev" || true
pkill -f "tsx server/index.ts" || true

# Wait a moment for processes to stop
sleep 2

# Start the server with the environment variable
echo "🚀 Starting server with automatic service creation disabled..."
DISABLE_AUTOMATIC_SERVICE_CREATION=true npm run dev &

echo ""
echo "✅ Server restarted with automatic service creation disabled!"
echo ""
echo "📋 What this fixes:"
echo "   - External API webhooks won't create services automatically"
echo "   - JotForm integration won't create services automatically"
echo "   - Setup scripts won't create services automatically"
echo ""
echo "🔍 To verify the fix:"
echo "   1. Delete a service or category"
echo "   2. Restart the server"
echo "   3. Check that the deleted item doesn't reappear"
echo ""
echo "⚠️  Note: If you need automatic service creation in the future,"
echo "   set DISABLE_AUTOMATIC_SERVICE_CREATION=false" 