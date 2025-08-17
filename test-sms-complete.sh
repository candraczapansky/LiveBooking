#!/bin/bash

echo "=== COMPLETE SMS SYSTEM TEST ==="
echo ""

# Test 1: Check services are running
echo "1. Checking services..."
PYTHON_RUNNING=$(ps aux | grep -E "uvicorn.*8000" | grep -v grep | wc -l)
NODE_RUNNING=$(ps aux | grep -E "tsx.*server" | grep -v grep | wc -l)

if [ "$PYTHON_RUNNING" -gt 0 ]; then
    echo "✓ Python SMS responder is running"
else
    echo "✗ Python SMS responder NOT running"
fi

if [ "$NODE_RUNNING" -gt 0 ]; then
    echo "✓ Node.js server is running"
else
    echo "✗ Node.js server NOT running"
fi

echo ""
echo "2. Testing local webhook (port 5000)..."
LOCAL_RESPONSE=$(curl -s -X POST http://localhost:5000/api/webhook/incoming-sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Test&From=%2B14155551234&To=%2B19187277348&MessageSid=SM_local&AccountSid=AC2f2ec0300713e653facec924bfa07ba6" 2>&1)

if echo "$LOCAL_RESPONSE" | grep -q "<Message>"; then
    echo "✓ Local webhook returns message in TwiML"
    echo "$LOCAL_RESPONSE" | grep -o "<Message>.*</Message>" | sed 's/<[^>]*>//g' | head -c 100
    echo "..."
else
    echo "✗ Local webhook NOT returning message"
fi

echo ""
echo "3. Testing public webhook..."
PUBLIC_RESPONSE=$(curl -s -X POST https://salon-sync-candraczapansky.replit.app/api/webhook/incoming-sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Test&From=%2B14155551234&To=%2B19187277348&MessageSid=SM_public&AccountSid=AC2f2ec0300713e653facec924bfa07ba6" 2>&1)

if echo "$PUBLIC_RESPONSE" | grep -q "<Message>"; then
    echo "✓ Public webhook returns message in TwiML"
    echo "$PUBLIC_RESPONSE" | grep -o "<Message>.*</Message>" | sed 's/<[^>]*>//g' | head -c 100
    echo "..."
else
    echo "✗ Public webhook NOT returning message"
    echo "Response: $PUBLIC_RESPONSE" | head -200
fi

echo ""
echo "4. Checking Twilio webhook configuration..."
WEBHOOK_URL=$(curl -s https://api.twilio.com/2010-04-01/Accounts/AC2f2ec0300713e653facec924bfa07ba6/IncomingPhoneNumbers.json \
  -u "AC2f2ec0300713e653facec924bfa07ba6:$TWILIO_AUTH_TOKEN" 2>/dev/null | python3 -c "import sys, json; data = json.load(sys.stdin); nums = data.get('incoming_phone_numbers', []); print(nums[0].get('sms_url') if nums else 'None')" 2>/dev/null)

echo "Webhook URL: $WEBHOOK_URL"

if [ "$WEBHOOK_URL" = "https://salon-sync-candraczapansky.replit.app/api/webhook/incoming-sms" ]; then
    echo "✓ Twilio webhook URL is correct"
else
    echo "✗ Twilio webhook URL is incorrect"
fi

echo ""
echo "=== DIAGNOSIS ==="
if [ "$PYTHON_RUNNING" -gt 0 ] && [ "$NODE_RUNNING" -gt 0 ]; then
    if echo "$PUBLIC_RESPONSE" | grep -q "<Message>"; then
        echo "✅ System is WORKING - You should receive SMS responses!"
    else
        echo "⚠️ Server may need restart or code update not deployed"
        echo "The public webhook is not returning the message in TwiML format"
    fi
else
    echo "❌ Services not running properly"
fi


