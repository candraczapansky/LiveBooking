#!/bin/bash

echo "Testing Python SMS Responder Webhook"
echo "====================================="
echo ""

# Test local endpoint first
echo "1. Testing local endpoint..."
curl -X POST http://localhost:8000/webhook/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+1234567890&To=+0987654321&Body=Hi, I want to book an appointment&MessageSid=test_local&AccountSid=test" \
  -s -w "\nStatus: %{http_code}\n"

echo ""
echo "2. Testing external Replit URL..."
curl -X POST https://salon-sync-candraczapansky.replit.app:8000/webhook/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+1234567890&To=+0987654321&Body=Test from external&MessageSid=test_external&AccountSid=test" \
  -s -w "\nStatus: %{http_code}\n"

echo ""
echo "If both tests return Status: 200, your webhook is ready!"
echo "Configure Twilio with: https://salon-sync-candraczapansky.replit.app:8000/webhook/sms"







