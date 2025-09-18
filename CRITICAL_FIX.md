# CRITICAL: Twilio 471 Prefix Issue

## The Problem
Based on your call logs, when your Yealink dials 918-504-8902:
1. Twilio receives: `sip:19185048902@...` (correct - 11 digits)
2. But then dials: `+74719185048902` (WRONG - Russia)

This means Twilio is ADDING "471" somewhere, creating "47119185048902" and interpreting it as +7 (Russia).

## Possible Causes

### 1. SIP Domain Configuration (Most Likely)
Your Twilio SIP domain might have a **dial plan or prefix rule** that adds "471" to outbound calls.

**Check in Twilio Console:**
1. Go to: Voice → Manage → SIP Domains
2. Click on: `glo-head-spa-phones.sip.twilio.com`
3. Look for:
   - **Voice URL**: Should be `https://your-domain/api/webhook/voice`
   - **Dial Plans**: Check if there's a rule adding "471"
   - **Credential Lists**: Check for prefix settings
   - **IP Access Control**: Check for transformations

### 2. Webhook Not Being Called
The webhook might not be getting called at all.

**To verify:**
1. Check Twilio Call Logs → Click on the failed call
2. Open "Request Inspector"
3. Look for "Request URL" - is it hitting your webhook?
4. Check "Response" - does it contain the correct TwiML?

### 3. Wrong Webhook URL
Twilio might be configured to use a different endpoint.

**We've added handlers for:**
- `/api/webhook/voice` (main)
- `/api/outbound-api` (fallback)
- Catch-all logger for unknown voice endpoints

## Immediate Actions

### 1. Restart Your Server
```bash
pkill -f node
pkill -f tsx
npm run dev
```

### 2. Run Debug Script
```bash
chmod +x debug-471-issue.sh
./debug-471-issue.sh
```

### 3. Make a Test Call
Watch the server console for:
- `📞 Voice webhook called:` - confirms webhook is hit
- `🚨 UNKNOWN VOICE ENDPOINT` - reveals wrong endpoint
- `⚠️ OUTBOUND-API endpoint` - alternate endpoint
- `📞 FINAL TwiML` - shows what's sent to Twilio

### 4. Check Twilio Console
In the failed call's Request Inspector:
- **Request URL**: What endpoint is Twilio calling?
- **Request Body**: What's the To field value?
- **Response Body**: What TwiML is returned?

## The Fix

The code now:
1. Handles all variations of 471 prefix
2. Logs extensive debug information
3. Has fallback endpoints
4. Forces US number formatting

But if Twilio is adding 471 in the SIP domain configuration, you need to remove it there!

## Critical Questions

1. **Is your webhook being called?** (check server logs)
2. **What's the exact To value Twilio sends?** (check debug logs)
3. **Is there a dial plan in Twilio adding 471?** (check SIP domain settings)
4. **What webhook URL is configured?** (check Twilio console)

Share the answers to these and we can pinpoint the exact issue!




