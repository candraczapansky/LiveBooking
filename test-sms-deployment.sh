#!/bin/bash

echo "==================================="
echo "SMS DEPLOYMENT TEST SCRIPT"
echo "==================================="
echo ""

# Test 1: Check Python SMS responder
echo "1. Checking Python SMS responder..."
if pgrep -f "uvicorn.*8000" > /dev/null; then
    echo "   ✅ Python SMS responder is running"
    curl -s http://localhost:8000/health | grep -q "healthy" && echo "   ✅ Health check passed" || echo "   ⚠️ Health check failed"
else
    echo "   ❌ Python SMS responder is NOT running"
fi
echo ""

# Test 2: Check Node.js server
echo "2. Checking Node.js server..."
if lsof -i :5000 | grep -q LISTEN; then
    echo "   ✅ Node.js server is listening on port 5000"
else
    echo "   ❌ Node.js server is NOT listening on port 5000"
fi
echo ""

# Test 3: Test local webhook
echo "3. Testing LOCAL webhook (http://localhost:5000)..."
LOCAL_RESPONSE=$(curl -s -X POST http://localhost:5000/api/webhook/incoming-sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Test&From=%2B14155551234&To=%2B19187277348&MessageSid=SM_local&AccountSid=AC2f2ec0300713e653facec924bfa07ba6")

if echo "$LOCAL_RESPONSE" | grep -q "<Message>"; then
    echo "   ✅ Local webhook returns AI message"
    echo "$LOCAL_RESPONSE" | grep -o "<Message>.*</Message>" | sed 's/<[^>]*>//g' | head -c 60
    echo "..."
else
    echo "   ❌ Local webhook does NOT return AI message"
fi
echo ""

# Test 4: Test public webhook
echo "4. Testing PUBLIC webhook (https://salon-sync-candraczapansky.replit.app)..."
PUBLIC_RESPONSE=$(curl -s -X POST https://salon-sync-candraczapansky.replit.app/api/webhook/incoming-sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Test&From=%2B14155551234&To=%2B19187277348&MessageSid=SM_public&AccountSid=AC2f2ec0300713e653facec924bfa07ba6")

if echo "$PUBLIC_RESPONSE" | grep -q "<Message>"; then
    echo "   ✅ Public webhook returns AI message"
    echo "$PUBLIC_RESPONSE" | grep -o "<Message>.*</Message>" | sed 's/<[^>]*>//g' | head -c 60
    echo "..."
else
    echo "   ❌ Public webhook does NOT return AI message"
    echo "   Response: $(echo "$PUBLIC_RESPONSE" | head -c 100)"
fi
echo ""

# Test 5: Check environment variables
echo "5. Checking environment variables..."
if [ "$USE_PYTHON_SMS_RESPONDER" = "true" ]; then
    echo "   ✅ USE_PYTHON_SMS_RESPONDER is set to true"
else
    echo "   ⚠️ USE_PYTHON_SMS_RESPONDER is not set or not true"
fi

if [ -n "$PYTHON_SMS_SERVICE_URL" ]; then
    echo "   ✅ PYTHON_SMS_SERVICE_URL is set: $PYTHON_SMS_SERVICE_URL"
else
    echo "   ⚠️ PYTHON_SMS_SERVICE_URL is not set"
fi
echo ""

# Summary
echo "==================================="
echo "SUMMARY"
echo "==================================="

ISSUES=0

if ! pgrep -f "uvicorn.*8000" > /dev/null; then
    echo "❌ Python SMS responder needs to be started"
    ISSUES=$((ISSUES + 1))
fi

if ! lsof -i :5000 | grep -q LISTEN; then
    echo "❌ Node.js server needs to be started on port 5000"
    ISSUES=$((ISSUES + 1))
fi

if ! echo "$LOCAL_RESPONSE" | grep -q "<Message>"; then
    echo "❌ Local webhook is not returning AI messages"
    ISSUES=$((ISSUES + 1))
fi

if ! echo "$PUBLIC_RESPONSE" | grep -q "<Message>"; then
    echo "⚠️ Public webhook is not returning AI messages (may be deployment/cache issue)"
    echo "   This usually requires:"
    echo "   1. Waiting for Replit deployment to update (5-10 minutes)"
    echo "   2. Or triggering a manual redeployment in Replit"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ All tests passed! SMS responder should be working."
else
    echo ""
    echo "Found $ISSUES issue(s) that need attention."
fi

echo ""
echo "==================================="
