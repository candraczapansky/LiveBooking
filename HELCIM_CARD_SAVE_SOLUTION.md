# Helcim Card Save Implementation Issue

## Current Problem
The Helcim Pay.js v2 implementation uses `appendHelcimPayIframe()` which opens a full-screen overlay/modal, not embedded fields. This is why you can't type into fields - there are no fields in our modal, just a button to open Helcim's modal.

## How It Currently Works
1. User clicks "Save Card" in booking flow
2. Our modal opens with a button "Open Secure Payment"
3. Clicking that button calls `appendHelcimPayIframe(token)`
4. This should open Helcim's own payment modal as an overlay
5. User enters card details in Helcim's modal
6. Card gets saved without charge (using verify mode with $0)

## Why Fields Aren't Working
- The `appendHelcimPayIframe` function doesn't create embedded fields
- It creates a separate full-screen modal overlay
- If this modal isn't appearing or is closing immediately, it could be due to:
  - Pop-up blockers
  - Z-index issues
  - Script conflicts
  - Browser security policies

## Solutions

### Option 1: Fix the Iframe Modal (Current Approach)
The Helcim iframe should be opening when you click "Open Secure Payment". If it's not:
1. Check browser console for errors
2. Disable pop-up blockers
3. Ensure the token is valid
4. Check if the iframe is being added to DOM but hidden

### Option 2: Use Helcim.js Legacy (Embedded Fields)
The older Helcim.js (not Pay.js v2) supports embedded fields:
```javascript
// Load https://secure.helcim.app/js/helcim.js instead
// Use helcim.initialize() and helcim.mount() for embedded fields
```

### Option 3: Direct API Integration
Skip the JavaScript SDK and use Helcim's Card Vault API directly:
1. Create a simple form to collect card details
2. Use Helcim's tokenization API endpoint
3. Save the token without charging

## Recommended Next Steps

Since you need to save cards without the full checkout flow, and the iframe isn't working properly, I recommend:

1. **Test the iframe first**: When you click "Open Secure Payment", check:
   - Browser console for errors
   - Network tab for failed requests
   - DOM inspector to see if an iframe was added

2. **If iframe doesn't work**: We can switch to a different approach:
   - Use a simple form to collect card details
   - Tokenize via Helcim API
   - Save the token for future use

The current implementation is correct for Helcim Pay.js v2, but the iframe modal approach may not be ideal for your use case. The $0 verification is working correctly now - we just need to get the card input working.
