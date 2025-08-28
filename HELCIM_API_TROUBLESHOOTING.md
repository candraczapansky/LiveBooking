# Helcim API 404 Troubleshooting Guide

## Current Issue
The Helcim API is returning "404 page not found" errors for transaction endpoints.

## What We've Fixed

1. **Changed endpoint paths**:
   - `/transactions` → `/card-transactions`
   - `/devices/{deviceCode}/transactions` → `/card-transactions`
   - Device-specific endpoints → Generic endpoints

2. **Updated payment initiation**:
   - Changed to use `/payment/purchase` endpoint
   - Added terminalId to payload for device routing

## Possible Causes of 404 Errors

### 1. API Token Issues
The API token might not have the correct permissions or might be invalid.

**To verify**:
1. Log into Helcim Dashboard
2. Go to **Settings > API Access**
3. Check that your API token has these permissions:
   - Read Transactions
   - Process Payments
   - Terminal Access

### 2. Wrong API Version
We're using `https://api.helcim.com/v2/` - verify this is correct.

**To check**:
- Visit https://docs.helcim.com to verify the current API version
- The base URL should be `https://api.helcim.com/v2`

### 3. Terminal Not in API Mode
The terminal might not be properly configured for API access.

**To fix**:
1. Log into Helcim Dashboard
2. Go to **Settings > Smart Terminal API**
3. Ensure **API Mode** is enabled
4. Log out and back into your terminal device

### 4. Device Code Mismatch
The device code "UOJS" might be incorrect.

**To verify**:
1. Check the terminal screen after logging in with API mode
2. The device code should be displayed
3. Update it in Settings > Locations > Terminal Configuration

## Testing with cURL

Test if the API is accessible at all:

```bash
# Test basic API access
curl -H "api-token: YOUR_API_TOKEN" \
     -H "Accept: application/json" \
     https://api.helcim.com/v2/card-transactions

# Test with Authorization header
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Accept: application/json" \
     https://api.helcim.com/v2/card-transactions
```

If these return 404, the issue is with the API endpoint structure or authentication.

## Alternative Endpoints to Try

If `/card-transactions` doesn't work, try:

1. `/payments` - General payments endpoint
2. `/transactions/card` - Alternative structure
3. `/api/card-transactions` - With /api prefix
4. `/helcim-pay/card-transactions` - Helcim Pay specific

## Checking Webhook

Even without polling working, the webhook should still fire:

1. Check server logs for: `📥 Terminal webhook raw`
2. Verify webhook URL in Helcim Dashboard
3. Test webhook with: `curl -X POST YOUR_WEBHOOK_URL -d '{"test":1}'`

## Next Steps

1. **Verify API Token**:
   - Regenerate if needed
   - Ensure it has all permissions

2. **Check with Helcim Support**:
   - Ask for the correct endpoint structure
   - Verify API v2 is still active
   - Get documentation for terminal payments

3. **Try Alternative Flow**:
   - Use Helcim.js for web-based payments
   - Use manual terminal entry (not API driven)

## Debug Mode

To see exactly what's happening:

1. Open browser console (F12)
2. Watch server logs
3. Look for these key messages:
   - `🌐 Making GET request to:` - Shows exact URL being called
   - `❌ Helcim API request failed:` - Shows error details
   - `404 page not found` - Indicates endpoint doesn't exist

## Contact Information

**Helcim Support**:
- Email: support@helcim.com
- Phone: 1-877-643-5246
- Documentation: https://docs.helcim.com

When contacting support, provide:
1. Your API token (first/last 4 characters only)
2. The exact error: "404 page not found"
3. The endpoints being called
4. Device code from your terminal
