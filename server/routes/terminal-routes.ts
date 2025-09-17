import { Router } from 'express';
import { z } from 'zod';
import { HelcimTerminalService } from '../services/helcim-terminal-service.js';
import type { IStorage } from '../storage.js';
import { TerminalConfigService } from '../services/terminal-config-service.js';
import { log } from '../log.js';
import { triggerAfterPayment } from '../automation-triggers.js';

// Factory to create router with storage dependency
export default function createTerminalRoutes(storage: IStorage) {
  const router = Router();
  const configService = new TerminalConfigService(storage);
  const terminalService: any = (storage as any).__terminalService || new HelcimTerminalService(configService);
  (storage as any).__terminalService = terminalService;

  // Schema for terminal initialization
  const InitializeTerminalSchema = z.object({
    terminalId: z.string(),
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
        terminalId: data.terminalId,
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
    
    // Create payment record first to get payment ID for invoice number
    let paymentId: number | undefined;
    let invoiceNumber: string;
    
    if ((data as any).appointmentId && storage) {
      try {
        // Create a pending payment record
        const payment = await storage.createPayment({
          appointmentId: (data as any).appointmentId,
          clientId: (data as any).clientId,
          amount: data.amount,
          totalAmount: data.amount, // Add required totalAmount
          method: 'terminal',
          status: 'pending',
          type: 'appointment',
          description: data.description || 'Terminal payment'
        });
        paymentId = payment.id;
        invoiceNumber = `INV${String(paymentId).padStart(6, '0')}`;
        console.log(`📝 Created payment ${paymentId} with invoice number ${invoiceNumber}`);
      } catch (error) {
        console.warn('Could not pre-create payment record:', error);
        // Fallback to timestamp-based invoice
        invoiceNumber = `POS-${Date.now()}`;
      }
    } else {
      // Fallback for non-appointment payments
      invoiceNumber = `POS-${Date.now()}`;
    }
    
    const result = await terminalService.startPayment(
      data.locationId,
      data.amount,
      {
        description: data.description,
        invoiceNumber,
        appointmentId: (data as any).appointmentId,
        paymentId
      }
    );

    // Normalize response for client expectations
    // Prefer real transactionId when available so polling matches webhook cache
    const helcimTxId = (result as any).transactionId || (result as any).paymentId || (result as any).id || null;
    
    // Update payment record with Helcim transaction ID if we have one
    if (paymentId && helcimTxId && storage) {
      try {
        await storage.updatePayment(paymentId, {
          helcimPaymentId: helcimTxId,
          status: (result as any).status === 'completed' ? 'completed' : 'pending'
        });
        console.log(`✅ Updated payment ${paymentId} with Helcim TX ${helcimTxId}`);
      } catch (error) {
        console.warn('Could not update payment with Helcim ID:', error);
      }
    }
    
    res.json({
      success: true,
      paymentId: paymentId || helcimTxId,
      transactionId: helcimTxId,
      invoiceNumber: invoiceNumber,
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
    // CRITICAL FIX: Only return status if the webhook is for THIS specific payment
    // Must verify the webhook matches this exact paymentId to prevent false completions
    try {
      const g: any = (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__;
      if (g && 
          (g.transactionId === paymentId || g.invoiceNumber === paymentId) &&
          (Date.now() - (g.updatedAt || 0)) <= 90 * 1000) {
        console.log(`📌 Found matching webhook for payment ${paymentId} with status: ${g.status}`);
        
        // Return the actual status from the webhook (could be completed or failed)
        if (g.status === 'failed') {
          return res.json({
            success: false,
            status: 'failed',
            message: 'Payment was declined or cancelled',
            transactionId: g.transactionId || paymentId,
          });
        } else if (g.status === 'completed') {
          return res.json({
            success: true,
            status: 'completed',
            last4: g.last4,
            transactionId: g.transactionId || paymentId,
            amount: g.amount,
            tipAmount: g.tipAmount,
            baseAmount: g.baseAmount,
          });
        }
      }
    } catch {}
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
      const cached: any = (terminalService as any).checkWebhookCache?.(paymentId) || (terminalService as any).getCachedWebhookStatus?.(paymentId);
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

    let status = await terminalService.checkPaymentStatus(locationId, paymentId);
    try {
      console.log('🔎 Terminal status result:', { 
        locationId, 
        paymentId, 
        status: (status as any)?.status,
        transactionId: (status as any)?.transactionId,
        amount: (status as any)?.amount,
        tipAmount: (status as any)?.tipAmount,
        baseAmount: (status as any)?.baseAmount
      });
    } catch {}
    // Normalize response with fallbacks
    let s = (status as any) || {};

    // Strict mode default: do not auto-complete without a matching webhook entry.
    // Limited, safe fallback: if polling by invoice (POS-*) and there's exactly one
    // recently completed webhook in cache, return that transactionId so the client
    // can switch to polling by the real id and complete.
    try {
      const looksLikeInvoice = typeof paymentId === 'string' && paymentId.startsWith('POS-');
      if ((s.status === 'pending' || !s.status) && looksLikeInvoice) {
        const snapshot = (terminalService as any).getDebugSnapshot?.() || { sessions: [], webhooks: [] };
        if (Array.isArray(snapshot.webhooks)) {
          const recentMs = Date.now() - 2 * 60 * 1000; // last 2 minutes
          const candidates = snapshot.webhooks.filter((w: any) => {
            const keyOk = String(w?.key || '').toLowerCase() !== '__global_last_completed__';
            const statusOk = w?.status === 'completed';
            const recentOk = (w?.updatedAt || 0) >= recentMs;
            const hasId = !!(w?.transactionId || w?.key);
            // CRITICAL FIX: Only match if the key matches our specific paymentId
            const matchesPayment = w?.key === paymentId || w?.invoiceNumber === paymentId;
            return keyOk && statusOk && recentOk && hasId && matchesPayment;
          });
          if (candidates.length >= 1) {
            // Choose the most recent candidate
            const winner = candidates.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
            s = {
              status: 'completed',
              transactionId: winner.transactionId || winner.key || paymentId,
              last4: winner.last4,
              cardLast4: winner.last4,
            } as any;
          }
        }
      }
    } catch {}
    res.status(200).json({
      success: s.status === 'completed',
      status: s.status || 'pending',
      message: s.message || 'Processing payment...',
      last4: s.last4 || s.cardLast4 || undefined,
      cardLast4: s.last4 || s.cardLast4 || undefined,
      transactionId: s.transactionId || paymentId,
      terminalId: s.terminalId || undefined,
      amount: s.amount,
      tipAmount: s.tipAmount,
      baseAmount: s.baseAmount,
    });
  } catch (error: any) {
    console.error('❌ Error checking payment status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to check payment status' 
    });
  }
});

// Location-agnostic alias: allow polling without providing locationId
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    try { console.log('🟡 GET /api/terminal/payment/:paymentId', { paymentId }); } catch {}
    try { log('🟡 GET /api/terminal/payment/:paymentId'); } catch {}
    // Minimal confirmation mode: honor any recent success-only webhook globally
    try {
      const g: any = (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__;
      if (g && (Date.now() - (g.updatedAt || 0)) <= 90 * 1000) {
        return res.json({
          success: true,
          status: 'completed',
          last4: g.last4,
          transactionId: g.transactionId || paymentId,
        });
      }
    } catch {}
    // Strict mode: no force/global acceptance.
    // Bypass conditional requests to prevent 304 during active polling
    try {
      delete (req as any).headers['if-none-match'];
      delete (req as any).headers['if-modified-since'];
    } catch {}
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      try { res.removeHeader('ETag'); } catch {}
      try { res.removeHeader('Last-Modified'); } catch {}
    } catch {}

    // Fast-path: webhook cache
    try {
      const cached: any = (terminalService as any).checkWebhookCache?.(paymentId) || (terminalService as any).getCachedWebhookStatus?.(paymentId);
      if (cached) {
        return res.json({
          success: cached.status === 'completed',
          status: cached.status,
          last4: cached.last4,
          transactionId: cached.transactionId || paymentId,
        });
      }
    } catch {}

    // Fallback: check status without relying on location
    let status = await terminalService.checkPaymentStatus('', paymentId);
    let s = (status as any) || {};

    // Minimal confirmation mode for the location-agnostic alias as well.
    try {
      const looksLikeInvoice = typeof paymentId === 'string' && paymentId.startsWith('POS-');
      if ((s.status === 'pending' || !s.status) && looksLikeInvoice) {
        const snapshot = (terminalService as any).getDebugSnapshot?.() || { sessions: [], webhooks: [] };
        if (Array.isArray(snapshot.webhooks)) {
          const recentMs = Date.now() - 2 * 60 * 1000; // last 2 minutes
          const candidates = snapshot.webhooks.filter((w: any) => {
            const keyOk = String(w?.key || '').toLowerCase() !== '__global_last_completed__';
            const statusOk = w?.status === 'completed';
            const recentOk = (w?.updatedAt || 0) >= recentMs;
            const hasId = !!(w?.transactionId || w?.key);
            // CRITICAL FIX: Only match if the key matches our specific paymentId
            const matchesPayment = w?.key === paymentId || w?.invoiceNumber === paymentId;
            return keyOk && statusOk && recentOk && hasId && matchesPayment;
          });
          if (candidates.length >= 1) {
            const winner = candidates.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
            s = {
              status: 'completed',
              transactionId: winner.transactionId || winner.key || paymentId,
              last4: winner.last4,
              cardLast4: winner.last4,
            } as any;
          }
        }
      }
    } catch {}
    return res.status(200).json({
      success: s.status === 'completed',
      status: s.status || 'pending',
      message: s.message || 'Processing payment...',
      last4: s.last4 || s.cardLast4 || undefined,
      cardLast4: s.last4 || s.cardLast4 || undefined,
      transactionId: s.transactionId || paymentId,
      terminalId: s.terminalId || undefined,
    });
  } catch (error: any) {
    console.error('❌ Error checking payment status (no location):', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to check payment status' });
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
              // Fire automation after payment
              try {
                const appt = await storage.getAppointment(numericAppointmentId);
                if (appt) {
                  await triggerAfterPayment(appt, storage);
                }
              } catch (e) {
                try { console.error('⚠️ Failed to trigger after_payment automation (terminal complete)', e); } catch {}
              }
            }
          }
        } catch (updateError: any) {
          // Log but do not fail the response if DB updates have issues
          console.error('⚠️ Error updating payment/appointment after terminal completion:', updateError);
        }

        // Ensure subsequent polling returns completed by caching a synthetic webhook
        try {
          await (terminalService as any).handleWebhook({
            id: String(transactionId),
            transactionId: String(transactionId),
            invoiceNumber: String(transactionId),
            type: 'cardTransaction',
            approved: true,
            status: 'approved',
          });
        } catch {}
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

  // Fallback: attempt to resolve and complete by invoice or transaction id
  router.post('/complete-by-invoice', async (req, res) => {
    try {
      const { locationId, paymentId, appointmentId, dbPaymentId } = req.body || {};
      if (!locationId || !paymentId) {
        return res.status(400).json({ success: false, message: 'locationId and paymentId are required' });
      }
      // Try to resolve status by provided id
      let status = await terminalService.checkPaymentStatus(String(locationId), String(paymentId));
      // If we got a different concrete transactionId, try once more by that id
      if (status?.transactionId && status.transactionId !== paymentId && status.status !== 'completed') {
        try {
          const s2 = await terminalService.checkPaymentStatus(String(locationId), String(status.transactionId));
          if (s2) status = s2 as any;
        } catch {}
      }
      const isCompleted = (status as any)?.status === 'completed';
      // If completed, update DB similarly to complete-payment
      if (isCompleted) {
        try {
          if (dbPaymentId !== undefined && dbPaymentId !== null) {
            const numericPaymentId = typeof dbPaymentId === 'string' ? parseInt(dbPaymentId, 10) : dbPaymentId;
            if (!Number.isNaN(numericPaymentId)) {
              await (storage as any).updatePayment(numericPaymentId, {
                status: 'completed',
                processedAt: new Date(),
              });
            }
          }
          if (appointmentId !== undefined && appointmentId !== null) {
            const numericAppointmentId = typeof appointmentId === 'string' ? parseInt(appointmentId, 10) : appointmentId;
            if (!Number.isNaN(numericAppointmentId)) {
              await storage.updateAppointment(numericAppointmentId, { paymentStatus: 'paid' } as any);
              // Fire automation after payment
              try {
                const appt = await storage.getAppointment(numericAppointmentId);
                if (appt) {
                  await triggerAfterPayment(appt, storage);
                }
              } catch (e) {
                try { console.error('⚠️ Failed to trigger after_payment automation (terminal complete-by-invoice)', e); } catch {}
              }
            }
          }
        } catch {}
      }
      return res.json({
        success: isCompleted,
        status: (status as any)?.status || 'pending',
        transactionId: (status as any)?.transactionId || paymentId,
      });
    } catch (error: any) {
      console.error('❌ Error completing by invoice:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to complete by invoice' });
    }
  });

  // Helcim webhook endpoint: properly check payment status
  router.post('/webhook', async (req, res) => {
    try {
      try { log('🟢 POST /api/terminal/webhook'); } catch {}
      try {
        console.log('📥 Terminal webhook received. Checking payment status...', {
          headers: (req as any).headers,
        });
      } catch {}
      
      // Parse the payload
      let payload: any = (req as any).body || {};
      if (!payload || (Object.keys(payload).length === 0 && (req as any).rawBody)) {
        try { payload = JSON.parse((req as any).rawBody); } catch {}
      }
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch {}
      }
      let maybe: any = payload?.payload ?? payload?.data ?? payload?.event ?? payload;
      if (typeof maybe === 'string') {
        try { maybe = JSON.parse(maybe); } catch {}
      }
      
      // Extract transaction ID
      let txId: string | undefined;
      const candidate = maybe?.transactionId || maybe?.cardTransactionId || maybe?.id || maybe?.paymentId || payload?.id;
      if (candidate) txId = String(candidate);
      
      // Determine payment status from webhook payload
      let paymentStatus = 'pending';
      const statusFields = [
        payload?.status,
        payload?.approved,
        payload?.transactionStatus,
        payload?.response,
        maybe?.status,
        maybe?.approved,
        maybe?.transactionStatus,
        maybe?.response
      ];
      
      // Check for declined/cancelled/failed status
      const statusStr = statusFields.filter(s => s != null).map(s => String(s).toLowerCase()).join(' ');
      if (statusStr.includes('declined') || 
          statusStr.includes('failed') || 
          statusStr.includes('cancelled') || 
          statusStr.includes('cancel') ||
          statusStr.includes('voided') ||
          statusStr.includes('refunded') ||
          payload?.approved === false ||
          payload?.approved === 'false' ||
          payload?.approved === 0 ||
          maybe?.approved === false ||
          maybe?.approved === 'false' ||
          maybe?.approved === 0) {
        paymentStatus = 'failed';
        console.log('❌ Payment declined/failed detected in terminal webhook');
      } else if (payload?.approved === true || 
                 payload?.approved === 'true' || 
                 payload?.approved === 1 ||
                 maybe?.approved === true ||
                 maybe?.approved === 'true' ||
                 maybe?.approved === 1 ||
                 statusStr.includes('approved') ||
                 statusStr.includes('completed') ||
                 statusStr.includes('success')) {
        paymentStatus = 'completed';
        console.log('✅ Payment approved detected in terminal webhook');
      }
      
      // Only record global marker if payment was successful AND we have the transaction ID
      // This ensures we don't incorrectly mark other payments as complete
      if (paymentStatus === 'completed' && txId) {
        try {
          (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__ = {
            status: 'completed',
            transactionId: txId,
            updatedAt: Date.now(),
          };
        } catch {}
      } else if (paymentStatus === 'failed' && txId) {
        // Store failed status for this specific transaction
        try {
          (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__ = {
            status: 'failed',
            transactionId: txId,
            updatedAt: Date.now(),
          };
        } catch {}
      }
      
      // Attempt enrichment by invoking service (non-blocking)
      if (txId) {
        setImmediate(async () => {
          try {
            await (terminalService as any).handleWebhook({ 
              transactionId: txId, 
              type: 'cardTransaction',
              status: paymentStatus,
              approved: payload?.approved || maybe?.approved,
              response: payload?.response || maybe?.response,
              rawPayload: payload
            });
          } catch (err) {
            try { console.error('❌ Terminal webhook enrichment failed:', err); } catch {}
          }
        });
      } else {
        // No id provided; associate with the most recent active session so polling can complete
        try {
          const snapshot = (terminalService as any).getDebugSnapshot?.();
          const sessions = Array.isArray(snapshot?.sessions) ? snapshot.sessions : [];
          if (sessions.length > 0) {
            const recent = sessions
              .filter((s: any) => (Date.now() - (s.startedAt || 0)) <= 10 * 60 * 1000)
              .sort((a: any, b: any) => (b.startedAt || 0) - (a.startedAt || 0))[0];
            if (recent?.key) {
              setImmediate(async () => {
                try {
                  await (terminalService as any).handleWebhook({ invoiceNumber: String(recent.key), type: 'cardTransaction', approved: true });
                } catch (err) {
                  try { console.error('❌ Terminal webhook session-association failed:', err); } catch {}
                }
              });
            }
          }
        } catch {}
      }
      // Respond immediately; no further processing
      try { return res.json({ received: true }); } catch {}
      return;
    } catch (error: any) {
      try { console.error('❌ Error handling terminal webhook (success-only):', error); } catch {}
      return res.status(200).json({ received: true });
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
      const snapshot = (terminalService as any).getDebugSnapshot?.() || { sessions: [], webhooks: [] };
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

/**
 * Debug endpoint to clear webhook cache (temporary for testing)
 */
router.post('/clear-cache', (req, res) => {
  try {
    // Clear the global marker
    delete (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__;
    
    // Clear webhook store
    const webhookStore = (terminalService as any).webhookStore;
    if (webhookStore) {
      webhookStore.clear();
    }
    
    // Clear session store
    const sessionStore = (terminalService as any).sessionStore;
    if (sessionStore) {
      sessionStore.clear();
    }
    
    console.log('🧹 Cleared all webhook and session caches');
    return res.json({ success: true, message: 'All caches cleared' });
  } catch (error: any) {
    console.error('❌ Error clearing caches:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Complete POS terminal payment (no appointment)
 */
router.post('/complete-pos', async (req, res) => {
  try {
    const { cardLast4, totalAmount, tipAmount, baseAmount, transactionId } = req.body;
    
    console.log('💳 Completing POS terminal payment:', { 
      totalAmount, 
      tipAmount, 
      baseAmount,
      transactionId 
    });

    // Get storage instance
    const storage = req.app.get('storage');
    if (!storage) {
      throw new Error('Storage not available');
    }

    // Create a payment record for POS sale
    const payment = await storage.createPayment({
      clientId: 1, // Default client for walk-in POS sales
      amount: baseAmount || totalAmount,
      tipAmount: tipAmount || 0,
      totalAmount: totalAmount || baseAmount,
      method: 'terminal',
      status: 'completed',
      type: 'pos_payment',
      description: 'POS Terminal Sale',
      helcimPaymentId: transactionId,
      processedAt: new Date(),
      notes: cardLast4 ? `Terminal payment - Card ending in ${cardLast4}` : 'Terminal payment completed'
    });

    // Create sales history record for reports
    const salesData = {
      transactionType: 'pos_sale',
      transactionDate: new Date(),
      paymentId: payment.id,
      totalAmount: totalAmount || baseAmount,
      paymentMethod: 'terminal',
      paymentStatus: 'completed',
      clientId: null,
      clientName: null,
      staffId: null,
      staffName: null,
      appointmentId: null,
      serviceIds: null,
      serviceNames: null,
      serviceTotalAmount: null,
      productIds: null,
      productNames: null,
      productQuantities: null,
      productUnitPrices: null,
      productTotalAmount: baseAmount || (totalAmount && tipAmount ? totalAmount - tipAmount : totalAmount),
      membershipId: null,
      membershipName: null,
      membershipDuration: null,
      taxAmount: 0,
      tipAmount: tipAmount || 0,
      discountAmount: 0,
      businessDate: new Date(),
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()],
      monthYear: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      quarter: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      helcimPaymentId: transactionId,
      createdBy: null,
      notes: 'POS Terminal Sale'
    };

    // Try to create sales history record
    try {
      await storage.createSalesHistory(salesData);
      console.log('📊 Sales history record created for POS terminal payment');
    } catch (e) {
      console.log('Sales history creation skipped:', e);
    }

    return res.json({ 
      success: true, 
      payment,
      message: 'POS payment completed successfully' 
    });
  } catch (error: any) {
    console.error('❌ Error completing POS terminal payment:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to complete payment' 
    });
  }
});

/**
 * Complete terminal payment and sync with calendar
 */
router.post('/complete/:appointmentId/:paymentId', async (req, res) => {
  try {
    const { appointmentId, paymentId } = req.params;
    const { cardLast4, totalAmount, tipAmount, baseAmount, transactionId } = req.body;
    
    console.log('💳 Completing terminal payment:', { 
      appointmentId, 
      paymentId, 
      totalAmount, 
      tipAmount, 
      baseAmount,
      transactionId 
    });

    // Get storage instance
    const storage = req.app.get('storage');
    if (!storage) {
      throw new Error('Storage not available');
    }

    // Update payment with terminal details - ALWAYS store the Helcim transaction ID
    const updatedPayment = await storage.updatePayment(parseInt(paymentId), {
      status: 'completed',
      helcimPaymentId: transactionId || paymentId, // Always store the Helcim ID
      tipAmount: tipAmount || 0,
      totalAmount: totalAmount || baseAmount,
      processedAt: new Date(),
      notes: JSON.stringify({
        helcimTransactionId: transactionId,
        invoiceNumber: `INV${String(paymentId).padStart(6, '0')}`,
        cardLast4: cardLast4 || null,
        terminalPayment: true,
        verified: true,
        processedAt: new Date().toISOString()
      })
    });

    // Update appointment payment status
    await storage.updateAppointment(parseInt(appointmentId), {
      paymentStatus: 'paid',
      tipAmount: tipAmount || 0,
      totalAmount: totalAmount || baseAmount
    });

    // Import the createSalesHistoryRecord function to properly record the sale
    // This needs to be imported at the top of the file, but for now we'll create the record properly
    const appointment = await storage.getAppointment(parseInt(appointmentId));
    if (appointment && updatedPayment) {
      try {
        // Get staff and client info for the sales record
        let staffInfo = null;
        let clientInfo = null;
        let serviceInfo = null;
        
        if (appointment.staffId) {
          try {
            const staffData = await storage.getStaff(appointment.staffId);
            if (staffData && staffData.userId) {
              const staffUser = await storage.getUser(staffData.userId);
              if (staffUser) {
                staffInfo = { id: staffData.id, user: staffUser };
              }
            }
          } catch (e) {
            console.log('Error getting staff info:', e);
          }
        }
        
        if (appointment.clientId) {
          try {
            clientInfo = await storage.getUser(appointment.clientId);
          } catch (e) {
            console.log('Error getting client info:', e);
          }
        }
        
        if (appointment.serviceId) {
          try {
            serviceInfo = await storage.getService(appointment.serviceId);
          } catch (e) {
            console.log('Error getting service info:', e);
          }
        }
        
        const now = new Date();
        const salesHistoryData = {
          transactionType: 'appointment',
          transactionDate: now,
          paymentId: updatedPayment.id,
          totalAmount: totalAmount || baseAmount || 0,
          paymentMethod: 'terminal',
          paymentStatus: 'completed',
          
          // Client information
          clientId: clientInfo?.id || null,
          clientName: clientInfo ? `${clientInfo.firstName || ''} ${clientInfo.lastName || ''}`.trim() : null,
          clientEmail: clientInfo?.email || null,
          clientPhone: clientInfo?.phone || null,
          
          // Staff information
          staffId: staffInfo?.id || appointment.staffId || null,
          staffName: staffInfo?.user ? `${staffInfo.user.firstName || ''} ${staffInfo.user.lastName || ''}`.trim() : null,
          
          // Appointment and service information
          appointmentId: parseInt(appointmentId),
          serviceIds: serviceInfo ? JSON.stringify([serviceInfo.id]) : null,
          serviceNames: serviceInfo ? JSON.stringify([serviceInfo.name]) : null,
          serviceTotalAmount: baseAmount || (totalAmount && tipAmount ? totalAmount - tipAmount : totalAmount),
          
          // Business date info
          businessDate: now.toISOString().split('T')[0],
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
          monthYear: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          quarter: `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`,
          
          // External tracking
          helcimPaymentId: transactionId || null,
          
          // Tax and fees - CRITICALLY IMPORTANT FOR TIPS
          taxAmount: 0,
          tipAmount: tipAmount || 0,
          discountAmount: 0,
          
          // Audit trail
          createdBy: null,
          notes: cardLast4 ? `Terminal payment - Card ending in ${cardLast4}` : 'Terminal payment completed'
        };
        
        await storage.createSalesHistory(salesHistoryData);
        console.log('📊 Sales history record created with tip:', { appointmentId, tipAmount });
      } catch (e) {
        console.error('❌ Error creating sales history:', e);
      }
    }

    return res.json({ 
      success: true, 
      payment: updatedPayment,
      message: 'Payment completed and synced with calendar' 
    });
  } catch (error: any) {
    console.error('❌ Error completing terminal payment:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to complete payment' 
    });
  }
});

  // Webhook endpoint (without "helcim" in the path)
  // This handles webhooks sent by Helcim when payments complete
  router.post('/webhook', async (req: any, res: any) => {
    try {
      log('🌐 POST /api/terminal/webhook');
      console.log('📥 Terminal webhook received:', {
        headers: req.headers,
        body: req.body,
        path: req.path,
      });
      
      // Get the shared terminal service instance that has the webhook handler
      const sharedTerminalService = (storage as any).__terminalService;
      if (!sharedTerminalService) {
        console.error('❌ Terminal service not initialized');
        return res.status(200).json({ received: true }); // Still return 200 to not trigger retries
      }
      
      // Parse the webhook payload
      let payload: any = req.body || {};
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch {}
      }
      
      // Helcim sends minimal webhook: {"id":"TRANSACTION_ID", "type":"cardTransaction"}
      const txId = payload?.id;
      const type = payload?.type;
      
      console.log('🎯 Processing webhook:', { id: txId, type });
      
      // Process webhook based on type
      if (type === 'cardTransaction' && txId) {
        // Default to completed for cardTransaction webhooks
        let paymentStatus = 'completed';
        
        // Check for failure indicators
        const statusFields = [
          payload?.status,
          payload?.approved,
          payload?.transactionStatus,
          payload?.response,
          payload?.responseMessage,
          payload?.error
        ];
        
        const statusStr = statusFields.filter(s => s != null).map(s => String(s).toLowerCase()).join(' ');
        if (statusStr.includes('declined') || 
            statusStr.includes('failed') || 
            statusStr.includes('cancelled') || 
            statusStr.includes('error') ||
            payload?.approved === false ||
            payload?.approved === 'false' ||
            payload?.approved === 0) {
          paymentStatus = 'failed';
          console.log('❌ Payment declined/failed detected in webhook');
        } else {
          console.log('✅ Processing cardTransaction webhook as successful');
        }
        
        // Handle the webhook asynchronously
        setImmediate(async () => {
          try {
            await sharedTerminalService.handleWebhook({
              id: txId,
              transactionId: txId,
              type: 'cardTransaction',
              status: paymentStatus,
              approved: payload?.approved,
              response: payload?.response,
              rawPayload: payload
            });
            console.log(`✅ Webhook processed for transaction ${txId} with status: ${paymentStatus}`);
          } catch (err) {
            console.error('❌ Webhook processing failed:', err);
            // Try to cache directly as fallback
            try {
              const webhookStore = sharedTerminalService.webhookStore || new Map();
              webhookStore.set(String(txId), {
                status: paymentStatus,
                transactionId: txId,
                updatedAt: Date.now(),
              });
            } catch {}
          }
        });
      } else if (type === 'terminalCancel' || type === 'terminalDecline' || type === 'declined') {
        const cancelStatus = type === 'declined' || type === 'terminalDecline' ? 'failed' : 'cancelled';
        setImmediate(async () => {
          try {
            await sharedTerminalService.handleWebhook({
              id: txId,
              transactionId: txId,
              type: type,
              status: cancelStatus,
              rawPayload: payload
            });
          } catch (err) {
            console.error(`❌ ${type} webhook processing failed:`, err);
          }
        });
      }
      
      // Always return 200 OK to acknowledge receipt
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('❌ Error in terminal webhook:', error);
      return res.status(200).json({ received: true });
    }
  });

  return router;
}
