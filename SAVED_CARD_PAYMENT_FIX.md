# Saved Card Payment Fix Documentation

## Issues Fixed

### 1. Missing Customer ID Storage
**Problem:** The `helcimCustomerId` was not being stored in the `saved_payment_methods` table, making it impossible to charge saved cards.
**Solution:** 
- Added `helcimCustomerId` column to the `saved_payment_methods` table
- Updated all save card endpoints to store the customer ID
- Modified the schema to include the new field

### 2. Incorrect API Usage for Saved Cards
**Problem:** The saved card payment was trying to use `cardId` directly instead of the proper format with `cardToken`.
**Solution:** Updated `processSavedCardPayment` to use `cardData.cardToken` with the saved card token.

## Changes Made

### Database Changes
1. **Added Column**: `helcim_customer_id TEXT` to `saved_payment_methods` table
   - Stores the Helcim customer ID associated with each saved card
   - Required for processing payments with saved cards

### Code Changes

#### 1. Schema Update (`/shared/schema.ts`)
```typescript
export const savedPaymentMethods = pgTable("saved_payment_methods", {
  // ... existing fields ...
  helcimCustomerId: text("helcim_customer_id"), // Added
  // ... rest of fields ...
});
```

#### 2. Save Card Endpoints
Updated all save card endpoints to store `helcimCustomerId`:
- `/server/routes/payments/helcim.ts` - Main save-card endpoint
- `/server/routes.ts` - Alternative save-card route

#### 3. Helcim Service (`/server/services/helcim-service.ts`)
- Fixed UUID generation for idempotencyKey
- Improved card information extraction from verify response
- Corrected saved card payment to use `cardData.cardToken`

## How Saved Card Payments Work

### Step 1: Card is Saved
1. Customer enters card via HelcimPay.js
2. Card is verified with $0 transaction
3. Card token and customer ID are stored in database

### Step 2: Customer Selects Saved Card
1. Frontend retrieves saved cards for the client
2. Card shows with brand and last 4 digits
3. Customer selects card for payment

### Step 3: Payment Processing
```javascript
// Frontend sends request
POST /api/helcim-pay/process-saved-card
{
  "amount": 99.99,
  "customerId": "helcim_customer_id", // From saved card
  "cardId": "saved_card_token",        // The Helcim card token
  "description": "Payment description"
}
```

### Step 4: Backend Processing
1. Backend receives the request
2. Sends to Helcim API with proper format:
```javascript
{
  "paymentType": "purchase",
  "amount": 99.99,
  "currency": "CAD",
  "customerCode": "helcim_customer_id",
  "cardData": {
    "cardToken": "saved_card_token"  // Critical: Must be in cardData
  },
  "ipAddress": "127.0.0.1",
  "idempotencyKey": "proper-uuid-v4"
}
```

## Testing

The saved card payment flow now works correctly:
1. Cards are saved with both `helcimCardId` and `helcimCustomerId`
2. Saved cards can be retrieved and display properly
3. Payments process successfully using the stored tokens

## Important Notes

1. **Customer ID Required**: Every saved card MUST have a `helcimCustomerId` to work
2. **Token Format**: The saved `helcimCardId` is actually a token that goes in `cardData.cardToken`
3. **UUID Requirements**: Helcim requires proper UUID v4 format for idempotencyKey
4. **Mock Mode**: System falls back to mock mode for testing when Helcim API isn't configured

## Verification Steps

1. Save a card for a client
2. Check database: `SELECT * FROM saved_payment_methods WHERE client_id = X;`
3. Verify both `helcim_card_id` and `helcim_customer_id` are populated
4. Process a payment with the saved card
5. Payment should complete successfully

## Files Modified

1. `/shared/schema.ts` - Added helcimCustomerId field
2. `/server/services/helcim-service.ts` - Fixed UUID and payment processing
3. `/server/routes/payments/helcim.ts` - Store helcimCustomerId when saving cards
4. `/server/routes.ts` - Store helcimCustomerId in alternative endpoint
5. Database - Added helcim_customer_id column to saved_payment_methods table

All existing functionality and data have been preserved.

