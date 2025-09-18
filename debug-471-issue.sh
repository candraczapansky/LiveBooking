#!/bin/bash

echo "🔍 Debugging 471 Prefix Issue"
echo "=============================="
echo ""

# Test the exact scenario from the call log
echo "Test 1: EXACT scenario from your call log"
echo "------------------------------------------"
echo "Simulating: sip:19185048902@glo-head-spa-phones.sip.twilio.com:5060"
echo ""

curl -s -X POST http://localhost:3002/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=DEBUG1&From=sip:yealink1@glo-head-spa-phones.sip.twilio.com:5060&To=sip:19185048902@glo-head-spa-phones.sip.twilio.com:5060&Direction=inbound" 2>&1 | grep -E "Number|Failed" | head -5

echo ""
echo "Expected: <Number>+19185048902</Number>"
echo ""

# Test if maybe Twilio is sending 471 + the number
echo "Test 2: What if Twilio sends 471 + 19185048902?"
echo "-------------------------------------------------"
echo "Simulating: sip:47119185048902@..."
echo ""

curl -s -X POST http://localhost:3002/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=DEBUG2&From=sip:yealink1@glo-head-spa-phones.sip.twilio.com:5060&To=sip:47119185048902@glo-head-spa-phones.sip.twilio.com:5060" 2>&1 | grep -E "Number|Failed" | head -5

echo ""
echo "Expected: <Number>+19185048902</Number>"
echo ""

# Test the outbound-api endpoint
echo "Test 3: Testing /api/outbound-api endpoint"
echo "-------------------------------------------"
echo ""

curl -s -X POST http://localhost:3002/api/outbound-api \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=DEBUG3&From=sip:yealink1@glo-head-spa-phones.sip.twilio.com:5060&To=4719185048902" 2>&1 | grep -E "Number|Failed" | head -5

echo ""
echo "Expected: <Number>+19185048902</Number>"
echo ""

# Check server health
echo "Server Status:"
echo "--------------"
curl -s http://localhost:3002/api/health 2>&1 | head -2 || echo "❌ Server not responding on port 3002"
curl -s http://localhost:3003/api/health 2>&1 | head -2 || echo "❌ Server not responding on port 3003"

echo ""
echo "If all tests show empty results, the server is not running."
echo "If Test 1 shows +74719185048902, there's a bug in the 11-digit handling."
echo "If Test 2 works correctly, Twilio might be sending 471+number."




