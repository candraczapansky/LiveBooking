# Helcim Webhook Debug Summary

## ✅ What's Working
- Helcim confirms webhook URL is configured correctly
- They're receiving **200 OK** responses from your server
- Webhook notifications are being sent successfully for transactions

## 📋 Changes Made
1. **Enhanced Webhook Logging** (`server/routes/helcim-webhooks.ts`)
   - Added detailed logging of raw webhook data
   - Logs headers, body, and parsed data
   - Extracts more fields from the webhook payload

2. **Improved Webhook Processing** (`server/services/helcim-terminal-service.ts`)
   - Better status detection (approved, completed, failed)
   - Caches webhook data by both invoice number AND transaction ID
   - Attempts to match webhooks with recent sessions even if invoice numbers don't match exactly
   - Shows last 5 cached keys for debugging

3. **Debug Helper Script** (`test-webhook-debug.js`)
   - Check webhook logs
   - Test endpoint health
   - Simulate webhooks for testing

## 🔍 How to Debug

### 1. Check Server Logs
After making a payment through the terminal, check the logs immediately:
```bash
# Check for webhook activity
grep -E "webhook|Webhook|📥|📋|💾" server-current.log

# Or watch logs in real-time
tail -f server-current.log
```

### 2. Look for These Log Patterns
When a webhook arrives, you should see:
```
📥 Raw webhook received: { headers: {...}, body: {...} }
📋 Parsed webhook body: { ... }
✅ Normalized webhook data: { invoiceNumber, transactionId, status, ... }
💾 Cached by invoice: POS-xxxxx
💾 Cached by transaction: xxxxx
✅ Webhook processing complete: { ... }
```

### 3. Common Issues & Solutions

**Issue: Webhook received but not matching payment**
- Check if invoice number format matches between payment request and webhook
- Look for the `📌 Associating webhook with session` log
- The system now tries to match webhooks to recent sessions automatically

**Issue: Status stays pending**
- Check if webhook contains `approved: true` or `type: 'cardTransaction'`
- System now assumes "completed" for webhooks with transaction IDs

**Issue: No logs appear**
- Restart the server to load the new logging code
- Verify webhook URL in Helcim dashboard points to your server

### 4. Test Webhook Manually
```bash
# Send a test webhook
node test-webhook-debug.js simulate
```

## 🚀 Next Steps After Server Restart

1. **Restart the server** to load the enhanced logging:
   ```bash
   # Stop current server (Ctrl+C)
   # Start with fresh logs
   npm run dev
   ```

2. **Make a test payment** through the terminal

3. **Check logs immediately** for webhook data

4. **Share the log output** showing:
   - The raw webhook received
   - The normalized data
   - Any error messages

## 📝 What to Share with Support

If issues persist, share:
1. The exact webhook payload Helcim is sending (from logs)
2. The invoice/transaction IDs being used
3. Any error messages in the logs
4. The time of the transaction

The enhanced logging will now capture all the details needed to diagnose why the webhook might not be correlating with your payment requests.
