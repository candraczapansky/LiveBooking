#!/bin/bash

echo "🚀 Starting Production Server with SMS Responder..."

# Start Python SMS responder first
echo "Starting Python SMS responder..."

# Use Replit secrets if available, otherwise use defaults
export TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-AC2f2ec0300713e653facec924bfa07ba6}"
export TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN"

# Clean the phone number to ensure single plus sign
if [ -n "$TWILIO_PHONE_NUMBER" ]; then
    CLEANED_NUMBER="${TWILIO_PHONE_NUMBER##+}"
    CLEANED_NUMBER="${CLEANED_NUMBER#+}"
    export TWILIO_PHONE_NUMBER="+${CLEANED_NUMBER}"
else
    export TWILIO_PHONE_NUMBER="+19187277348"
fi

export OPENAI_API_KEY="$OPENAI_API_KEY"
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/salon_db"

# Kill any existing Python SMS responder
pkill -f "uvicorn.*8000" 2>/dev/null
sleep 2

# Start Python SMS responder
nohup python3 -m uvicorn python_sms_responder.main:app --host 0.0.0.0 --port 8000 --log-level info > python-sms.log 2>&1 &

sleep 3

# Start Node.js server with Python SMS responder enabled
export USE_PYTHON_SMS_RESPONDER=true
export PYTHON_SMS_SERVICE_URL=http://localhost:8000
export NODE_ENV=production
export DISABLE_AUTOMATIC_SERVICE_CREATION=true
export PORT=5000

echo "Starting Node.js production server on port 5000..."
exec node dist/index.js
