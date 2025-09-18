# 📞 Fix Voice Not Answering - Complete Guide

## ❌ Problem: "It doesn't pick up ever"

The voice responder isn't answering because **the Python service isn't running**. Here's how to fix it:

## ✅ Solution: 3-Step Setup

### Step 1: Start the Python Service
```bash
cd python_sms_responder
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Step 2: Start ngrok (in a NEW terminal)
```bash
./ngrok http 8000
```

You'll see something like:
```
Forwarding: https://abc123xyz.ngrok.io -> http://localhost:8000
                    ↑ COPY THIS URL ↑
```

### Step 3: Update Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to: **Phone Numbers** → **Manage** → **Active Numbers**
3. Click your phone number
4. Update the **Voice & Fax** section:

| Setting | Value |
|---------|-------|
| **A CALL COMES IN** | Webhook |
| **URL** | `https://YOUR-NGROK-ID.ngrok.io/webhook/voice` |
| **METHOD** | HTTP POST |

5. Click **Save**

## 🧪 Test It!

### Option 1: Call Your Twilio Number
- Dial your Twilio number from any phone
- Should hear: "Hello! Welcome to our salon. I'm your AI assistant..."

### Option 2: Test with cURL
```bash
# Replace with your actual ngrok URL
curl -X POST https://abc123xyz.ngrok.io/webhook/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=TEST123&From=+19185551234&To=+19187277348&CallStatus=ringing"
```

## 🔍 Debugging Checklist

### ✅ Is the Python service running?
```bash
# Check if it's running
curl http://localhost:8000/health
```
Should return: `{"status":"healthy","service":"salon_sms_responder"}`

### ✅ Is ngrok connected?
```bash
# Check ngrok status
curl http://127.0.0.1:4040/api/tunnels
```
Should show your tunnel information.

### ✅ Is Twilio webhook configured?
- Check Twilio Console shows your ngrok URL
- Make sure it's HTTPS (not HTTP)
- Ensure it ends with `/webhook/voice`

## 📊 What You Should See in Logs

When someone calls, your Python terminal should show:
```
Received voice call from +1234567890 (CallSid: CAxxxxx)
Creating initial TwiML response
```

## 🚨 Common Issues & Fixes

### Issue: "Connection refused"
**Fix**: Python service not running. Start it with:
```bash
cd python_sms_responder && python -m uvicorn main:app --port 8000
```

### Issue: "404 Not Found"
**Fix**: Wrong webhook URL. Should be: `https://xxxx.ngrok.io/webhook/voice`

### Issue: "No audio when calling"
**Fix**: Check Twilio webhook is set to POST (not GET)

### Issue: "ngrok tunnel expired"
**Fix**: Restart ngrok and update Twilio with new URL

## 🎯 Quick One-Liner to Start Everything

```bash
# Terminal 1:
cd python_sms_responder && python -m uvicorn main:app --port 8000

# Terminal 2:
./ngrok http 8000

# Then update Twilio with the ngrok URL!
```

## 📞 Expected Call Flow

1. **You dial** → (918) 727-7348
2. **Twilio receives** → Routes to your webhook
3. **Webhook URL** → https://xxxx.ngrok.io/webhook/voice
4. **Python responds** → Sends TwiML instructions
5. **You hear** → "Hello! Welcome to our salon..."

---

**The key issue**: Your Python service wasn't running! Start it first, then ngrok, then update Twilio. 🚀
