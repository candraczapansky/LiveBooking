# Diagnosing Your Twilio Call Issue

## Quick Tests to Run

### 1. Test if Webhook Works (No Dialing)
Change your Twilio SIP Domain Voice URL to:
```
https://www.glofloapp.com/api/webhook/voice/test-message
```
Then make a call. You should hear a test message. If you do, the webhook is working!

### 2. Test Simple Dialing
Change the Voice URL to:
```
https://www.glofloapp.com/api/webhook/voice/simple
```
This tries to dial a test number with no processing.

### 3. Check Twilio Account Status

Go to [Twilio Console](https://console.twilio.com) and check:

#### Are you on a Trial Account?
- Look for "Trial" badge or message
- If yes, you can ONLY call [verified numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
- Add the number you're trying to call to verified numbers

#### Check Your Phone Number
- Go to Phone Numbers → Manage → Active Numbers
- Click on +19187277348
- Make sure it's active and configured

#### Check Twilio Debugger
After a failed call, go to [Debugger](https://console.twilio.com/us1/monitor/logs/debugger) and look for:
- **Error 13224**: Dial to unverified number (trial account issue)
- **Error 21214**: Invalid caller ID
- **Error 13223**: No international permissions
- **Error 11750**: TLS/certificate issue

## Common Solutions

### If on Trial Account:
1. Verify the number you're trying to call
2. OR upgrade to a paid account

### If Caller ID Issue:
1. Make sure TWILIO_PHONE_NUMBER env variable is set in production
2. The number must be a Twilio number or verified caller ID

### If Still Not Working:
1. Deploy the latest changes
2. Set this environment variable: `TWILIO_TRIAL_MODE=true` 
3. Check server logs for the exact error

## Test Phone Numbers
If on trial, try calling these Twilio test numbers:
- +15005550006 (always answers)
- Your own cell phone (after verifying it)
