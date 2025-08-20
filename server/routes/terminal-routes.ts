import { Router } from 'express';
import { z } from 'zod';
import { HelcimTerminalService } from '../services/helcim-terminal-service';
import type { IStorage } from '../storage';
import { TerminalConfigService } from '../services/terminal-config-service';

// Factory to create router with storage dependency
export default function createTerminalRoutes(storage: IStorage) {
  const router = Router();
  const configService = new TerminalConfigService(storage);
  const terminalService = new HelcimTerminalService(configService);

  // Schema for terminal initialization
  const InitializeTerminalSchema = z.object({
    terminalId: z.string().optional(),
    locationId: z.string(),
    deviceCode: z.string(),
    apiToken: z.string(),
  });

// Schema for payment request
const PaymentRequestSchema = z.object({
  locationId: z.string(),
  amount: z.number().positive(),
  tipAmount: z.number().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Initialize a terminal for a location
 */
  router.post('/initialize', async (req, res) => {
    try {
      const data = InitializeTerminalSchema.parse(req.body);

      const success = await terminalService.initializeTerminal({
        terminalId: data.terminalId || data.deviceCode,
        locationId: data.locationId,
        deviceCode: data.deviceCode,
        apiToken: data.apiToken,
      });

      if (success) {
        res.json({ success: true, message: 'Terminal initialized successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to initialize terminal' });
      }
    } catch (error: any) {
      console.error('❌ Error initializing terminal:', error);
      res.status(400).json({ 
        success: false, 
        message: error.message || 'Invalid request data' 
      });
    }
  });

/**
 * Start a payment on a terminal
 */
router.post('/payment/start', async (req, res) => {
  try {
    const data = PaymentRequestSchema.parse(req.body);
    
    const result = await terminalService.startPayment(
      data.locationId,
      data.amount,
      {
        tipAmount: data.tipAmount,
        reference: data.reference,
        description: data.description,
      }
    );

    // Normalize response for client expectations
    res.json({
      success: true,
      paymentId: result.paymentId || result.transactionId || result.id,
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Error starting payment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to start payment' 
    });
  }
});

/**
 * Check payment status
 */
router.get('/payment/:locationId/:paymentId', async (req, res) => {
  try {
    const { locationId, paymentId } = req.params;
    
    const status = await terminalService.checkPaymentStatus(locationId, paymentId);
    // Normalize response
    res.json({
      success: status.status === 'completed',
      status: status.status,
      message: status.message || 'Processing payment...',
      last4: status.last4,
      transactionId: status.transactionId,
      terminalId: status.terminalId,
    });
  } catch (error: any) {
    console.error('❌ Error checking payment status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to check payment status' 
    });
  }
});

  // Backward-compat endpoints used by some client flows
  router.post('/confirm-payment', async (req, res) => {
    try {
      const { transactionId, deviceCode } = req.body || {};
      if (!transactionId || !deviceCode) {
        return res.status(400).json({ success: false, message: 'transactionId and deviceCode are required' });
      }

      const config = await configService.getTerminalConfigByDeviceCode(deviceCode);
      if (!config) {
        return res.status(404).json({ success: false, message: 'Terminal configuration not found for device' });
      }

      const status = await terminalService.checkPaymentStatus(config.locationId, transactionId);
      const normalized = {
        success: status.status === 'completed',
        status: status.status,
        cardLast4: status.last4,
        paymentMethod: status.paymentMethod,
        transactionId: status.transactionId,
      };
      return res.json(normalized);
    } catch (error: any) {
      console.error('❌ Error confirming payment:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to confirm payment' });
    }
  });

  router.post('/complete-payment', async (req, res) => {
    try {
      const { transactionId, deviceCode } = req.body || {};
      if (!transactionId || !deviceCode) {
        return res.status(400).json({ success: false, message: 'transactionId and deviceCode are required' });
      }

      const config = await configService.getTerminalConfigByDeviceCode(deviceCode);
      if (!config) {
        return res.status(404).json({ success: false, message: 'Terminal configuration not found for device' });
      }

      const status = await terminalService.checkPaymentStatus(config.locationId, transactionId);
      return res.json({ success: status.status === 'completed', status: status.status });
    } catch (error: any) {
      console.error('❌ Error completing payment:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to complete payment' });
    }
  });

/**
 * Cancel a payment
 */
router.post('/payment/:locationId/:paymentId/cancel', async (req, res) => {
  try {
    const { locationId, paymentId } = req.params;
    
    const result = await terminalService.cancelPayment(locationId, paymentId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('❌ Error canceling payment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to cancel payment' 
    });
  }
});

/**
 * Get terminal status
 */
router.get('/status/:locationId', async (req, res) => {
  try {
    const { locationId } = req.params;
    
    const status = await terminalService.getTerminalStatus(locationId);
    res.json(status);
  } catch (error: any) {
    console.error('❌ Error getting terminal status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get terminal status' 
    });
  }
});

  return router;
}
