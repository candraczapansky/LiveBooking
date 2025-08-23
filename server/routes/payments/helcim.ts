import { Router } from 'express';
import { randomBytes } from 'crypto';
import { helcimService } from '../../services/helcim-service.js';

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

    res.json({ success: true, token: result.data.checkoutToken });
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

    const payment = await helcimService.processPayment({
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

    const payment = await helcimService.verifyPayment(transactionId);

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

export default router;


