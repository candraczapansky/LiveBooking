# ✅ SMS AI Responder - Webhook Configuration

## CRITICAL: Update Your Twilio Webhook URL

Your SMS AI responder is **working correctly** but Twilio is sending messages to the wrong URL!

### Current Status:
- ✅ Python AI responder: Running on port 8000
- ✅ Node.js server: Running on port **3006** 
- ✅ SMS forwarding to Python: Working
- ✅ Webhook endpoints: Ready and tested

## Available Webhook Endpoints

The server accepts SMS webhooks at ANY of these URLs:
- `/api/webhook/incoming-sms` ← **YOUR CURRENT TWILIO SETTING**
- `/api/sms-auto-respond/webhook` 
- `/api/sms/webhook`
- `/sms`
- `/sms/webhook`
- `/incoming-sms`
- `/webhooks/sms`
- `/api/twilio/sms`

## ACTION REQUIRED: Update Twilio Console

### Option 1: Update Twilio Console (Recommended)
1. Go to https://console.twilio.com
2. Navigate to: Phone Numbers → Manage → Active numbers
3. Click on: +19187277348
4. In the "Messaging" section, update:
   - **Webhook URL:** `https://YOUR-REPLIT-DOMAIN-3006.replit.app/api/webhook/incoming-sms`
   - **HTTP Method:** POST

### Option 2: Find Your Actual Replit URL
Run this command to get your public URL:
```bash
curl -s https://replit.com/data/repls/@$(whoami)/$(basename $PWD) | grep -o '"url":"[^"]*' | cut -d'"' -f4
```

Then append: `:3006/api/webhook/incoming-sms`

### Option 3: Use ngrok (if available)
```bash
ngrok http 3006
```
Use the ngrok URL + `/api/webhook/incoming-sms`

## Testing

### Test Locally (Working!)
```bash
curl -X POST http://localhost:3006/api/webhook/incoming-sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2BYOURPHONE&To=%2B19187277348&Body=Test&MessageSid=test&AccountSid=AC2f2ec0300713e653facec924bfa07ba6"
```

### Test From Real Phone
Once you update the Twilio webhook URL, just text +19187277348

## Troubleshooting

If messages still don't work after updating Twilio:

1. **Check Twilio Logs**: https://console.twilio.com → Monitor → Logs → SMS
2. **Verify Port**: Server is on port **3006** (not 3002, 3004, or 5000)
3. **Check Server**: `curl http://localhost:3006/api/health`
4. **Restart if needed**:
   ```bash
   pkill -f "node.*dev"
   cd /home/runner/workspace && npm run dev &
   ```

## Summary

**Your code is working!** The issue is that Twilio needs to know where to send the SMS webhooks. The server is listening on port 3006 and will accept webhooks at `/api/webhook/incoming-sms` (and many other paths).

You just need to update the webhook URL in your Twilio console to point to your Replit app on port 3006.
