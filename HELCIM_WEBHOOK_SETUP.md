# 🔧 Helcim Webhook Configuration Guide

## Overview

This guide will help you configure Helcim to send webhooks to your new clean payment processing system.

## 📋 **Step 1: Get Your Webhook URLs**

Your webhook endpoints are now available at:

- **Primary Webhook**: `https://yourdomain.com/webhooks/helcim`
- **Legacy Webhook**: `https://yourdomain.com/webhook/helcim` (for backward compatibility)
- **Test Webhook**: `https://yourdomain.com/webhooks/helcim/test` (no signature required, for testing)

## 🌐 **Step 2: Configure Helcim Dashboard**

### 2.1 Log into Helcim Dashboard
1. Go to [Helcim Dashboard](https://dashboard.helcim.com)
2. Navigate to **Settings** → **Webhooks** or **API Configuration**

### 2.2 Add New Webhook
1. Click **"Add Webhook"** or **"Create Webhook"**
2. Set the following configuration:

```
Webhook URL: https://yourdomain.com/webhooks/helcim
Method: POST
Events: 
  - cardTransaction.completed
  - cardTransaction.declined
  - cardTransaction.failed
  - terminal.payment.completed
  - terminal.payment.declined
```

### 2.3 Webhook Headers
Add these custom headers:
```
Content-Type: application/json
webhook-signature: [Helcim will generate this automatically]
```

### 2.4 Webhook Secret
- **Generate a strong secret** (32+ characters, mix of letters, numbers, symbols)
- **Save this secret** - you'll need it for the `HELICM_WEBHOOK_SECRET` environment variable
- **Never share this secret** publicly

## 🔑 **Step 3: Set Environment Variables**

### 3.1 Edit payment.env File
```bash
# Edit the payment.env file with your actual values
nano payment.env
```

Update these lines:
```bash
HELICM_API_TOKEN=your_actual_helcim_api_token_here
HELICM_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3.2 Load Environment Variables
```bash
# Load the environment variables
source payment.env

# Verify they're set
echo $HELICM_API_TOKEN
echo $HELICM_WEBHOOK_SECRET
```

### 3.3 Alternative: Set System Environment Variables
```bash
export HELICM_API_TOKEN="your_actual_token"
export HELICM_WEBHOOK_SECRET="your_webhook_secret"
```

## 🧪 **Step 4: Test the Configuration**

### 4.1 Test Webhook Health Check
```bash
curl -X GET https://yourdomain.com/webhooks/helcim
```

Expected response:
```json
{
  "status": "active",
  "endpoint": "/webhooks/helcim",
  "legacy_endpoint": "/webhook/helcim",
  "message": "Helcim webhook endpoint is ready"
}
```

### 4.2 Test Webhook (No Signature Required)
```bash
curl -X POST https://yourdomain.com/webhooks/helcim/test \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "TEST123", "status": "APPROVED"}'
```

Expected response:
```json
{
  "status": "test_received",
  "transaction_id": "TEST123",
  "status": "APPROVED"
}
```

### 4.3 Test Real Webhook (Requires Signature)
```bash
# This will fail without proper signature, which is expected
curl -X POST https://yourdomain.com/webhooks/helcim \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "REAL123", "status": "APPROVED"}'
```

Expected response (without signature):
```json
{
  "detail": "Webhook signature header missing"
}
```

## 🔍 **Step 5: Monitor Webhook Activity**

### 5.1 Check Server Logs
When webhooks are received, you'll see detailed logs:
```
INFO:payments:Received Helcim webhook.
INFO:payments:Webhook headers: {...}
INFO:payments:Webhook body: {...}
INFO:payments:Signature header: abc123...
INFO:payments:Expected signature: xyz789...
INFO:payments:Webhook signature verified successfully.
INFO:payments:Event data: {...}
INFO:payments:Transaction TEST123 status updated to COMPLETED.
```

### 5.2 Webhook Status in Helcim Dashboard
- Check **Webhook History** or **Delivery Status**
- Look for successful deliveries (200 status codes)
- Check for any failed deliveries and error messages

## 🚨 **Troubleshooting**

### Common Issues:

#### 1. **"Webhook secret not configured"**
- Make sure `HELICM_WEBHOOK_SECRET` is set in your environment
- Restart the server after setting environment variables

#### 2. **"Invalid signature"**
- Verify the webhook secret in Helcim matches your `HELICM_WEBHOOK_SECRET`
- Check that Helcim is sending the `webhook-signature` header

#### 3. **"Webhook signature header missing"**
- Ensure Helcim is configured to send the signature header
- Check webhook configuration in Helcim dashboard

#### 4. **Webhook not reaching your server**
- Verify the webhook URL is correct
- Check your server is accessible from the internet
- Ensure firewall/security groups allow incoming webhooks

### Debug Steps:
1. **Check server logs** for webhook receipt
2. **Verify environment variables** are loaded
3. **Test webhook endpoints** manually
4. **Check Helcim webhook configuration**
5. **Verify network connectivity**

## ✅ **Success Indicators**

When everything is working correctly, you should see:

1. **Server startup** shows both tokens as configured
2. **Health check endpoints** return 200 OK
3. **Test webhook** processes successfully
4. **Real webhooks** from Helcim are received and processed
5. **Server logs** show successful webhook processing
6. **Database** shows transaction status updates

## 🔄 **Next Steps**

After webhooks are working:

1. **Test complete payment flow** from frontend
2. **Monitor webhook reliability** in production
3. **Set up webhook retry logic** if needed
4. **Implement webhook monitoring** and alerting
5. **Add webhook analytics** and reporting

## 📞 **Support**

If you continue to have issues:

1. **Check server logs** for detailed error messages
2. **Verify Helcim configuration** matches this guide
3. **Test webhook endpoints** manually
4. **Check network connectivity** and firewall settings
5. **Contact Helcim support** if webhook configuration issues persist
