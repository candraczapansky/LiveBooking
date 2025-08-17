#!/bin/bash

echo "🚀 Starting Payment Server Manually..."
echo "======================================"

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python not found"
    exit 1
fi

# Check if we're in Replit
if [ -d "/home/runner" ]; then
    echo "✅ Running in Replit environment"
else
    echo "⚠️  Not running in Replit environment"
fi

# Check dependencies
echo "📦 Checking dependencies..."
python -c "import fastapi; print('✅ FastAPI ready')" || {
    echo "❌ FastAPI not found"
    exit 1
}

python -c "import uvicorn; print('✅ Uvicorn ready')" || {
    echo "❌ Uvicorn not found"
    exit 1
}

# Test server import
echo "🧪 Testing server..."
python -c "from main import app; print('✅ Server ready')" || {
    echo "❌ Server import failed"
    exit 1
}

# Get port from environment or default
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}

echo "🌐 Starting server on $HOST:$PORT..."
echo "💡 Press Ctrl+C to stop the server"
echo "🔗 Server will be available at: http://localhost:$PORT"

if [ -d "/home/runner" ]; then
    echo "🌐 In Replit, you can also access it via the webview"
fi

echo "======================================"

# Start the server
python main.py
