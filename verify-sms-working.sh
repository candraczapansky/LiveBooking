#!/bin/bash

echo "==================================="
echo "SMS LLM RESPONDER VERIFICATION TEST"
echo "==================================="
echo ""

# Test the webhook and show the TwiML response
echo "Testing webhook response..."
RESPONSE=$(curl -s -X POST http://localhost:5000/api/webhook/incoming-sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B14085551234&To=%2B19187277348&Body=What%20are%20your%20business%20hours%3F&MessageSid=SM_verify_$(date +%s)&AccountSid=AC2f2ec0300713e653facec924bfa07ba6")

# Check if response contains Message tag
if echo "$RESPONSE" | grep -q "<Message>"; then
    echo "✅ SUCCESS: Webhook returns TwiML with message content"
    echo ""
    echo "Response preview:"
    echo "$RESPONSE" | grep "<Message>" | sed 's/<Message>//' | sed 's/<\/Message>//' | head -c 100
    echo "..."
else
    echo "❌ ERROR: Webhook not returning message in TwiML"
    echo "$RESPONSE"
fi

echo ""
echo "==================================="
echo "To test from your phone:"
echo "Send a text to: +19187277348"
echo "==================================="
echo ""
echo "Try messages like:"
echo "- 'Hi'"
echo "- 'I need an appointment'"
echo "- 'What services do you offer?'"
echo "- 'What are your hours?'"
echo ""
echo "You should receive an AI-powered response within seconds!"





