# Webhook Endpoint Update - No "helcim" in URL

## Change Summary
The webhook endpoint has been updated to remove "helcim" from the URL path.

### Old Endpoint
```
/api/helcim/webhook
```

### New Endpoint
```
/api/terminal/webhook
```

## What Was Changed

1. **Added new webhook handler** in `/server/routes/terminal-routes.ts`
   - Full webhook processing logic added to terminal routes
   - Handles all webhook types (cardTransaction, terminalCancel, etc.)

2. **Updated webhook URL generation** in `/server/services/helcim-terminal-service.ts`
   - Now generates URLs with `/api/terminal/webhook` path
   - Automatically uses the new endpoint for all payments

3. **Backward Compatibility**
   - BOTH endpoints work: `/api/terminal/webhook` AND `/api/helcim/webhook`
   - Existing webhooks configured with old URL will continue to work

## Your Webhook URL

Based on your Replit domain, your webhook URL should be:
```
https://7f062013-da9b-456a-8305-658e55cfa352-00-38lwmgeecc6nr.riker.replit.dev/api/terminal/webhook
```

Note: You had a typo (`terimal` instead of `terminal`) - make sure to use `terminal` in the URL.

## Configuration Steps

### 1. Set Environment Variable
Add to your `.env` file:
```bash
PUBLIC_BASE_URL=https://7f062013-da9b-456a-8305-658e55cfa352-00-38lwmgeecc6nr.riker.replit.dev
```
OR directly set:
```bash
TERMINAL_WEBHOOK_URL=https://7f062013-da9b-456a-8305-658e55cfa352-00-38lwmgeecc6nr.riker.replit.dev/api/terminal/webhook
```

### 2. Configure in Helcim Dashboard
1. Log into Helcim
2. Go to Settings → Integrations → Webhooks
3. Add webhook URL:
   ```
   https://7f062013-da9b-456a-8305-658e55cfa352-00-38lwmgeecc6nr.riker.replit.dev/api/terminal/webhook
   ```
4. Enable for "Card Transactions"

### 3. Restart Your Server
After setting the environment variable, restart your server to pick up the new configuration.

## Testing

Test the webhook endpoint:
```bash
curl -X POST https://7f062013-da9b-456a-8305-658e55cfa352-00-38lwmgeecc6nr.riker.replit.dev/api/terminal/webhook \
  -H "Content-Type: application/json" \
  -d '{"id":"TEST-123","type":"cardTransaction"}'
```

You should receive:
```json
{"received": true}
```

## How It Works

1. **Payment starts** → App sends webhook URL to Helcim (without "helcim" in path)
2. **Payment completes** → Helcim sends webhook to `/api/terminal/webhook`
3. **Server processes** → Webhook is cached for polling
4. **App polls** → Finds cached status and completes payment

## Logs to Check

When a webhook is received, you'll see:
```
🌐 POST /api/terminal/webhook
📥 Terminal webhook received
🎯 Processing webhook: { id: 'TXN-123', type: 'cardTransaction' }
✅ Processing cardTransaction webhook as successful
✅ Webhook processed for transaction TXN-123 with status: completed
```

## Important Notes

- The word "helcim" is NOT in the webhook URL path
- Both endpoints work for backward compatibility
- The terminal service is shared between both endpoints
- Webhook processing logic is identical for both paths
