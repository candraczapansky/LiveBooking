#!/bin/bash

echo "🧪 Testing Voice Fallback System"
echo "================================"

# Test 1: Check if Python AI is running
echo -e "\n1️⃣ Checking Python AI Service..."
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "✅ Python AI is running and healthy"
else
    echo "❌ Python AI is not running. Starting it now..."
    cd python_sms_responder && python main.py &
    sleep 3
fi

# Test 2: Test the no-answer webhook
echo -e "\n2️⃣ Testing no-answer fallback webhook..."
RESPONSE=$(curl -s -X POST https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice/no-answer \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "DialCallStatus=no-answer&CallSid=TEST123&From=+19185551234&To=+19187277348&AccountSid=TEST")

if echo "$RESPONSE" | grep -q "Hello"; then
    echo "✅ No-answer webhook successfully triggers AI"
else
    echo "⚠️  No-answer webhook might not be working. Check server logs."
fi

# Test 3: Show current configuration
echo -e "\n3️⃣ Current Configuration:"
echo "   - Yealink rings for: 10 seconds"
echo "   - Then AI answers if no pickup"
echo "   - Webhook URL: https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice"

echo -e "\n📝 How it works:"
echo "   1. Call comes in → Yealink phone rings"
echo "   2. Front desk has 10 seconds to answer"
echo "   3. If no answer → AI automatically picks up"
echo "   4. Front desk can still answer during those 10 seconds!"

echo -e "\n🔧 To adjust ring time before AI answers:"
echo "   Edit server/routes.ts and change 'timeout=\"10\"' to desired seconds"





