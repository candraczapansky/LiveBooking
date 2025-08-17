#!/bin/bash

echo "=== Testing SMS Flow ==="
echo "Sending test SMS to webhook..."
echo ""

# Send test SMS webhook
RESPONSE=$(curl -s -X POST http://localhost:5000/api/webhook/incoming-sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B15551234567&To=%2B19187277348&Body=Test%20SMS%20at%20$(date +%H:%M:%S)&MessageSid=SM_test_$(date +%s)&AccountSid=AC2f2ec0300713e653facec924bfa07ba6")

echo "Webhook Response:"
echo "$RESPONSE"
echo ""

# Check if Python responder received it
echo "Checking Python responder logs..."
tail -5 sms-responder-new.log | grep -E "Received SMS|response|Python" || echo "No Python activity found"
echo ""

# Check server logs
echo "Checking Node.js server logs..."
tail -5 server-new.log | grep -E "webhook|SMS|Python|auto-respond" || echo "No webhook activity found"
echo ""

# Test Python responder directly
echo "Testing Python responder directly..."
curl -s -X POST http://localhost:8000/webhook/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B15551234567&To=%2B19187277348&Body=Direct%20test%20to%20Python&MessageSid=SM_direct_$(date +%s)&AccountSid=AC2f2ec0300713e653facec924bfa07ba6&NumMedia=0" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Python Response: Success =', data.get('success'), ', AI Response =', data.get('ai_response', '')[:100] if data.get('ai_response') else 'None')" 2>/dev/null





