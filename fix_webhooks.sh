#!/bin/bash

echo "🔧 Fixing AI Responder Setup for Twilio"
echo "========================================"

# Kill existing processes
echo "1. Stopping existing services..."
pkill -f "node.*server" 2>/dev/null || true
pkill -f "python.*main" 2>/dev/null || true
sleep 2

# Start Python AI responder on port 8000
echo "2. Starting Python AI responder on port 8000..."
cd /home/runner/workspace/python_sms_responder
export WEBHOOK_BASE_URL="https://dev-booking-91625-candraczapansky.replit.app"
export TWILIO_ACCOUNT_SID="AC2f2ec0300713e653facec924bfa07ba6"
export TWILIO_AUTH_TOKEN="placeholder_for_fallback"
export TWILIO_PHONE_NUMBER="+19187277348"
export OPENAI_API_KEY="placeholder_for_fallback"
python main.py > ../python_ai.log 2>&1 &

sleep 3

# Start Node.js server on port 5001 (maps to external 3002 in Replit)
echo "3. Starting Node.js server on port 5001..."
cd /home/runner/workspace
export PORT=5001
export PYTHON_AI_URL="http://localhost:8000"
export BASE_URL="https://dev-booking-91625-candraczapansky.replit.app"
npm start > server.log 2>&1 &

sleep 5

# Test the services
echo ""
echo "4. Testing services..."
echo "----------------------"

# Test Python AI responder
echo -n "Python AI responder: "
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

# Test Node.js server
echo -n "Node.js server: "
if curl -s http://localhost:5001/api/health 2>/dev/null | grep -q "ok"; then
    echo "✅ Running"
else
    echo "❌ Not responding"
fi

echo ""
echo "5. Testing Webhook Routes..."
echo "-----------------------------"

# Test the voice webhook through Replit URL
echo "Testing voice webhook via Replit URL..."
response=$(curl -s -X POST https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "From=%2B19185551234&To=%2B19187277348&CallSid=TEST123" 2>&1)

if echo "$response" | grep -q "Response"; then
    echo "✅ Voice webhook is accessible!"
else
    echo "❌ Voice webhook not accessible"
    echo "Response: ${response:0:100}..."
fi

echo ""
echo "========================================"
echo "✅ SETUP COMPLETE!"
echo ""
echo "📞 TWILIO CONFIGURATION NEEDED:"
echo "1. Go to: https://console.twilio.com"
echo "2. Navigate to your phone number settings"
echo "3. Set the Voice webhook URL to:"
echo "   https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice"
echo ""
echo "The AI responder will answer when:"
echo "- Someone calls your Twilio number"
echo "- The Yealink phone doesn't answer within 10 seconds"
echo ""
echo "To monitor logs:"
echo "- Python AI: tail -f python_ai.log"
echo "- Node.js: tail -f server.log"


