# Twilio Phone Number Troubleshooting Guide

## 🚨 Issue: "Your call cannot be completed as dialed"

This error occurs when there's a problem with your Twilio phone number configuration. Here's how to fix it:

## 🔍 Step-by-Step Troubleshooting

### 1. Check Your Twilio Phone Number Status

**Log into your Twilio Console:**
1. Go to [console.twilio.com](https://console.twilio.com)
2. Navigate to **Phone Numbers → Manage → Active numbers**
3. Find your phone number and click on it

**Verify these settings:**

#### ✅ Voice Configuration
- **Voice Configuration**: Should be set to **Webhook**
- **Webhook URL**: `https://your-domain.com/webhook/voice` (or your ngrok URL)
- **HTTP Method**: POST
- **Primary Handler**: Webhook

#### ✅ Voice Capabilities
- **Voice**: ✅ Enabled
- **Voice Configuration**: Webhook
- **Status Callback URL**: `https://your-domain.com/webhook/voice/status`
- **Status Callback Events**: `completed`, `busy`, `failed`, `no-answer`

### 2. Common Issues and Solutions

#### Issue A: Phone Number Not Configured for Voice
**Symptoms**: "Call cannot be completed as dialed"
**Solution**:
1. In Twilio Console, go to your phone number
2. Under **Voice Configuration**, select **Webhook**
3. Set the webhook URL to your server endpoint
4. Save the configuration

#### Issue B: Webhook URL Not Accessible
**Symptoms**: Calls fail or timeout
**Solution**:
1. **For testing**: Use ngrok to expose your local server
   ```bash
   ngrok http 8000
   ```
2. **For production**: Use a public HTTPS URL
3. Update the webhook URL in Twilio Console

#### Issue C: Phone Number Not Active
**Symptoms**: "Number not in service"
**Solution**:
1. Check if your Twilio account has sufficient credits
2. Verify the phone number is active in your account
3. Check for any account restrictions

### 3. Quick Fix Steps

#### Step 1: Verify Your Server is Running
```bash
# Check if server is running
curl http://localhost:8000/health
```

#### Step 2: Expose Your Server (for testing)
```bash
# Install ngrok if you haven't
# Download from https://ngrok.com/

# Expose your local server
ngrok http 8000
```

#### Step 3: Update Twilio Webhook URLs
1. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
2. In Twilio Console, update your phone number:
   - **Voice Webhook URL**: `https://abc123.ngrok.io/webhook/voice`
   - **Status Callback URL**: `https://abc123.ngrok.io/webhook/voice/status`

#### Step 4: Test the Webhook
```bash
# Test the webhook endpoint
curl -X POST https://abc123.ngrok.io/webhook/voice \
  -d 'CallSid=test123&From=+1234567890&To=+0987654321&AccountSid=test&CallStatus=ringing'
```

### 4. Configuration Checklist

#### ✅ Twilio Phone Number Settings
- [ ] Voice is enabled
- [ ] Voice configuration is set to Webhook
- [ ] Webhook URL is correct and accessible
- [ ] HTTP method is POST
- [ ] Status callback URL is set
- [ ] Status callback events include: completed, busy, failed, no-answer

#### ✅ Server Configuration
- [ ] Server is running on port 8000
- [ ] Webhook endpoints are accessible
- [ ] HTTPS URL is used (for production)
- [ ] No firewall blocking the connection

#### ✅ Environment Variables
- [ ] `TWILIO_ACCOUNT_SID` is set
- [ ] `TWILIO_AUTH_TOKEN` is set
- [ ] `TWILIO_PHONE_NUMBER` is set
- [ ] `OPENAI_API_KEY` is set (optional for testing)

### 5. Testing Your Setup

#### Test 1: Local Server Test
```bash
# Test local server
curl http://localhost:8000/health
```

#### Test 2: Webhook Test
```bash
# Test webhook endpoint
curl -X POST http://localhost:8000/webhook/voice \
  -d 'CallSid=test123&From=+1234567890&To=+0987654321&AccountSid=test&CallStatus=ringing'
```

#### Test 3: Phone Call Test
1. Call your Twilio phone number
2. You should hear: "Hello! Welcome to our salon. I'm your AI assistant..."
3. Speak your request
4. AI should respond

### 6. Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Call cannot be completed as dialed" | Phone number not configured for voice | Set voice configuration to webhook |
| "Number not in service" | Phone number inactive or insufficient credits | Check account status and credits |
| "Call failed" | Webhook URL not accessible | Use ngrok or public HTTPS URL |
| "Timeout" | Server not responding | Check server logs and webhook URL |

### 7. Debugging Commands

#### Check Server Logs
```bash
# Monitor server logs
tail -f server.log
```

#### Test Twilio Connection
```bash
# Test Twilio credentials
python3 -c "
from twilio.rest import Client
import os
from dotenv import load_dotenv
load_dotenv()

client = Client(os.getenv('TWILIO_ACCOUNT_SID'), os.getenv('TWILIO_AUTH_TOKEN'))
numbers = client.incoming_phone_numbers.list()
print(f'Found {len(numbers)} phone numbers:')
for num in numbers:
    print(f'  {num.phone_number} - {num.voice_url}')
"
```

#### Test Webhook Endpoint
```bash
# Test webhook with curl
curl -X POST http://localhost:8000/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&From=+1234567890&To=+0987654321&AccountSid=test&CallStatus=ringing"
```

### 8. Production Setup

For production deployment:

1. **Use a public HTTPS URL** (not ngrok)
2. **Set up SSL certificates**
3. **Configure proper domain**
4. **Update Twilio webhook URLs** to your production domain
5. **Monitor server logs** for any issues

### 9. Still Having Issues?

If you're still experiencing problems:

1. **Check Twilio Console logs** for detailed error messages
2. **Verify your Twilio account status** and credits
3. **Test with a different phone number** if available
4. **Contact Twilio support** if the issue persists

---

**Remember**: The most common cause of "call cannot be completed as dialed" is incorrect voice configuration in the Twilio Console. Make sure your phone number is set to use webhooks for voice calls. 