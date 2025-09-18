# Replit Deployment for Yealink Webhook

## The Issue
Replit doesn't allow arbitrary external ports. Your app runs internally, and Replit routes traffic from your public URL to whatever port your app uses.

## Your Public URL
Your webhook should be accessible at:
- **Development**: `https://workspace-<username>.replit.app/api/webhook/voice`
- Look at your Replit URL in the webview panel for the exact domain

## Steps to Fix

### 1. Start Server (Let it Auto-Select Port)
```bash
pkill -f node
pkill -f tsx
npm run dev
```

The server will start on port 3002 or 3003 internally, and Replit will route external traffic to it.

### 2. Find Your Public URL
In Replit:
- Click the "Webview" tab
- Copy the URL shown (like `https://workspace-yourusername.replit.app`)
- Your webhook URL is: `https://[your-domain]/api/webhook/voice`

### 3. Test Webhook Externally
From any browser or external tool:
```bash
curl https://[your-replit-domain]/api/webhook/voice
```

Should return: "Voice webhook is active..."

### 4. Update Twilio
1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to: Voice → Manage → SIP Domains
3. Click: `glo-head-spa-phones.sip.twilio.com`
4. Update **Voice URL** to: `https://[your-replit-domain]/api/webhook/voice`
5. Save changes

### 5. Test with Exact Scenario
Once your server is running, test the exact call scenario:
```bash
curl -X POST https://[your-replit-domain]/api/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=TEST&From=sip:yealink1@glo-head-spa-phones.sip.twilio.com:5060&To=sip:4719185048902@glo-head-spa-phones.sip.twilio.com:5060"
```

Should return TwiML with: `<Number>+19185048902</Number>`

## Important Notes

### About Ports
- **Internal**: Your app runs on 3002/3003 (doesn't matter which)
- **External**: Replit handles routing - NO PORT in URLs
- **Twilio**: Use your Replit domain WITHOUT port number

### Check Server Logs
When you make a call, watch for:
```
📞 Voice webhook called: { From: 'sip:yealink1@...', To: 'sip:...' }
🔍 Normalization - digits: 4719185048902 length: 13
✅ Removed 471 prefix from 13-digit number: 9185048902
📞 Final dial number: +19185048902
```

### If Webhook Still Not Called
1. Verify Twilio has the correct Replit URL
2. Check if URL is publicly accessible (test in browser)
3. Look for firewall/security settings in Twilio
4. Check SIP domain for dial plans adding "471"

## The Fix Is Ready
The code properly handles the 471 prefix. Once Twilio can reach your webhook at the Replit URL, calls should work correctly!











