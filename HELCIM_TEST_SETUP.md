# Helcim Test Mode Setup Guide

## Current Issue
You're using a **LIVE Helcim API token** but trying to use **test card numbers**. This won't work!

## Solution Options

### Option 1: Use Real Cards (Quickest)
Since you have a live API token configured, simply use a **real credit card**:
- The card save will do a $0.01 verification (immediately reversed)
- This will create a valid saved card that works for payments
- Safe for testing as it's just a verification, not a real charge

### Option 2: Switch to Test Mode
To use test cards like `5454545454545454`, you need to:

1. **Get your TEST API token from Helcim:**
   - Log into your Helcim dashboard
   - Go to Settings → API Access
   - Switch to "Test Environment" 
   - Copy your test API token

2. **Update your .env file:**
   ```bash
   # Comment out your live token
   # HELCIM_API_TOKEN=adClJoT.d*$JlSAZi6u-sMSuUPX%aojxchf6_S-wen.x._u5isgwIGjP0oDL*r@k
   
   # Use your test token
   HELCIM_API_TOKEN=YOUR_TEST_API_TOKEN_HERE
   ```

3. **Restart the server**

4. **Now you can use test cards:**
   - Mastercard: `5454545454545454`
   - Visa: `4000100511112226`
   - Amex: `374245455400126`

## Important Notes

- **Live tokens** (like yours starting with `adClJoT`) only work with **real cards**
- **Test tokens** only work with **test cards**
- Never mix them - it will always fail!

## Current Status
- ✅ Test mode disabled in code (fixed)
- ✅ Customer codes using correct format (fixed)
- ✅ UUID format for idempotency keys (fixed)
- ❌ Using live API token with test cards (current issue)
