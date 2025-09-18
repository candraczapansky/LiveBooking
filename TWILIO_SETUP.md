# 📞 TWILIO CONFIGURATION FOR AI RESPONDER

## ✅ Your Replit is Deployed!

Your app is live at: `https://dev-booking-91625-candraczapansky.replit.app`

## 🔧 Configure Twilio Phone Number

### Step 1: Go to Twilio Console
1. Visit [https://console.twilio.com](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Active numbers**
3. Click on your phone number: **+1 (918) 727-7348**

### Step 2: Update Voice Configuration
In the **Voice Configuration** section, set:

- **A CALL COMES IN**: 
  - Webhook: `https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice`
  - HTTP Method: **POST**

- **CALL STATUS CHANGES** (optional):
  - Webhook: `https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice/status`
  - HTTP Method: **POST**

### Step 3: Save Configuration
Click **Save Configuration** at the bottom of the page.

## 📱 How It Works

1. **Someone calls your Twilio number** (+1-918-727-7348)
2. **Twilio sends webhook** to your Replit app
3. **Your app routes to Yealink phone** first
4. **If Yealink doesn't answer in 10 seconds:**
   - Call forwards to AI responder
   - AI answers with: "Hello! Welcome to our salon. I'm your AI assistant."
   - Customer can ask questions about appointments, services, hours, etc.

## 🎯 Testing Your Setup

### Test 1: Direct Voice Webhook
```bash
curl -X POST https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+19185551234&To=+19187277348"
```

Should return TwiML with Yealink routing.

### Test 2: Make a Real Call
1. Call **+1 (918) 727-7348** from any phone
2. You should hear: "Thank you for calling Glo Head Spa. Connecting you now."
3. If Yealink doesn't answer, AI responder will take over

## ⚠️ Troubleshooting

### If calls aren't working:

1. **Check Twilio webhook is configured correctly**
   - Go to Twilio console → Phone Numbers
   - Verify the webhook URL is exactly: `https://dev-booking-91625-candraczapansky.replit.app/api/webhook/voice`

2. **Verify Replit is running**
   - Your Replit app should show "Webview" is active
   - The URL should be accessible in browser

3. **Check Call Logs in Twilio**
   - Go to Monitor → Logs → Calls
   - Look for any error messages

4. **For AI Responder Issues**
   - The AI uses fallback responses (no OpenAI key needed)
   - Common responses are pre-programmed for appointments, services, hours

## 📝 Current Status

✅ **Yealink Phone**: Working - receives calls first
✅ **AI Fallback**: Ready - answers if Yealink doesn't pick up
✅ **Fallback Responses**: Active - handles common questions

## 🔑 To Enable Advanced AI Features

Add real API keys to your Replit Secrets:
- `OPENAI_API_KEY`: For AI-powered conversations
- `TWILIO_AUTH_TOKEN`: For full Twilio features

The system works without these using intelligent fallback responses!

