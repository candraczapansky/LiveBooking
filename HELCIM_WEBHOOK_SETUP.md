# 🔧 Helcim Webhook & Configuration Setup Guide

## 🚨 **Current Issue**
You're getting payment processing errors because Helcim needs webhook configurations to notify your application about payment status changes.

## 📋 **Required Webhook URLs**

Based on your Replit domain, you need to configure these webhook URLs in your Helcim account:

### **1. Payment Success Webhook**
```
https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/payment-success
```

### **2. Payment Failed Webhook**
```
https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/payment-failed
```

### **3. Customer Created Webhook**
```
https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/customer-created
```

## 🔧 **Setup Steps**

### **Step 1: Configure Webhooks in Helcim**

1. **Go to your Helcim admin panel** (as shown in your screenshot)
2. **Navigate to:** `glo-head-spa.myhelcim.com/admin/helcim-js-configs`
3. **Click on "Webhooks" tab**
4. **Add the following webhook configurations:**

#### **Payment Success Webhook:**
- **Event Type:** `payment.success`
- **URL:** `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/payment-success`
- **Method:** `POST`
- **Active:** `Yes`

#### **Payment Failed Webhook:**
- **Event Type:** `payment.failed`
- **URL:** `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/payment-failed`
- **Method:** `POST`
- **Active:** `Yes`

#### **Customer Created Webhook:**
- **Event Type:** `customer.created`
- **URL:** `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/customer-created`
- **Method:** `POST`
- **Active:** `Yes`

### **Step 2: Test Webhook Endpoints**

Run this command to test if your webhook endpoints are accessible:

```bash
curl -X GET "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/health"
```

### **Step 3: Verify Helcim.js Configuration**

In your Helcim admin panel:

1. **Go to "Helcim.js Configurations"**
2. **Create a new configuration or edit existing one:**
   - **Configuration Name:** `Glo Head Spa Production`
   - **Environment:** `Production`
   - **API Token:** `aLWelMKkFYVQd%h9zDbS%N84EtS@Qj!Vjhn_5VlqkzFaKiH7d3Zb.v@BG3RXEkhb`
   - **Webhook URLs:** (as listed above)

## 🔍 **Troubleshooting**

### **If Webhooks Don't Work:**

1. **Check Replit Domain:**
   - Your current domain: `47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev`
   - Make sure this is accessible from external services

2. **Test Webhook URLs:**
   ```bash
   curl -X POST "https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/payment-success" \
        -H "Content-Type: application/json" \
        -d '{"test": "webhook"}'
   ```

3. **Check Server Logs:**
   - Look for webhook requests in your server logs
   - Verify the webhook endpoints are being called

### **Alternative: Use Local Development**

If webhooks don't work with Replit, you can:

1. **Use ngrok for local development:**
   ```bash
   ngrok http 5000
   ```

2. **Use the ngrok URL for webhooks:**
   ```
   https://your-ngrok-url.ngrok.io/api/helcim/webhook/payment-success
   ```

## ✅ **Expected Results**

After setting up webhooks correctly:

1. **Payment processing should work without errors**
2. **You should see webhook logs in your server console**
3. **Payment status updates should be received automatically**
4. **Customer creation should trigger webhook notifications**

## 🆘 **If Still Having Issues**

1. **Check Helcim API documentation** for the latest webhook requirements
2. **Verify your API token has webhook permissions**
3. **Test with Helcim's webhook testing tools**
4. **Contact Helcim support** if webhook configuration issues persist

## 📞 **Next Steps**

1. Configure the webhooks in your Helcim admin panel
2. Test the webhook endpoints
3. Try processing a test payment
4. Check server logs for webhook activity
5. Verify payment status updates are working 