# Payment Failure Detection Fix

## Problem
The app was incorrectly registering all payments as successful, even when they failed. This was because:
1. The webhook handler was assuming all `cardTransaction` webhooks were for successful payments
2. Failed payment status was not being propagated to appointments
3. There was no way to retry failed payments

## Solution Implemented

### 1. Enhanced Webhook Handling (server/routes/helcim-webhooks.ts)
- **Before**: Assumed all webhooks with type `cardTransaction` were successful
- **After**: Now checks the `approved` field and other status indicators to determine if payment failed
- Detects failure indicators like:
  - `approved: false`
  - `status: 'declined'`
  - `result: 'error'`
  - Response messages containing 'decline', 'fail', or 'error'

### 2. Improved Payment Status Detection (server/services/helcim-terminal-service.ts)
- **Before**: Would mark payments as completed without checking actual status
- **After**: Checks failure indicators FIRST before assuming success
- Properly normalizes payment status to 'failed' when declined

### 3. Updated Payment Complete Endpoint (server/routes/terminal-routes.ts)
- **Before**: Always assumed payment was successful
- **After**: 
  - Checks webhook cache for actual payment status
  - Updates appointment with correct status (paid/failed)
  - Only creates staff earnings if payment succeeded
  - Only triggers automations if payment succeeded

### 4. Added Retry Payment Functionality (client)
- **Updated appointment-form.tsx**:
  - Shows "Payment Failed" status with red indicator
  - Displays "Retry Payment" button for failed payments
  - Updates appointment status to 'failed' when payment fails
  - Refreshes appointment data after payment attempt

### 5. Webhook Marker Fix [[memory:7692183]]
- **Before**: Used global webhook marker that could cause false positive completions
- **After**: Only returns completed status if webhook is specifically for the payment ID being checked

## Key Changes by File

### Server-side:
1. **server/routes/helcim-webhooks.ts**
   - Pass full webhook payload to handler
   - Check `approved` field to determine success/failure
   - Store correct status in webhook cache

2. **server/services/helcim-terminal-service.ts**
   - Check failure indicators before success indicators
   - Handle declined/failed/error statuses properly
   - Log payment status clearly

3. **server/routes/terminal-routes.ts**
   - Accept `paymentStatus` parameter in complete-payment endpoint
   - Check webhook cache for actual status
   - Update appointments with correct payment status
   - Only process successful payment actions when appropriate

### Client-side:
1. **client/src/components/appointments/appointment-form.tsx**
   - Display failed payment status with red indicator
   - Show "Retry Payment" button for failed payments
   - Update appointment status on payment failure
   - Refresh data after payment attempts

2. **client/src/components/payment/checkout-with-terminal.tsx**
   - Support custom button text via children prop
   - Allow retry button to show different text

## Testing

Use the provided test script to verify the fix:
```bash
chmod +x test-payment-webhook.sh
./test-payment-webhook.sh
```

This will test:
1. Successful payment webhook
2. Failed payment webhook (declined)
3. Failed payment webhook (error)
4. Status checking for both successful and failed payments

## Expected Behavior

### When Payment Succeeds:
1. Webhook received with `approved: true`
2. Payment status set to 'completed'
3. Appointment marked as 'paid'
4. Staff earnings created
5. Automations triggered
6. Green "Paid" indicator shown in UI

### When Payment Fails:
1. Webhook received with `approved: false` or failure indicator
2. Payment status set to 'failed'
3. Appointment marked as 'failed'
4. No staff earnings created
5. No automations triggered
6. Red "Payment Failed" indicator shown in UI
7. "Retry Payment" button available for staff to try again

## Important Notes

- All existing data (usernames, passwords, client profiles, staff profiles, schedules, reports, appointments) remain unchanged
- The fix only affects payment processing and webhook handling
- Backward compatibility maintained - if no status is available, defaults to completed
- The system now properly distinguishes between successful and failed payments
- Staff can now retry failed payments without having to create a new appointment
