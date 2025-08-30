# 💡 Helcim Tip Tracking Solutions

## The Problem
Helcim's API `/v2/card-transactions/{id}` endpoint doesn't return tip as a separate field. It only returns the total `amount` that includes the tip.

## Solution Options:

### Option 1: Track Original Amount in Your App (Recommended)
When starting a payment, store the original amount before tip:

```javascript
// When starting payment:
const baseAmount = 1.00;
terminalService.startPayment(locationId, baseAmount, {
  invoiceNumber: 'POS-123',
  baseAmount: baseAmount  // Store this
});

// When payment completes:
const totalAmount = 1.15;  // From Helcim
const tipAmount = totalAmount - baseAmount;  // Calculate: 0.15
```

### Option 2: Use Helcim Reporting API
Check if Helcim has a different endpoint for detailed transaction reports that includes tip breakdown.

### Option 3: Parse from Terminal Response
Some terminals send tip information in the terminal response or receipt data. Check if the Smart Terminal provides this.

### Option 4: Configure Terminal Tip Reporting
Check Helcim terminal settings to see if there's an option to include tip details in the webhook or API response.

## Immediate Workaround

Modify the payment flow to track the base amount:

1. Store the base amount when initiating payment
2. When webhook arrives with total, calculate: tip = total - base
3. Store both values in your database

