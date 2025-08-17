#!/bin/bash

# Start Python SMS Responder Service

echo "Starting Python SMS Responder Service..."
echo "======================================="

# Set environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/salon_db"
export TWILIO_ACCOUNT_SID="test_account_sid"
export TWILIO_AUTH_TOKEN="test_auth_token"
export TWILIO_PHONE_NUMBER="+1234567890"
export OPENAI_API_KEY="${OPENAI_API_KEY:-test_key}"

# Check if OpenAI key is available
if [ -f "/home/runner/.vars" ]; then
    source /home/runner/.vars 2>/dev/null || true
fi

echo "Configuration:"
echo "  Database: $DATABASE_URL"
echo "  Twilio: Configured (test mode)"
echo "  OpenAI: ${OPENAI_API_KEY:0:10}..."
echo ""

# Start the service
echo "Starting service on port 8000..."
cd /home/runner/workspace
python3 -m python_sms_responder.main







