import { Router } from 'express';
import { z } from 'zod';
import { HelcimTerminalService } from '../services/helcim-terminal-service.js';
import type { IStorage } from '../storage.js';
import { TerminalConfigService } from '../services/terminal-config-service.js';
import { log } from '../vite.js';

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
      try { console.log('🟢 POST /api/terminal/initialize', { body: req.body }); } catch {}
      try { log('🟢 POST /api/terminal/initialize'); } catch {}
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
    try { console.log('🟢 POST /api/terminal/payment/start', { body: req.body }); } catch {}
    try { log('🟢 POST /api/terminal/payment/start'); } catch {}
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
    const pid = (result as any).paymentId || (result as any).transactionId || (result as any).id || (result as any).invoiceNumber || null;
    res.json({
      success: true,
      paymentId: pid,
      transactionId: (result as any).transactionId || pid,
      invoiceNumber: (result as any).invoiceNumber || pid,
      status: (result as any).status || 'pending'
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
    try { console.log('🟡 GET /api/terminal/payment/:locationId/:paymentId', { locationId, paymentId }); } catch {}
    try { log('🟡 GET /api/terminal/payment/:locationId/:paymentId'); } catch {}
    // Force bypass of conditional requests to prevent 304 during active polling
    try {
      delete (req as any).headers['if-none-match'];
      delete (req as any).headers['if-modified-since'];
    } catch {}
    // Avoid intermediate proxies/browser returning 304 by disabling caching for polling endpoint
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      // Ensure conditional validators are not present
      try { res.removeHeader('ETag'); } catch {}
      try { res.removeHeader('Last-Modified'); } catch {}
    } catch {}
    
    // Fast-path: webhook cache. If pending, attempt refresh via transactionId
    try {
      const cached: any = (terminalService as any).checkWebhookCache?.(paymentId);
      if (cached) {
        if (cached.status !== 'completed' && cached.transactionId) {
          try {
            const refreshed = await terminalService.checkPaymentStatus(locationId, String(cached.transactionId));
            const r = (refreshed as any) || {};
            return res.json({
              success: r.status === 'completed',
              status: r.status || cached.status,
              last4: r.last4 || cached.last4,
              transactionId: r.transactionId || cached.transactionId,
            });
          } catch {}
        }
        return res.json({
          success: cached.status === 'completed',
          status: cached.status,
          last4: cached.last4,
          transactionId: cached.transactionId || paymentId,
        });
      }
    } catch {}

    const status = await terminalService.checkPaymentStatus(locationId, paymentId);
    try {
      console.log('🔎 Terminal status debug', { locationId, paymentId, raw: status });
    } catch {}
    // Normalize response with fallbacks
    const s = (status as any) || {};
    res.status(200).json({
      success: s.status === 'completed',
      status: s.status || 'pending',
      message: s.message || 'Processing payment... ',
      last4: s.last4 || s.cardLast4 || undefined,
      transactionId: s.transactionId || paymentId,
      terminalId: s.terminalId || undefined,
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
      try { console.log('🟢 POST /api/terminal/complete-payment', { body: req.body }); } catch {}
      const { transactionId, appointmentId, paymentId } = req.body || {};
      if (!transactionId) {
        return res.status(400).json({ success: false, message: 'transactionId is required' });
      }

      // Assume the client only calls this after a successful terminal status
      const isCompleted = true;

      if (isCompleted) {
        try {
          // Mark payment as completed if provided
          if (paymentId !== undefined && paymentId !== null) {
            const numericPaymentId = typeof paymentId === 'string' ? parseInt(paymentId, 10) : paymentId;
            if (!Number.isNaN(numericPaymentId)) {
              await (storage as any).updatePayment(numericPaymentId, {
                status: 'completed',
                processedAt: new Date(),
              });

              // Attempt to create staff earnings for payroll
              try {
                const payment = await (storage as any).getPayment(numericPaymentId);
                if (payment?.appointmentId) {
                  const appt = await storage.getAppointment(payment.appointmentId);
                  if (appt) {
                    const service = await storage.getService(appt.serviceId);
                    const staffMember = await storage.getStaff(appt.staffId);
                    if (service && staffMember) {
                      let earningsAmount = 0;
                      let rateType = 'commission';
                      let rateUsed = 0;
                      let calculationDetails = '';
                      switch (staffMember.commissionType) {
                        case 'commission': {
                          const commissionRate = staffMember.commissionRate || 0;
                          earningsAmount = service.price * commissionRate;
                          rateUsed = commissionRate;
                          calculationDetails = JSON.stringify({ type: 'commission', servicePrice: service.price, commissionRate, earnings: earningsAmount });
                          break;
                        }
                        case 'hourly': {
                          const hourlyRate = staffMember.hourlyRate || 0;
                          const serviceDuration = service.duration || 60;
                          const hours = serviceDuration / 60;
                          earningsAmount = hourlyRate * hours;
                          rateType = 'hourly';
                          rateUsed = hourlyRate;
                          calculationDetails = JSON.stringify({ type: 'hourly', servicePrice: service.price, hourlyRate, serviceDuration, hours, earnings: earningsAmount });
                          break;
                        }
                        case 'fixed': {
                          const fixedRate = staffMember.fixedRate || 0;
                          earningsAmount = fixedRate;
                          rateType = 'fixed';
                          rateUsed = fixedRate;
                          calculationDetails = JSON.stringify({ type: 'fixed', servicePrice: service.price, fixedRate, earnings: earningsAmount });
                          break;
                        }
                        case 'hourly_plus_commission': {
                          const hourlyRate = staffMember.hourlyRate || 0;
                          const commissionRate = staffMember.commissionRate || 0;
                          const serviceDuration = service.duration || 60;
                          const hours = serviceDuration / 60;
                          const hourlyPortion = hourlyRate * hours;
                          const commissionPortion = service.price * commissionRate;
                          earningsAmount = hourlyPortion + commissionPortion;
                          rateType = 'hourly_plus_commission';
                          rateUsed = hourlyRate;
                          calculationDetails = JSON.stringify({ type: 'hourly_plus_commission', servicePrice: service.price, hourlyRate, commissionRate, serviceDuration, hours, hourlyPortion, commissionPortion, earnings: earningsAmount });
                          break;
                        }
                        default:
                          earningsAmount = 0;
                          calculationDetails = JSON.stringify({ type: 'unknown', servicePrice: service.price, earnings: 0 });
                      }

                      if (earningsAmount > 0) {
                        await (storage as any).createStaffEarnings({
                          staffId: appt.staffId,
                          appointmentId: appt.id,
                          serviceId: appt.serviceId,
                          paymentId: numericPaymentId,
                          earningsAmount,
                          rateType,
                          rateUsed,
                          isCustomRate: false,
                          servicePrice: service.price,
                          calculationDetails,
                          earningsDate: new Date(),
                        });
                      }
                    }
                  }
                }
              } catch {}
            }
          }

          // Mark appointment as paid if provided
          if (appointmentId !== undefined && appointmentId !== null) {
            const numericAppointmentId = typeof appointmentId === 'string' ? parseInt(appointmentId, 10) : appointmentId;
            if (!Number.isNaN(numericAppointmentId)) {
              await storage.updateAppointment(numericAppointmentId, {
                paymentStatus: 'paid',
              } as any);
            }
          }
        } catch (updateError: any) {
          // Log but do not fail the response if DB updates have issues
          console.error('⚠️ Error updating payment/appointment after terminal completion:', updateError);
        }
      }

      return res.json({ 
        success: isCompleted, 
        status: isCompleted ? 'completed' : 'pending',
        transactionId,
        paymentId: paymentId ?? null,
        appointmentId: appointmentId ?? null,
      });
    } catch (error: any) {
      console.error('❌ Error completing payment:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to complete payment' });
    }
  });

  // Helcim webhook endpoint (configure in Helcim dashboard)
  router.post('/webhook', async (req, res) => {
    try {
      try { log('🟢 POST /api/terminal/webhook'); } catch {}
      // Accept JSON or x-www-form-urlencoded and handle nested JSON strings
      let payload: any = (req as any).body || {};
      if (!payload || (Object.keys(payload).length === 0 && (req as any).rawBody)) {
        try { payload = JSON.parse((req as any).rawBody); } catch {}
      }
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch {}
      }
      // Some gateways nest the event under payload/data/event; sometimes as a JSON string
      let maybe: any = payload?.payload ?? payload?.data ?? payload?.event ?? payload;
      if (typeof maybe === 'string') {
        try { maybe = JSON.parse(maybe); } catch {}
      }
      try {
        console.log('📥 Terminal webhook raw', { headers: (req as any).headers, payload });
        console.log('📥 Terminal webhook maybe', { maybe });
      } catch {}
      // Map common Helcim fields to our cache format
      const normalized = {
        // Helcim docs: cardTransaction webhook can be { id, type: 'cardTransaction' }
        // We map id->transactionId and enrich later in service
        invoiceNumber: maybe?.invoiceNumber || maybe?.invoice || maybe?.referenceNumber || maybe?.reference,
        transactionId: maybe?.transactionId || maybe?.id || maybe?.paymentId || payload?.id,
        last4: maybe?.last4 || maybe?.cardLast4 || maybe?.card?.last4,
        status: maybe?.status || maybe?.result || maybe?.outcome,
      };
      // Best-effort: if only {id,type} is provided, log clearly
      try {
        if (normalized.transactionId && !normalized.status && !normalized.invoiceNumber) {
          console.log('ℹ️ Minimal webhook received; will enrich by id', normalized);
        }
      } catch {}
      await (terminalService as any).handleWebhook(normalized);
      return res.json({ received: true });
    } catch (error: any) {
      console.error('❌ Error handling terminal webhook:', error);
      return res.status(400).json({ received: false });
    }
  });

  // Simple health endpoint to verify webhook path is live
  router.get('/webhook', async (_req, res) => {
    try {
      res.json({ status: 'ok' });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e?.message || 'unknown' });
    }
  });

  // Lightweight debug endpoint to inspect recent terminal sessions and webhooks
  router.get('/debug/snapshot', async (req, res) => {
    try {
      try {
        res.setHeader('Cache-Control', 'no-store');
      } catch {}
      const snapshot = (terminalService as any).debugSnapshot?.() || { sessions: [], webhooks: [] };
      return res.json(snapshot);
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to load debug snapshot' });
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
    try { console.log('🟢 GET /api/terminal/status/:locationId', { locationId }); } catch {}
    try { log('🟢 GET /api/terminal/status/:locationId'); } catch {}
    // Return configured=true if we have a saved terminal config for this location.
    const config = await configService.getTerminalConfig(locationId);
    if (!config) {
      return res.status(404).json({ success: false, message: 'No terminal configured for this location' });
    }
    return res.json({
      success: true,
      status: 'configured',
      terminalId: config.terminalId,
      deviceCode: config.deviceCode,
    });
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
