#!/bin/bash

echo "Starting Python SMS Responder Service"
echo "======================================"

# First preserve any existing environment variables from Replit secrets
EXISTING_TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID"
EXISTING_TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN"
EXISTING_OPENAI_API_KEY="$OPENAI_API_KEY"
EXISTING_TWILIO_PHONE_NUMBER="$TWILIO_PHONE_NUMBER"

# Load environment variables from sms-config.env
if [ -f "sms-config.env" ]; then
    echo "Loading configuration from sms-config.env..."
    set -a
    source sms-config.env
    set +a
else
    echo "Error: sms-config.env not found!"
    echo "Please configure your SMS credentials in sms-config.env"
    exit 1
fi

# Restore Replit secrets if they were set (they take priority)
if [ -n "$EXISTING_TWILIO_ACCOUNT_SID" ]; then
    export TWILIO_ACCOUNT_SID="$EXISTING_TWILIO_ACCOUNT_SID"
fi
if [ -n "$EXISTING_TWILIO_AUTH_TOKEN" ]; then
    export TWILIO_AUTH_TOKEN="$EXISTING_TWILIO_AUTH_TOKEN"
fi
if [ -n "$EXISTING_OPENAI_API_KEY" ]; then
    export OPENAI_API_KEY="$EXISTING_OPENAI_API_KEY"
fi
if [ -n "$EXISTING_TWILIO_PHONE_NUMBER" ]; then
    # Fix the double plus sign issue - remove all leading plus signs then add one back
    CLEANED_NUMBER="${EXISTING_TWILIO_PHONE_NUMBER##+}"
    CLEANED_NUMBER="${CLEANED_NUMBER#+}"
    export TWILIO_PHONE_NUMBER="+${CLEANED_NUMBER}"
fi

# Check if we have the necessary environment variables
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ "$TWILIO_ACCOUNT_SID" == "your_twilio_account_sid_here" ]; then
    echo "Warning: TWILIO_ACCOUNT_SID not properly configured"
    echo "Using test mode - SMS sending will be simulated"
    export TWILIO_ACCOUNT_SID="test_sid"
    export TWILIO_AUTH_TOKEN="test_token"
fi

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" == "your_openai_api_key_here" ]; then
    echo "Warning: OPENAI_API_KEY not properly configured"
    echo "Using test mode - AI responses will be limited"
    export OPENAI_API_KEY="test_key"
fi

echo ""
echo "Configuration:"
echo "  Python SMS Service: $PYTHON_SMS_SERVICE_URL"
echo "  Database: $DATABASE_URL"
echo "  Twilio SID: ${TWILIO_ACCOUNT_SID:0:10}..."
echo "  Twilio Phone: $TWILIO_PHONE_NUMBER"
echo "  OpenAI: ${OPENAI_API_KEY:0:10}..."
echo "  USE_PYTHON_SMS_RESPONDER: $USE_PYTHON_SMS_RESPONDER"
echo ""

# Kill any existing Python SMS processes
echo "Stopping any existing Python SMS processes..."
pkill -f "python.*sms" 2>/dev/null || true
pkill -f "uvicorn.*8000" 2>/dev/null || true
sleep 2

# Start the Python SMS responder
echo "Starting Python SMS responder on port 8000..."
cd /home/runner/workspace

# Use python3 directly with uvicorn
python3 -m uvicorn python_sms_responder.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info
