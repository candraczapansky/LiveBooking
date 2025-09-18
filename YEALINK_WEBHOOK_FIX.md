# Yealink 471 Prefix Webhook Fix

## The Problem
Your Yealink phone adds a "471" prefix to dialed numbers, causing Twilio to interpret them as international numbers:
- You dial: `918-504-8902`
- Yealink sends: `4719185048902`
- Twilio was routing to: `+74719185048902` (Russia 🇷🇺)
- Should route to: `+19185048902` (USA 🇺🇸)

## The Fix Applied
Updated `/server/routes.ts` webhook to:

### 1. **Properly Extract Numbers from SIP URIs**
- Handles `sip:4719185048902@domain` format
- Extracts raw numbers like `4719185048902`
- Cleans up any non-numeric characters

### 2. **Remove Yealink 471 Prefix**
Detects and removes the 471 prefix in these cases:
- `4719185048902` (13 digits) → `9185048902` → `+19185048902`
- `47119185048902` (14 digits) → `19185048902` → `+19185048902`  
- `4715048902` (10 digits) → `918` + `5048902` → `+19185048902`
- `15048902` (8 digits) → `918` + `5048902` → `+19185048902`

### 3. **Force US Number Formatting**
All numbers are formatted as US (+1) to prevent international routing

## How to Apply & Test

### Step 1: Restart Your Server
```bash
# Kill existing processes
pkill -f node
pkill -f tsx

# Start the server
npm run dev
```

### Step 2: Test the Webhook (Optional)
```bash
# Make the test script executable
chmod +x test-yealink-webhook.sh

# Run the test (replace with your server URL if needed)
./test-yealink-webhook.sh http://localhost:3002
```

You should see:
```
✅ SUCCESS: Correctly formatted as +19185048902
   471 prefix was properly removed!
```

### Step 3: Watch the Logs
When you make a call, look for these log lines:
```
📞 Voice webhook called: { From: 'sip:yealink1@...', To: 'sip:4719185048902@...' }
🔍 Normalization - digits: 4719185048902 length: 13
✅ Removed 471 prefix from 13-digit number: 9185048902
✅ Formatted as 10-digit US number
📞 Final dial number: +19185048902
📞 FINAL TwiML being sent to Twilio:
  <Number>+19185048902</Number>
```

### Step 4: Make a Test Call
1. From your Yealink, dial: `918-504-8902`
2. Check Twilio Call Log
3. "Outgoing Dial → To" should show `+19185048902` (not +7471...)

## Important Notes

### Environment Variable
Ensure `TWILIO_PHONE_NUMBER` is set in E.164 format:
```bash
export TWILIO_PHONE_NUMBER="+19187277348"
```

### Twilio SIP Domain
Make sure your SIP domain's Voice URL points to:
- Development: `http://localhost:3002/api/webhook/voice`
- Production: `https://your-domain.com/api/webhook/voice`

### Trial Account Limitations
If using a Twilio trial account, you can only call [verified numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/verified).

## Troubleshooting

### If calls still fail:
1. **Check server logs** - Look for the "FINAL TwiML" output
2. **Check Twilio Call Log** - Open the failed call's Request Inspector:
   - Verify the Request URL is your webhook
   - Check the Response body contains `<Number>+19185048902</Number>`
3. **Verify environment** - Ensure `TWILIO_PHONE_NUMBER` is set correctly
4. **Test with curl** - Use the test script to verify webhook response

### Common Issues:
- **Server not restarted** - The fix requires a server restart
- **Wrong webhook URL** - Verify Twilio SIP domain points to your server
- **Caller ID missing** - Set `TWILIO_PHONE_NUMBER` environment variable
- **Trial account limits** - Can only call verified numbers

## Summary
The webhook now:
- ✅ Extracts numbers from SIP URIs correctly
- ✅ Removes the Yealink 471 prefix
- ✅ Formats all numbers as US (+1)
- ✅ Logs detailed information for debugging

Your calls should now route to US numbers correctly!




