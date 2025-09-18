#!/bin/bash

echo "📞 Testing Yealink Voice Webhook Fix"
echo "====================================="
echo ""

# Configuration - update if needed
SERVER_URL="${1:-http://localhost:3002}"
echo "Testing against: $SERVER_URL"
echo ""

echo "Test 1: Yealink with 471 prefix (13 digits)"
echo "--------------------------------------------"
echo "Input: sip:4719185048902@glo-head-spa-phones.sip.twilio.com:5060"
echo ""

RESPONSE=$(curl -s -X POST $SERVER_URL/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=TEST471&From=sip:yealink1@glo-head-spa-phones.sip.twilio.com:5060&To=sip:4719185048902@glo-head-spa-phones.sip.twilio.com:5060")

NUMBER=$(echo "$RESPONSE" | grep -o '<Number>[^<]*</Number>' | sed 's/<[^>]*>//g')

if [[ "$NUMBER" == "+19185048902" ]]; then
    echo "✅ SUCCESS: Correctly formatted as $NUMBER"
    echo "   471 prefix was properly removed!"
else
    echo "❌ FAILED: Got $NUMBER instead of +19185048902"
    echo "Full response:"
    echo "$RESPONSE"
fi

echo ""
echo "Test 2: Normal US number (11 digits)"
echo "-------------------------------------"
echo "Input: sip:19185048902@glo-head-spa-phones.sip.twilio.com:5060"
echo ""

RESPONSE2=$(curl -s -X POST $SERVER_URL/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=TEST11D&From=sip:yealink1@glo-head-spa-phones.sip.twilio.com:5060&To=sip:19185048902@glo-head-spa-phones.sip.twilio.com:5060")

NUMBER2=$(echo "$RESPONSE2" | grep -o '<Number>[^<]*</Number>' | sed 's/<[^>]*>//g')

if [[ "$NUMBER2" == "+19185048902" ]]; then
    echo "✅ SUCCESS: Correctly formatted as $NUMBER2"
else
    echo "❌ FAILED: Got $NUMBER2 instead of +19185048902"
fi

echo ""
echo "Test 3: Local number with 1 prefix (8 digits)"
echo "-----------------------------------------------"
echo "Input: sip:15048902@glo-head-spa-phones.sip.twilio.com:5060"
echo ""

RESPONSE3=$(curl -s -X POST $SERVER_URL/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=TEST8D&From=sip:yealink1@glo-head-spa-phones.sip.twilio.com:5060&To=sip:15048902@glo-head-spa-phones.sip.twilio.com:5060")

NUMBER3=$(echo "$RESPONSE3" | grep -o '<Number>[^<]*</Number>' | sed 's/<[^>]*>//g')

if [[ "$NUMBER3" == "+19185048902" ]]; then
    echo "✅ SUCCESS: Correctly formatted as $NUMBER3"
else
    echo "❌ FAILED: Got $NUMBER3 instead of +19185048902"
fi

echo ""
echo "Test 4: 471 + 7-digit local (10 digits total)"
echo "-----------------------------------------------"
echo "Input: sip:4715048902@glo-head-spa-phones.sip.twilio.com:5060"
echo ""

RESPONSE4=$(curl -s -X POST $SERVER_URL/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=TEST10D&From=sip:yealink1@glo-head-spa-phones.sip.twilio.com:5060&To=sip:4715048902@glo-head-spa-phones.sip.twilio.com:5060")

NUMBER4=$(echo "$RESPONSE4" | grep -o '<Number>[^<]*</Number>' | sed 's/<[^>]*>//g')

if [[ "$NUMBER4" == "+19185048902" ]]; then
    echo "✅ SUCCESS: Correctly formatted as $NUMBER4"
else
    echo "❌ FAILED: Got $NUMBER4 instead of +19185048902"
fi

echo ""
echo "========================================="
echo "All tests complete!"
echo ""
echo "If all tests show ✅ SUCCESS, your webhook is fixed!"
echo "Now restart your server and make a real call from your Yealink."














