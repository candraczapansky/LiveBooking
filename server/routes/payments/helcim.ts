import { Router } from 'express';
import { randomBytes } from 'crypto';
import { helcimService } from '../../services/helcim-service.js';

const router = Router();

// Initialize Helcim Pay.js session (temporary placeholder token)
router.post('/initialize', async (req, res) => {
  try {
    const { amount, description, customerEmail, customerName } = req.body || {};

    // TODO: Replace with real Helcim Pay.js session creation
    const token = `dev_${randomBytes(16).toString('hex')}`;

    res.json({
      success: true,
      token,
      amount,
      description,
      customerEmail,
      customerName,
      test: process.env.NODE_ENV !== 'production',
    });
  } catch (error: any) {
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


