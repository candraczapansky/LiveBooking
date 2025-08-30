import { Router } from 'express';
import type { Request, Response } from 'express';

function createHelcimPaymentsRouter(storage?: any) {
  const router = Router();

// Initialize Helcim Pay.js session (real Helcim initialization)
router.post('/initialize', async (req, res) => {
  try {
    const { amount, description } = req.body || {};
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const apiToken = process.env.HELCIM_API_TOKEN;
    const apiUrlV2 = process.env.HELCIM_API_URL || 'https://api.helcim.com/v2';
    if (!apiToken) {
      return res.status(500).json({ success: false, message: 'Helcim API token not configured' });
    }

    const payload = {
      amount: Number(amount),
      currency: 'USD',
      paymentType: 'purchase',
      test: process.env.NODE_ENV !== 'production',
      description: description || 'Payment',
      idempotencyKey: `hpjs_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    } as any;

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

    res.json({ 
      success: true, 
      token: result.data.checkoutToken,
      secretToken: result.data.secretToken  // Include the secretToken as per Helcim docs
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
    const helcimCustomerId = created?.id || created?.customerId || created?.customer?.id;
    if (!helcimCustomerId) {
      return res.status(502).json({ success: false, message: 'Failed to create Helcim customer', details: created });
    }
    res.json({ success: true, customerId: String(helcimCustomerId) });
  } catch (error: any) {
    console.error('Helcim create-customer error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Failed to create Helcim customer' });
  }
});

// Save card on file for a client via HelcimPay.js token; persist minimal card meta in DB
router.post('/save-card', async (req: Request, res: Response) => {
  try {
    const { token, customerId, customerEmail, customerName } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, message: 'token is required' });
    }

    let helcimCustomerId: string | null = customerId || null;
    if (!helcimCustomerId) {
      // Attempt to create a customer with provided info
      const firstName = (customerName || '').split(' ')[0] || undefined;
      const lastName = (customerName || '').split(' ').slice(1).join(' ') || undefined;
      const mod = await import('../../services/helcim-service.js');
      const service = (mod as any)?.helcimService || (mod as any)?.default || mod;
      const created = await service.createCustomer({
        firstName,
        lastName,
        email: customerEmail,
      });
      helcimCustomerId = String(created?.id || created?.customerId || created?.customer?.id || '');
      if (!helcimCustomerId) {
        return res.status(502).json({ success: false, message: 'Failed to create Helcim customer' });
      }
    }

    const mod2 = await import('../../services/helcim-service.js');
    const service2 = (mod2 as any)?.helcimService || (mod2 as any)?.default || mod2;
    const saved = await service2.saveCardToCustomer({ customerId: helcimCustomerId, token });
    const helcimCardId = saved?.id || saved?.cardId || saved?.card?.id;
    const brand = saved?.brand || saved?.cardBrand;
    const last4 = saved?.last4 || saved?.cardLast4;
    const expMonth = saved?.expMonth || saved?.cardExpMonth;
    const expYear = saved?.expYear || saved?.cardExpYear;

    if (!helcimCardId) {
      return res.status(502).json({ success: false, message: 'Failed to save card in Helcim', details: saved });
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

export default createHelcimPaymentsRouter;


