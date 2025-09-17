#!/bin/bash

echo "Testing Voice Webhook Endpoints"
echo "================================"
echo ""

# Test GET endpoint
echo "1. Testing GET /api/webhook/voice (should be accessible without auth):"
curl -s https://www.glofloapp.com/api/webhook/voice
echo ""
echo ""

# Test POST endpoint
echo "2. Testing POST /api/webhook/voice (should return TwiML):"
curl -X POST https://www.glofloapp.com/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&From=sip:yealink1@test&To=+1234567890" 2>/dev/null | head -10
echo ""
echo ""

echo "3. If tests pass, update Twilio SIP Domain to:"
echo "   https://www.glofloapp.com/api/webhook/voice"
echo ""
echo "Done!"
