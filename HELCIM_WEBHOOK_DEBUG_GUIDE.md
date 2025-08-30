# 🔧 Helcim Smart Terminal Webhook Debug Guide

## ✅ What's Been Fixed

1. **Webhook Signature Verification**: Added proper HMAC SHA-256 signature verification as required by Helcim
2. **Minimal Payload Handling**: Correctly handles Helcim's minimal webhook format `{"id":"TRANSACTION_ID", "type":"cardTransaction"}`
3. **Transaction Enrichment**: Automatically fetches full transaction details using the API when webhook is received
4. **Status Detection**: Properly marks transactions as "completed" since Helcim only sends webhooks for successful transactions
5. **Caching**: Improved webhook caching to store transaction data for polling endpoints

## 📋 Required Setup Steps

### 1. Get Your Verifier Token from Helcim

1. Log in to your Helcim account
2. Go to **All Tools** → **Integrations** → **Webhooks**
3. Copy the **Verifier Token** shown on the page
4. Save it for the next step

### 2. Set Environment Variable

Add the verifier token to your environment:

```bash
export HELCIM_WEBHOOK_VERIFIER_TOKEN="YOUR_VERIFIER_TOKEN_HERE"
```

Or add it to your `.env` file:
```
HELCIM_WEBHOOK_VERIFIER_TOKEN=YOUR_VERIFIER_TOKEN_HERE
```

### 3. Configure Webhook URL in Helcim

1. In Helcim webhook settings, set your **Deliver URL** to:
   ```
   https://YOUR_DOMAIN/api/helcim/webhook
   ```
   
2. Make sure:
   - Webhooks are **ON**
   - **Card Transaction** is checked
   - URL uses **HTTPS** (required by Helcim)
   - URL does NOT contain the word "Helcim"

## 🧪 Testing the Webhook

### Test 1: Simulate a Helcim Webhook

Run the test script to simulate a webhook:

```bash
node test-helcim-webhook.js
```

This will send a test webhook with the exact format Helcim uses.

### Test 2: Check Webhook Processing

After sending a test webhook, check if it was processed:

```bash
# Check payment status (replace TEST_ID with your transaction ID)
curl "http://localhost:3001/api/terminal/payment/test/TEST_ID"

# Check debug info to see cached webhooks
curl "http://localhost:3001/api/terminal/debug"
```

### Test 3: Real Payment Test

1. Start a payment on your Smart Terminal
2. Watch the server logs for webhook activity:
   ```bash
   # You should see:
   # 🟢 POST /api/helcim/webhook
   # 📥 Helcim webhook received
   # ✅ Webhook signature verified successfully (if verifier token is set)
   # 🎯 Processing cardTransaction webhook
   # 🧩 Enriched webhook via API (if API call succeeds)
   # ✅ Webhook processing complete
   ```

## 🔍 Debugging Common Issues

### Issue 1: Webhook Not Received

**Check:**
- Is the webhook URL correctly configured in Helcim?
- Is your server accessible from the internet? (not localhost)
- Are webhooks enabled in Helcim settings?

**Solution:**
- Use ngrok or similar to expose local server: `ngrok http 3001`
- Update Helcim webhook URL to use the ngrok URL

### Issue 2: Signature Verification Failed

**Check:**
- Is `HELCIM_WEBHOOK_VERIFIER_TOKEN` set correctly?
- Did you copy the entire token from Helcim?

**Solution:**
- Re-copy the verifier token from Helcim webhook settings
- Make sure there are no extra spaces or line breaks

### Issue 3: Transaction Details Not Enriched

**Check server logs for:**
```
ℹ️ Transaction not yet available in API; proceeding with minimal webhook data
```

**This is normal** - Sometimes the transaction isn't immediately available in the API. The webhook handler will:
1. Still mark the payment as completed
2. Cache the transaction ID
3. Allow the payment to be confirmed

### Issue 4: Payment Status Shows Pending

**Check:**
1. Was the webhook received? Check server logs
2. Is the transaction ID correct?
3. Check the webhook cache:
   ```bash
   curl "http://localhost:3001/api/terminal/debug"
   ```

## 📊 Webhook Flow Diagram

```
1. Payment completed on Smart Terminal
    ↓
2. Helcim sends webhook: {"id":"12345", "type":"cardTransaction"}
    ↓
3. Your server receives webhook at /api/helcim/webhook
    ↓
4. Server verifies signature (if verifier token is set)
    ↓
5. Server marks transaction as "completed" in cache
    ↓
6. Server tries to enrich data by calling GET /v2/card-transactions/{id}
    ↓
7. Server caches all data (with or without enrichment)
    ↓
8. Server responds 200 OK to Helcim
    ↓
9. Your app polls /api/terminal/payment/{id} and gets "completed" status
```

## 🛠️ Advanced Debugging

### View All Cached Webhooks

```javascript
// Add this temporary endpoint to server/routes/terminal-routes.ts
router.get('/debug/webhooks', (req, res) => {
  const snapshot = terminalService.getDebugSnapshot();
  res.json(snapshot);
});
```

Then visit: `http://localhost:3001/api/terminal/debug/webhooks`

### Test Webhook with Specific Invoice Number

```bash
# Modify test-helcim-webhook.js to use a specific transaction ID
const TEST_TRANSACTION_ID = 'YOUR_REAL_TRANSACTION_ID';
```

### Monitor Webhook Activity in Real-Time

```bash
# Watch server logs
tail -f server.log | grep -E "webhook|Webhook|cardTransaction"
```

## ✅ Success Indicators

You know webhooks are working when:

1. **Server logs show**: "✅ Webhook processing complete"
2. **Payment status endpoint returns**: `{"status": "completed"}`
3. **Debug endpoint shows**: Cached webhook data with transaction IDs
4. **Helcim dashboard shows**: Successful webhook delivery (200 response)

## 📞 Need More Help?

1. **Check Helcim webhook status**: In Helcim dashboard, check webhook delivery history
2. **Verify API permissions**: Ensure your API token has permission to read transactions
3. **Test with real payment**: Sometimes test transactions behave differently
4. **Contact Helcim support**: They can see webhook delivery logs on their end

## 🎯 Quick Checklist

- [ ] Verifier token copied from Helcim
- [ ] HELCIM_WEBHOOK_VERIFIER_TOKEN environment variable set
- [ ] Webhook URL configured in Helcim (HTTPS, no "Helcim" in URL)
- [ ] Webhooks enabled in Helcim
- [ ] Card Transaction events selected
- [ ] Server accessible from internet (not localhost)
- [ ] Test webhook shows "received: true" response
- [ ] Payment status shows "completed" after webhook

