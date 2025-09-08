import { Router } from 'express';
import type { Request, Response } from 'express';

export default function createHelcimPaymentsRouter(storage?: any) {
  const router = Router();

  // Initialize Helcim Pay.js session (real Helcim initialization)
  router.post('/initialize', async (req, res) => {
  try {
    const { amount, description } = req.body || {};
    // Allow amount to be 0 for card verification
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const apiToken = process.env.HELCIM_API_TOKEN;
    const apiUrlV2 = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
    if (!apiToken) {
      return res.status(500).json({ success: false, message: 'Helcim API token not configured' });
    }

    // Determine if this is for card saving (verify) or actual payment (purchase)
    const isCardSaveOnly = 
      Number(amount) === 0 || 
      (description && description.toLowerCase().includes('save card'));

    const payload = {
      amount: isCardSaveOnly ? 0 : Number(amount),
      currency: 'USD',
      paymentType: isCardSaveOnly ? 'verify' : 'purchase',  // Use 'verify' for $0 auth
      test: false,  // Use real mode to create actual customers and cards
      description: description || 'Payment',
      idempotencyKey: `hpjs_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    } as any;

    console.log('[Helcim] Initializing with FULL payload:', JSON.stringify(payload, null, 2));
    console.log('[Helcim] Test mode is:', payload.test);
    console.log('[Helcim] Environment:', process.env.NODE_ENV);

    // Try V2 first (api-token header)
    const tryV2 = async () => {
      const r = await fetch(`${apiUrlV2}/helcim-pay/initialize`, {
        method: 'POST',
        headers: {
          'api-token': apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, data: j };
    };

    // Fallback to V1 (Bearer token) if V2 fails
    const tryV1 = async () => {
      const r = await fetch(`https://api.helcim.com/v1/helcim-pay/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, data: j };
    };

    let result = await tryV2();
    if (!result.ok || !result.data?.checkoutToken) {
      console.warn('Helcim V2 init failed, trying V1…', { status: result.status, data: result.data });
      const v1 = await tryV1();
      if (!v1.ok || !v1.data?.checkoutToken) {
        console.error('Helcim V1 init failed', { status: v1.status, data: v1.data });
        return res.status(502).json({
          success: false,
          message: v1.data?.message || v1.data?.error || 'Helcim initialization failed',
          details: v1.data,
        });
      }
      result = v1;
    }

    console.log('[Helcim] Initialization response:', JSON.stringify(result.data, null, 2));
    console.log('[Helcim] Is this test mode?:', result.data.test || result.data.testMode || 'Not specified in response');
    
    res.json({ 
      success: true, 
      token: result.data.checkoutToken,
      secretToken: result.data.secretToken,  // Include the secretToken as per Helcim docs
      // Include any other fields that might be needed
      data: result.data
    });
  } catch (error: any) {
    console.error('Helcim initialize exception:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize Helcim Pay session',
    });
  }
  });

  // Process Helcim payment
  router.post('/process', async (req, res) => {
  try {
    const { token, amount, description, customerEmail, customerName } = req.body;

    if (!token || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment information'
      });
    }
    // Load helcim service lazily so missing env doesn't prevent router from loading
    const mod = await import('../../services/helcim-service.js');
    const service = (mod as any)?.helcimService || (mod as any)?.default || mod;
    const payment = await service.processPayment({
      token,
      amount,
      description,
      customerEmail,
      customerName,
    });

    res.json({
      success: true,
      payment
    });
  } catch (error: any) {
    console.error('Helcim payment processing error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment processing failed'
    });
  }
  });

  // Verify Helcim payment
  router.post('/verify', async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }
    const mod = await import('../../services/helcim-service.js');
    const service = (mod as any)?.helcimService || (mod as any)?.default || mod;
    const payment = await service.verifyPayment(transactionId);

    res.json({
      success: true,
      payment
    });
  } catch (error: any) {
    console.error('Helcim payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
  });

  // Create Helcim customer for a client (if not already created) and persist helcimCustomerId
  router.post('/create-customer', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone } = req.body || {};
    const mod = await import('../../services/helcim-service.js');
    const service = (mod as any)?.helcimService || (mod as any)?.default || mod;
    const created = await service.createCustomer({
      firstName,
      lastName,
      email,
      phone,
    });
    // IMPORTANT: We need the customerCode (CST format), not the numeric ID!
    const helcimCustomerId = created?.customerCode || created?.customer?.customerCode;
    if (!helcimCustomerId) {
      return res.status(502).json({ success: false, message: 'Failed to create Helcim customer - no customer code', details: created });
    }
    console.log('[Helcim Booking] Using customer code:', helcimCustomerId);
    res.json({ success: true, customerId: String(helcimCustomerId) });
  } catch (error: any) {
    console.error('Helcim create-customer error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Failed to create Helcim customer' });
  }
  });

  // Test endpoint to check Helcim service
  router.get('/test', async (req: Request, res: Response) => {
  try {
    console.log('[Helcim Test] Testing Helcim service...');
    const mod = await import('../../services/helcim-service.js');
    const service = (mod as any)?.helcimService || (mod as any)?.default || mod;
    
    if (!service) {
      return res.status(500).json({ success: false, message: 'Helcim service not available' });
    }
    
    // Try a simple API call to test connectivity
    const testResult = await service.makeRequest('/customers', 'GET');
    console.log('[Helcim Test] Test successful:', testResult);
    
    res.json({ success: true, message: 'Helcim service is working', data: testResult });
  } catch (error: any) {
    console.error('[Helcim Test] Test failed:', error);
    res.status(500).json({ success: false, message: 'Helcim service test failed', error: error?.message || 'Unknown error' });
  }
  });

  // Save card on file via HelcimPay.js token; save card info to appointment
  router.post('/save-card', async (req: Request, res: Response) => {
  try {
    const { 
      token, appointmentId, clientId, customerEmail, customerName, 
      cardLast4, cardBrand, cardExpMonth, cardExpYear, transactionId 
    } = req.body || {};
    
    console.log('[Helcim Save Card] Request body:', { 
      token: token ? token.substring(0, 10) + '...' : 'none',
      appointmentId,
      clientId,
      customerEmail,
      customerName,
      cardLast4,
      cardBrand,
      cardExpMonth,
      cardExpYear,
      transactionId
    });
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'token is required' });
    }

    // Check if Helcim API is configured
    const apiToken = process.env.HELCIM_API_TOKEN;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Disable automatic mock fallback. Only allow explicit mockMode flag.
    const useMockMode = req.body?.mockMode === true;
    
    if (!isDevelopment && (!apiToken || apiToken === '')) {
      return res.status(500).json({ success: false, message: 'Helcim API not configured. Please configure HELCIM_API_TOKEN in your environment.' });
    }

    // For appointment-based card saving, we don't need to create a Helcim customer
    // Just save the card details to the appointment for this transaction
    if (appointmentId) {
      // Extract card details from the token response
      // In production, you would get these from Helcim's tokenization response
      const cardInfo = {
        cardToken: token,
        cardBrand: req.body.cardBrand || 'Card',
        cardLast4: req.body.cardLast4 || '****',
        cardExpMonth: req.body.cardExpMonth || 0,
        cardExpYear: req.body.cardExpYear || 0
      };
      
      // Save card info to the appointment
      if (storage && storage.updateAppointment) {
        try {
          await storage.updateAppointment(appointmentId, {
            paymentCardToken: token, // Persist Pay.js cardToken for later purchases
            paymentCardBrand: cardInfo.cardBrand,
            paymentCardLast4: cardInfo.cardLast4,
            paymentCardExpMonth: cardInfo.cardExpMonth,
            paymentCardExpYear: cardInfo.cardExpYear
          });
          console.log(`✅ Card info saved to appointment ${appointmentId}`);
        } catch (dbError: any) {
          console.error('❌ Error saving card to appointment:', dbError);
          return res.status(500).json({ success: false, message: 'Failed to save card to appointment', error: dbError?.message });
        }
      }
      
      return res.status(201).json({
        success: true,
        message: 'Card saved to appointment',
        appointmentId,
        cardBrand: cardInfo.cardBrand,
        cardLast4: cardInfo.cardLast4
      });
    }
    
    // If saving to client profile (for future use)
    // Support both customerId (legacy) and clientId (from booking widget)
    let helcimCustomerId: string | null = req.body.customerId || null;
    
    // Handle mock mode for development
    if (useMockMode) {
      return res.status(400).json({ success: false, message: 'Mock mode is disabled. Remove mockMode flag to save a real card.' });
    }
    
    // If we have a clientId but no helcimCustomerId, we need to create a Helcim customer
    if (!helcimCustomerId && (clientId || customerEmail)) {
      console.log('[Helcim Save Card] Creating new Helcim customer for:', { clientId, customerEmail, customerName });
      
      // Attempt to create a customer with provided info
      const firstName = (customerName || '').split(' ')[0] || undefined;
      const lastName = (customerName || '').split(' ').slice(1).join(' ') || undefined;
      
      const mod = await import('../../services/helcim-service.js');
      const service = (mod as any)?.helcimService || (mod as any)?.default || mod;
      
      if (!service) {
        console.error('[Helcim Save Card] Failed to import Helcim service for customer creation');
        return res.status(500).json({ success: false, message: 'Helcim service not available' });
      }
      
      let created;
      try {
        created = await service.createCustomer({
          firstName,
          lastName,
          email: customerEmail,
        });
        console.log('[Helcim Save Card] Customer created successfully:', created);
      } catch (error: any) {
        console.error('[Helcim Save Card] Error creating customer (no mock fallback):', error);
        return res.status(502).json({ success: false, message: 'Failed to create Helcim customer', error: error?.message || 'Unknown error' });
      }
      
      // IMPORTANT: We need the customerCode (CST format), not the numeric ID!
      helcimCustomerId = String(created?.customerCode || created?.customer?.customerCode || '');
      if (!helcimCustomerId) {
        console.error('[Helcim Save Card] No customer code returned from Helcim:', created);
        return res.status(502).json({ success: false, message: 'Failed to create Helcim customer - no customer code returned', details: created });
      }
      console.log('[Helcim Save Card] Using customer code:', helcimCustomerId);
    }
    
    if (!helcimCustomerId) {
      return res.status(400).json({ success: false, message: 'Unable to determine customer for card save' });
    }

    // If Pay.js reported a success with a transactionId, we can persist the cardToken immediately
    if (transactionId && clientId) {
      try {
        if (storage) {
          // Avoid duplicates: check for existing card by helcimCardId
          try {
            const existing = await storage.getSavedPaymentMethodsByClient(Number(clientId));
            const dup = (existing || []).find((m: any) => String(m.helcimCardId) === String(token));
            if (dup) {
              return res.status(200).json({
                success: true,
                helcimCustomerId: String(dup.helcimCustomerId || helcimCustomerId),
                helcimCardId: String(dup.helcimCardId),
                cardBrand: dup.cardBrand,
                cardLast4: dup.cardLast4,
                cardExpMonth: dup.cardExpMonth,
                cardExpYear: dup.cardExpYear,
                note: 'Card already on file'
              });
            }
          } catch {}
          await storage.createSavedPaymentMethod({
            clientId: Number(clientId),
            helcimCardId: String(token),
            helcimCustomerId: String(helcimCustomerId),
            cardBrand: cardBrand || 'card',
            cardLast4: cardLast4 || String(token).slice(-4).padStart(4, '0'),
            cardExpMonth: Number(cardExpMonth || 0),
            cardExpYear: Number(cardExpYear || 0),
            isDefault: true,
          } as any);
        }
        return res.status(201).json({
          success: true,
          helcimCustomerId: String(helcimCustomerId),
          helcimCardId: String(token),
          cardBrand: cardBrand || 'card',
          cardLast4: cardLast4 || String(token).slice(-4).padStart(4, '0'),
          cardExpMonth: Number(cardExpMonth || 0),
          cardExpYear: Number(cardExpYear || 0),
        });
      } catch (earlyErr) {
        console.error('[Helcim Save Card] Early persist failed:', earlyErr);
        // Continue to attempt Helcim attach path below
      }
    }

    console.log('[Helcim Save Card] Attempting to save card with:', { helcimCustomerId, token: token.substring(0, 10) + '...' });
    
    const mod2 = await import('../../services/helcim-service.js');
    const service2 = (mod2 as any)?.helcimService || (mod2 as any)?.default || mod2;
    
    if (!service2) {
      console.error('[Helcim Save Card] Failed to import Helcim service');
      return res.status(500).json({ success: false, message: 'Helcim service not available' });
    }
    
    let saved;
    try {
      saved = await service2.saveCardToCustomer({ customerId: helcimCustomerId, token, transactionId });
      console.log('[Helcim Save Card] Card saved successfully:', saved);
    } catch (error: any) {
      console.error('[Helcim Save Card] Error saving card to Helcim (no mock fallback):', error);
      // If Helcim attach failed but we do have a Pay.js token, still store it so future purchases can use cardToken
      if (clientId) {
        try {
          if (storage) {
            const fallbackData = {
              clientId: Number(clientId),
              helcimCardId: String(token), // Store the Pay.js cardToken
              helcimCustomerId: String(helcimCustomerId),
              cardBrand: cardBrand || 'card',
              cardLast4: cardLast4 || '****',
              cardExpMonth: Number(cardExpMonth || 0),
              cardExpYear: Number(cardExpYear || 0),
              isDefault: true,
            };
            console.warn('[Helcim Save Card] Storing Pay.js token without Helcim attach due to API error:', fallbackData);
            await storage.createSavedPaymentMethod(fallbackData as any);
            return res.status(201).json({
              success: true,
              helcimCustomerId: String(helcimCustomerId),
              helcimCardId: String(token),
              cardBrand: fallbackData.cardBrand,
              cardLast4: fallbackData.cardLast4,
              cardExpMonth: fallbackData.cardExpMonth,
              cardExpYear: fallbackData.cardExpYear,
              warning: 'Saved Pay.js token; Helcim attach failed. Purchases will use cardToken.'
            });
          }
        } catch (dbErr) {
          console.error('[Helcim Save Card] Failed to store Pay.js token fallback:', dbErr);
        }
      }
      return res.status(502).json({ success: false, message: 'Helcim API request failed', error: error?.message || 'Unknown error' });
    }
    
    const helcimCardId = saved?.id || saved?.cardId || saved?.card?.id || token; // Fallback to cardToken
    const brand = saved?.brand || saved?.cardBrand;
    const last4 = saved?.last4 || saved?.cardLast4;
    const expMonth = saved?.expMonth || saved?.cardExpMonth;
    const expYear = saved?.expYear || saved?.cardExpYear;

    if (!helcimCardId) {
      return res.status(502).json({ success: false, message: 'Failed to save card in Helcim', details: saved });
    }

    // Store the card information in the database for the client
    if (clientId) {
      try {
        // Use the storage instance passed to the router factory
        if (storage) {
          const savedPaymentData = {
            clientId: Number(clientId),
            helcimCardId: String(helcimCardId),
            helcimCustomerId: String(helcimCustomerId), // Store the Helcim customer ID for future payments
            cardBrand: brand || 'card',
            cardLast4: last4 || '****',
            cardExpMonth: Number(expMonth || 0),
            cardExpYear: Number(expYear || 0),
            isDefault: true // Set as default since it's the first/only card
          };
          console.log('[Helcim Save Card] Saving payment method to DB:', savedPaymentData);
          await storage.createSavedPaymentMethod(savedPaymentData);
          console.log(`✅ Card saved to database for client ${clientId}`);
        } else {
          console.warn('[Helcim Save Card] Storage not available, card not saved to database');
        }
      } catch (dbError) {
        console.error('❌ Error saving card to database:', dbError);
        // Don't fail the request if database save fails, but log it
      }
    }

    res.status(201).json({
      success: true,
      helcimCustomerId,
      helcimCardId: String(helcimCardId),
      cardBrand: brand || 'card',
      cardLast4: last4 || '****',
      cardExpMonth: Number(expMonth || 0),
      cardExpYear: Number(expYear || 0),
    });
  } catch (error: any) {
    console.error('Helcim save-card error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Failed to save card' });
  }
  });

  return router;
}



