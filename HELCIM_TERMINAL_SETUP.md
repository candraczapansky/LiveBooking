# Helcim Smart Terminal Setup Guide

This guide will help you set up your Helcim Smart Terminal for use with the appointments system.

## Prerequisites

1. You must have a Helcim account with Smart Terminal API access enabled
2. You must have a physical Helcim Smart Terminal device

## Step 1: Enable API Mode in Helcim Dashboard

1. Log into your Helcim Dashboard
2. Navigate to **Settings > Smart Terminal API**
3. Enable API Mode for your terminal
4. Generate an API Token for your terminal (save this, you'll need it later)

## Step 2: Get Your Device Code

1. After enabling API Mode, log out of your terminal device
2. Log back into the terminal
3. The Device Code will be displayed on the terminal screen
4. Write down this Device Code (it looks something like "HF1N")

## Step 3: Configure Terminal in the Application

1. In the application, navigate to **Settings > Locations**
2. Select the location where you want to configure the terminal
3. In the Terminal Management section, enter:
   - **Terminal ID**: A unique identifier for this terminal (e.g., "terminal-1", "front-desk", etc.)
   - **Device Code**: The code displayed on your terminal (from Step 2)
   - **API Token**: The token from your Helcim Dashboard (from Step 1)
4. Click **Initialize Terminal**
5. Click **Test Connection** to verify the setup

## Step 4: Configure Webhook URL (Optional but Recommended)

For real-time payment updates, configure the webhook URL in your environment:

### Option A: If you have access to environment variables

Set the following environment variable:
```
PUBLIC_BASE_URL=https://yourdomain.com
```
or
```
TERMINAL_WEBHOOK_URL=https://yourdomain.com/api/terminal/webhook
```

### Option B: Configure in Helcim Dashboard

1. Log into your Helcim Dashboard
2. Navigate to Webhooks configuration
3. Add a new webhook endpoint: `https://yourdomain.com/api/terminal/webhook`
4. Select events: Card Transaction Completed, Card Transaction Failed

## Step 5: Test Payment Flow

1. Navigate to the Appointments page
2. Select an appointment to check out
3. Click on the appointment details
4. Click **Checkout**
5. Select **Smart Terminal** as the payment method
6. The payment should be sent to your terminal
7. Complete the payment on the terminal device
8. The appointment should be marked as paid automatically

## Troubleshooting

### Terminal not receiving payments

1. **Check Terminal Configuration**: 
   - Go to Settings > Locations
   - Verify the Device Code and API Token are correct
   - Click "Test Connection" to verify

2. **Check Terminal Status**:
   - Make sure the terminal is powered on
   - Make sure the terminal is connected to the internet
   - Make sure the terminal is logged in with API Mode enabled

3. **Check Console Logs**:
   - Open browser developer tools (F12)
   - Check the Console tab for any error messages
   - Check the Network tab for failed API calls

### Payment not updating in the app

1. **Without Webhook (Polling Mode)**:
   - The app will poll for payment status every 2 seconds
   - Payment should update within 2-10 seconds after completion
   - If it takes longer, check your internet connection

2. **With Webhook (Real-time)**:
   - Make sure the webhook URL is configured correctly
   - Check that your server is publicly accessible
   - Check server logs for webhook receipt confirmation

### Common Error Messages

- **"No terminal configured for location"**: Terminal hasn't been initialized. Follow Step 3.
- **"Failed to start payment"**: Check API Token and Device Code are correct.
- **"Terminal is busy"**: Another transaction is in progress. Wait and try again.
- **"Payment timed out"**: Transaction took too long. Check terminal and try again.

## Security Notes

- API Tokens are encrypted before storage in the database
- Never share your API Token publicly
- Rotate API Tokens regularly for security
- Monitor transaction logs in your Helcim Dashboard

## Support

For Helcim-specific issues:
- Contact Helcim Support: support@helcim.com
- Helcim Documentation: https://docs.helcim.com

For application-specific issues:
- Check the browser console for detailed error messages
- Review server logs for API errors
- Ensure all configuration steps have been completed
