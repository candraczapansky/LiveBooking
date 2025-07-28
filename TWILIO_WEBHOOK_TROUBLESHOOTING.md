# Twilio Webhook Troubleshooting Guide

## Current Status
✅ Webhook URL is accessible: `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms`
✅ Server is healthy and responding
✅ SMS auto-responder is working (confirmed by test logs)

## The Problem
Your webhook is working, but Twilio is not calling it when you send messages from your phone.

## Step-by-Step Troubleshooting

### 1. Verify Twilio Console Settings

**Go to:** https://console.twilio.com

**Navigate to:** Phone Numbers → Manage → Active numbers

**Click on:** +19187277348

**In the "Messaging" section, verify:**
- **Webhook URL:** `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms`
- **HTTP Method:** POST
- **Status:** Active

**⚠️ CRITICAL:** Make sure there are no extra spaces or characters in the webhook URL.

### 2. Check Twilio SMS Logs

**Go to:** https://console.twilio.com

**Navigate to:** Monitor → Logs → SMS Logs

**Look for:**
- Your recent message from your phone
- Any error messages
- Whether the webhook was called

**What to look for:**
- If you see your message but no webhook call, the webhook URL is wrong
- If you see webhook errors, there's a configuration issue
- If you don't see your message at all, there's a phone number issue

### 3. Common Issues and Solutions

#### Issue A: Webhook URL Not Set
**Symptoms:** Messages appear in Twilio logs but no webhook calls
**Solution:** Set the webhook URL in Twilio Console

#### Issue B: Wrong Webhook URL
**Symptoms:** Webhook calls fail with 404 errors
**Solution:** Use the exact URL: `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms`

#### Issue C: Phone Number Not Active
**Symptoms:** Messages don't appear in Twilio logs at all
**Solution:** Check if +19187277348 is active in your Twilio account

#### Issue D: Billing Issues
**Symptoms:** Messages fail to send
**Solution:** Check your Twilio account billing status

#### Issue E: Wrong HTTP Method
**Symptoms:** Webhook calls fail
**Solution:** Ensure HTTP method is set to POST

### 4. Alternative Testing Methods

#### Test with Twilio CLI (if available):
```bash
# List your phone numbers
twilio phone-numbers:list

# Update webhook URL
twilio phone-numbers:update +19187277348 --sms-url=https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms --sms-method=POST
```

#### Test with Different Phone Number:
Try sending a message from a different phone number. Sometimes Twilio has restrictions on certain numbers.

### 5. What to Expect When Working

**In Twilio Logs:**
- Your incoming message should appear
- A webhook call should be made to your URL
- The webhook should return a 200 status

**In Your Server Logs:**
- You should see: "Incoming SMS webhook received"
- You should see: "Processing incoming SMS for auto-response"
- You should see: "SMS auto-response sent successfully"

### 6. Immediate Action Plan

1. **Right now:** Go to Twilio Console and double-check the webhook URL
2. **Send a test message** from your phone to +19187277348
3. **Check Twilio logs** for any errors
4. **Check your server console** for webhook requests
5. **If still not working:** Try the Twilio CLI commands above

### 7. Emergency Contact

If you're still having issues after following these steps, the problem is likely:
- Twilio account configuration issue
- Phone number status issue
- Billing issue

Contact Twilio support with your account details and phone number +19187277348.

## Quick Verification Commands

```bash
# Test webhook directly
curl -X POST https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms \
  -H "Content-Type: application/json" \
  -d '{"From":"+19185048902","To":"+19187277348","Body":"Test","MessageSid":"test123"}'

# Check server health
curl https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/sms-auto-respond/health
``` 