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

echo "✅ Starting Python SMS responder..."
# Start Python SMS responder if not already running
if ! pgrep -f "uvicorn.*8000" > /dev/null; then
    export TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-AC2f2ec0300713e653facec924bfa07ba6}"
    export TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN"
    export TWILIO_PHONE_NUMBER="+19187277348"
    export OPENAI_API_KEY="$OPENAI_API_KEY"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/salon_db"
    
    nohup python3 -m uvicorn python_sms_responder.main:app --host 0.0.0.0 --port 8000 --log-level info > python-sms.log 2>&1 &
    sleep 3
fi

echo "✅ Starting the application..."
export USE_PYTHON_SMS_RESPONDER=true
export PYTHON_SMS_SERVICE_URL=http://localhost:8000
export PORT=5000
export NODE_ENV=production
export DISABLE_AUTOMATIC_SERVICE_CREATION=true

# Run production build
node dist/index.js 