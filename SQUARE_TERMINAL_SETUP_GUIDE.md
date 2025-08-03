# Square Terminal Integration Setup Guide

## 🎯 Overview

This guide will help you connect your Square Terminal hardware to your salon management app for in-person payments. When customers check out in person, payment information will be sent directly to your Square Terminal for processing.

## 📋 Prerequisites

1. **Square Terminal Hardware**: You need a Square Terminal device (not Square Reader)
2. **Square Developer Account**: Access to Square Developer Dashboard
3. **Square Application**: Your app must be registered with Square
4. **Square Access Token**: Production access token with terminal permissions

## 🔧 Setup Steps

### Step 1: Configure Square Developer Account

1. **Log into Square Developer Dashboard**
   - Go to [Square Developer Dashboard](https://developer.squareup.com/)
   - Navigate to your application

2. **Enable Terminal API**
   - Go to "APIs" section
   - Enable "Terminal API" for your application
   - Note: Terminal API requires special approval from Square

3. **Get Production Access Token**
   - Go to "Credentials" section
   - Copy your production access token
   - Ensure it has terminal permissions

### Step 2: Configure Environment Variables

Add these environment variables to your `.env` file:

```bash
# Square Configuration
SQUARE_ACCESS_TOKEN=your_production_access_token_here
SQUARE_APPLICATION_ID=your_application_id_here
SQUARE_LOCATION_ID=your_location_id_here
SQUARE_ENVIRONMENT=production
```

### Step 3: Connect Square Terminal

1. **Power on your Square Terminal**
2. **Connect to WiFi** or use cellular connection
3. **Sign in to your Square account** on the terminal
4. **Ensure terminal is online** and ready to accept payments

### Step 4: Test the Integration

1. **Start your application**
2. **Go to POS page** in your app
3. **Select "Square Terminal"** as payment method
4. **Test a small payment** to verify connection

## 🚀 How It Works

### Payment Flow

1. **Customer selects items** in your POS system
2. **Staff selects "Square Terminal"** as payment method
3. **App sends payment request** to Square Terminal API
4. **Terminal displays payment** for customer to complete
5. **Customer swipes/taps card** on terminal
6. **Payment is processed** and recorded in your system
7. **Receipt is printed** from terminal

### API Endpoints

Your app now includes these new endpoints:

- `POST /api/square-terminal/payment` - Process payment through terminal
- `GET /api/square-terminal/status` - Check terminal connection status
- `POST /api/square-terminal/checkout` - Create checkout session

## 📱 Using the Integration

### In Your POS System

1. **Add items to cart** as usual
2. **Select "Square Terminal"** from payment methods
3. **Click "Process Payment"** to send to terminal
4. **Customer completes payment** on terminal
5. **Payment is automatically recorded** in your system

### Features Available

- ✅ **Real-time terminal status** checking
- ✅ **Automatic payment recording** in your database
- ✅ **Sales history tracking** for terminal payments
- ✅ **Error handling** for declined payments
- ✅ **Tip handling** support
- ✅ **Receipt generation** through terminal

## 🔍 Troubleshooting

### Common Issues

1. **Terminal Not Connected**
   - Check WiFi/cellular connection
   - Ensure terminal is signed in to Square account
   - Verify terminal is online

2. **Payment Declined**
   - Check card details
   - Verify sufficient funds
   - Try different payment method

3. **API Errors**
   - Verify access token is correct
   - Check location ID is valid
   - Ensure Terminal API is enabled

### Debug Information

Check your server logs for:
- Terminal status checks
- Payment request details
- API response data
- Error messages

## 📊 Monitoring

### Terminal Status
- Connection status is displayed in the UI
- Real-time status updates
- Error messages for troubleshooting

### Payment Tracking
- All terminal payments are recorded in your database
- Payment method shows as "terminal"
- Sales reports include terminal transactions

## 🔐 Security

### Best Practices
- Keep your access token secure
- Use HTTPS for all API calls
- Monitor for suspicious activity
- Regularly update your Square SDK

### PCI Compliance
- Square Terminal handles PCI compliance
- No card data stored in your system
- Secure tokenization process

## 📞 Support

### Square Support
- [Square Terminal Documentation](https://developer.squareup.com/docs/terminal-api)
- [Square Developer Support](https://developer.squareup.com/support)

### Your App Support
- Check server logs for detailed error messages
- Verify environment variables are set correctly
- Test with small amounts first

## 🎉 Success!

Once configured, your customers can:
- Pay with any card (credit, debit, contactless)
- Add tips easily
- Get printed receipts
- Complete payments securely

Your staff can:
- Process payments quickly
- Track all terminal transactions
- Generate sales reports
- Manage inventory seamlessly

The integration provides a seamless experience for both your staff and customers while maintaining security and compliance standards. 