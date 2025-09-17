# Yealink Phone Setup - Final Steps

## ✅ Deployment Checklist

### 1. Deploy the Code
- [ ] Push the changes to git (server/routes.ts)
- [ ] Wait for Replit to auto-deploy (usually instant)

### 2. Set Environment Variable
- [ ] Go to Twilio Console: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
- [ ] Find YOUR Twilio phone number (it's NOT +19187277348)
- [ ] In Replit, click Secrets tab
- [ ] Add secret: TWILIO_PHONE_NUMBER = +1XXXXXXXXXX (your number)
- [ ] Restart your Replit app

### 3. Verify Setup
- [ ] Visit: https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice
- [ ] Should show: "Voice webhook is active. Caller ID is set to: +1XXXXXXXXXX"

### 4. Test Your Yealink
- [ ] Make a call from your Yealink phone
- [ ] Should connect successfully!

## If Still Not Working

Try the simple test endpoint (no caller ID required):
1. Change Twilio Voice URL to: 
   `https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice/simple`
2. Make a test call

## Important Notes
- The number +19187277348 is just a placeholder
- You MUST use your own Twilio phone number
- The env variable is required for SIP calls from Yealink
- After setting the secret, you must restart the app
