# 🔧 **Gift Card Payment Debugging Guide**

## 🚨 **Issue Summary**

**Problem**: When users purchase gift cards, the application shows a success message but no actual charge is made to the customer's bank account.

**Root Cause**: The gift certificate purchase process was not verifying that the payment processor (Helcim) actually processed the payment successfully before creating the gift card.

## 🔍 **Debugging Steps Implemented**

### **Step 1: Enhanced Payment Processor Logging**

**Files Modified:**
- `server/helcim-service.ts` - Added detailed logging for payment processing
- `server/routes.ts` - Added payment status verification

**Changes Made:**

#### **1. Helcim Service Enhanced Logging**
```typescript
// Added detailed logging in processPayment method
console.log('Helcim processPayment called with data:', JSON.stringify(paymentData, null, 2));
console.log('Making Helcim API request with data:', JSON.stringify(requestData, null, 2));
console.log('Helcim API raw response:', JSON.stringify(response, null, 2));
console.log('Helcim processPayment returning:', JSON.stringify(result, null, 2));
```

#### **2. Payment Status Verification**
```typescript
// Added payment status verification in /api/create-payment
if (helcimResponse.status && helcimResponse.status !== 'completed' && helcimResponse.status !== 'COMPLETED') {
  console.error('Helcim payment status indicates failure:', helcimResponse.status);
  throw new Error(`Payment failed with status: ${helcimResponse.status}`);
}
```

### **Step 2: Payment Verification in Gift Certificate Purchase**

**Files Modified:**
- `server/routes.ts` - Added payment verification to gift certificate purchase
- `client/src/pages/gift-certificates.tsx` - Updated to pass payment ID

**Changes Made:**

#### **1. Backend Payment Verification**
```typescript
// Added payment verification in /api/gift-certificates/purchase
const { amount, recipientName, recipientEmail, purchaserName, purchaserEmail, message, paymentId } = req.body;

// STEP 1: Verify payment was successful
if (!paymentId) {
  console.error('Gift certificate purchase attempted without payment ID');
  return res.status(400).json({ 
    error: "Payment verification required. Please complete payment first." 
  });
}

// Check if payment exists and was successful
const payment = await storage.getPayment(paymentId);
if (!payment) {
  console.error('Payment not found for gift certificate purchase:', paymentId);
  return res.status(400).json({ 
    error: "Payment not found. Please complete payment first." 
  });
}

if (payment.status !== 'completed') {
  console.error('Payment not completed for gift certificate purchase:', paymentId, payment.status);
  return res.status(400).json({ 
    error: `Payment not completed. Status: ${payment.status}` 
  });
}
```

#### **2. Frontend Payment ID Passing**
```typescript
// Updated PaymentForm to pass payment ID
const handlePaymentSuccess = async (paymentId: string) => {
  if (!giftCertificateData) return;

  setIsProcessing(true);
  try {
    // Pass the payment ID to verify the payment was successful
    await purchaseGiftCertificateMutation.mutateAsync({
      ...giftCertificateData,
      paymentId: paymentId
    });
  } finally {
    setIsProcessing(false);
  }
};
```

### **Step 3: Test Script for Debugging**

**File Created:**
- `test-gift-card-payment-debug.js` - Comprehensive test script

**Features:**
- Tests complete payment workflow
- Verifies payment processor responses
- Tests payment verification logic
- Validates gift card creation

## 🔧 **How to Debug the Issue**

### **1. Check Backend Logs**

Run the application and monitor the console logs for:

```bash
# Start the server and watch for these log messages:
npm start

# Look for these key log messages:
- "Helcim processPayment called with data:"
- "Making Helcim API request with data:"
- "Helcim API raw response:"
- "Helcim payment verified as successful:"
- "Payment verified for gift certificate purchase:"
- "Gift certificate created successfully:"
```

### **2. Run the Test Script**

```bash
# Install axios if not already installed
npm install axios

# Run the debug test script
node test-gift-card-payment-debug.js
```

### **3. Check Payment Processor Dashboard**

1. Log into your Helcim dashboard
2. Go to the "Payments" or "Transactions" section
3. Look for the gift card purchase attempts
4. Check the status of each transaction
5. Look for any error messages or decline reasons

### **4. Monitor Database Records**

Check the database for payment records:

```sql
-- Check payment records
SELECT * FROM payments WHERE type = 'gift_certificate_payment' ORDER BY created_at DESC LIMIT 10;

-- Check gift card records
SELECT * FROM gift_cards ORDER BY created_at DESC LIMIT 10;

-- Check gift card transactions
SELECT * FROM gift_card_transactions ORDER BY created_at DESC LIMIT 10;
```

## 🚨 **Common Issues and Solutions**

### **Issue 1: Payment Processor Returns Success but No Charge**

**Symptoms:**
- Backend logs show successful payment
- Gift card is created
- No charge appears on customer's bank account

**Debugging Steps:**
1. Check Helcim API response logs
2. Verify payment status in Helcim dashboard
3. Check if payment is in "pending" or "authorized" status
4. Look for any error messages in the response

**Solution:**
- Ensure payment status is "completed" or "COMPLETED"
- Add additional status checks for pending payments
- Implement webhook handling for payment status updates

### **Issue 2: Gift Card Created Without Payment**

**Symptoms:**
- Gift card appears in database
- No corresponding payment record
- Customer charged but no gift card

**Debugging Steps:**
1. Check if payment verification is working
2. Verify payment ID is being passed correctly
3. Check database constraints and relationships

**Solution:**
- Ensure payment verification is enforced
- Add database constraints
- Implement transaction rollback on payment failure

### **Issue 3: Payment Processor API Errors**

**Symptoms:**
- Backend errors in logs
- Payment processing fails
- Customer sees error messages

**Debugging Steps:**
1. Check Helcim API credentials
2. Verify API endpoint configuration
3. Check network connectivity
4. Review API rate limits

**Solution:**
- Verify API token is valid
- Check API endpoint URLs
- Implement retry logic for transient failures

## 📊 **Monitoring and Alerts**

### **Key Metrics to Monitor:**

1. **Payment Success Rate**
   - Track successful vs failed payments
   - Monitor payment processor response times

2. **Gift Card Creation Rate**
   - Track gift cards created per payment
   - Monitor orphaned gift cards (created without payment)

3. **Error Rates**
   - Track payment processor errors
   - Monitor database constraint violations

### **Alert Conditions:**

- Payment success rate drops below 95%
- Gift card creation without payment
- Payment processor API errors
- Database constraint violations

## 🔧 **Next Steps**

1. **Deploy the fixes** to your production environment
2. **Monitor the logs** for the next few gift card purchases
3. **Run the test script** to verify the fixes work
4. **Check the Helcim dashboard** for actual payment records
5. **Verify with customers** that charges are appearing on their statements

## 📞 **Support Contacts**

- **Helcim Support**: For payment processor issues
- **Database Administrator**: For database-related issues
- **Development Team**: For application logic issues

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Status**: ✅ Implemented and Ready for Testing 