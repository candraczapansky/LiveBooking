# Setting Up Webhook URL for Helcim Terminal Payments

## Why Webhooks Are Important

Without a webhook, the app polls for payment status every 2 seconds. With a webhook configured, Helcim will instantly notify your app when a payment completes, making the checkout experience much faster.

## Option 1: Environment Variable Configuration (Recommended)

Add one of these environment variables to your server:

```bash
# Option A: Full webhook URL
TERMINAL_WEBHOOK_URL=https://yourdomain.com/api/terminal/webhook

# Option B: Base URL (webhook path will be added automatically)
PUBLIC_BASE_URL=https://yourdomain.com
```

**Important**: The URL must be:
- Using HTTPS (not HTTP)
- Publicly accessible (not localhost or private IP)
- Not behind authentication

## Option 2: Configure in Helcim Dashboard

1. Log into your Helcim Dashboard
2. Navigate to **Settings > Webhooks** or **Developer > Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **Webhook URL**: `https://yourdomain.com/api/terminal/webhook`
   - **Events to Subscribe**:
     - Card Transaction Completed
     - Card Transaction Failed
     - Terminal Payment Completed
5. Save the webhook configuration

## Testing Your Webhook

### 1. Check if webhook is being called
Look for these log messages in your server console:
```
🟢 POST /api/terminal/webhook
📥 Terminal webhook raw
```

### 2. Verify webhook is configured
When starting a payment, you should see:
```
✅ Using configured webhook URL: https://yourdomain.com/api/terminal/webhook
```

If you see this warning instead:
```
⚠️ No webhook URL configured. Set TERMINAL_WEBHOOK_URL or PUBLIC_BASE_URL environment variable
```
Then the webhook is not configured.

## Troubleshooting

### Payment completes on terminal but app doesn't update

**Without Webhook (Polling Mode)**:
- Check server logs for: `🔍 Checking payment status:`
- Look for: `📋 Looking up transaction by invoice number:`
- Verify: `✅ Found matching transaction by invoice:`
- The app polls every 2 seconds for up to 2 minutes

**With Webhook**:
- Check if webhook endpoint is receiving POST requests
- Verify your domain is publicly accessible
- Check Helcim Dashboard webhook logs for delivery status
- Ensure SSL certificate is valid

### Common Issues

1. **"Payment timed out" after 2 minutes**
   - The terminal took too long to process
   - Network issues preventing status checks
   - Wrong API token or device code

2. **Payment shows as pending indefinitely**
   - Terminal is not sending transaction data
   - API token doesn't have permission to read transactions
   - Invoice number mismatch

3. **Webhook not firing**
   - URL not publicly accessible
   - SSL certificate issues
   - Helcim webhook configuration missing

## Server Logs to Monitor

Enable detailed logging by watching these key messages:

```bash
# Payment initiation
🔍 Starting payment for location: X
📤 Sending payment to terminal

# Status checking (polling)
🔍 Checking payment status
📋 Looking up transaction by invoice number
🔍 Fetching recent transactions from device
📊 Found X recent transactions to search
✅ Found matching transaction by invoice

# Webhook receipt
📥 Terminal webhook raw
📬 Webhook cached

# Success/Failure
✅ Payment completed successfully!
❌ Payment failed with status: X
```

## Testing Flow

1. Start a payment from the appointments page
2. Watch server logs for the invoice number (e.g., `POS-1234567890123`)
3. Complete payment on terminal
4. Monitor logs for status updates
5. App should update within:
   - 1-2 seconds with webhook
   - 2-10 seconds with polling

## Need Help?

If payments are completing on the terminal but not updating in the app:

1. Check server logs for error messages
2. Verify terminal configuration in Settings > Locations
3. Test with a small amount first
4. Contact support with:
   - Invoice number from logs
   - Time of transaction
   - Any error messages
