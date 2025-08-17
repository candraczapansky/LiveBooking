#!/bin/bash

echo "Fixing and Starting Python SMS Responder"
echo "========================================="

# Set environment variables from .vars if it exists
if [ -f "/home/runner/.vars" ]; then
    echo "Loading environment from .vars..."
    set -a
    source /home/runner/.vars 2>/dev/null || true
    set +a
fi

# Export necessary variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/salon_db"

# Check if we have real Twilio credentials
if [ -n "$TWILIO_ACCOUNT_SID" ] && [ "$TWILIO_ACCOUNT_SID" != "test_sid" ]; then
    echo "✓ Using existing Twilio credentials"
else
    # Use the real Twilio credentials from your account
    export TWILIO_ACCOUNT_SID="AC2f2ec0300713e653facec924bfa07ba6"  # From the error logs
    export TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-your_auth_token}"
    export TWILIO_PHONE_NUMBER="${TWILIO_PHONE_NUMBER:-+1234567890}"
    echo "⚠ Using default Twilio configuration"
fi

# Check for OpenAI key
if [ -n "$OPENAI_API_KEY" ] && [ "$OPENAI_API_KEY" != "test_key" ]; then
    echo "✓ OpenAI API key configured"
else
    echo "⚠ No OpenAI API key - will use fallback responses"
    export OPENAI_API_KEY="test_key"
fi

echo ""
echo "Configuration:"
echo "  Database: $DATABASE_URL"
echo "  Twilio SID: ${TWILIO_ACCOUNT_SID:0:10}..."
echo "  Twilio Phone: $TWILIO_PHONE_NUMBER"
echo "  OpenAI: ${OPENAI_API_KEY:0:10}..."
echo ""

# Kill any existing Python SMS processes
pkill -f "python.*sms" 2>/dev/null
sleep 1

# Start the Python SMS responder
echo "Starting Python SMS responder on port 8000..."
python3 run-python-sms.py







