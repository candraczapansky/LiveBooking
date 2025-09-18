#!/bin/bash
# Run this AFTER restarting Node.js in Replit

echo "🔍 Verifying AI Responder System..."
echo "===================================="

# Check Python AI
echo -e "\n1️⃣ Python AI Service:"
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "   ✅ Running and healthy"
else
    echo "   ❌ Not running - start with: cd python_sms_responder && python main.py"
fi

# Check Node.js webhook
echo -e "\n2️⃣ Node.js Webhook:"
RESPONSE=$(curl -s https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice/test-ai 2>/dev/null)
if echo "$RESPONSE" | grep -q "Hello"; then
    echo "   ✅ New code is live - fallback system active!"
else
    echo "   ⚠️ Old code still running - restart needed"
fi

# Test the no-answer simulation
echo -e "\n3️⃣ Testing Fallback System:"
TEST_RESPONSE=$(curl -s -X POST https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice/no-answer \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "DialCallStatus=no-answer&CallSid=VERIFY123&From=+19185551234&To=+19187277348" 2>/dev/null)

if echo "$TEST_RESPONSE" | grep -q "salon"; then
    echo "   ✅ AI fallback working!"
else
    echo "   ⚠️ Fallback not responding correctly"
fi

echo -e "\n📞 READY TO TEST:"
echo "   1. Call your phone number"
echo "   2. Let it ring (don't answer Yealink)"
echo "   3. After 10 seconds, AI should answer"
echo ""
echo "Front desk can still answer during those 10 seconds!"





