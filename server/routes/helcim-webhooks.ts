import { Router } from 'express';
import type { IStorage } from '../storage.js';
import { TerminalConfigService } from '../services/terminal-config-service.js';
import { HelcimTerminalService } from '../services/helcim-terminal-service.js';
import { log } from '../log.js';

export default function createHelcimWebhookRoutes(storage: IStorage) {
  const router = Router();
  const configService = new TerminalConfigService(storage);
  const terminalService: any = (storage as any).__terminalService || new HelcimTerminalService(configService);
  (storage as any).__terminalService = terminalService;

  const handler = async (req: any, res: any) => {
    try {
      try { log('🟢 POST /api/helcim/webhook'); } catch {}
      
      // Log raw webhook data for debugging
      console.log('📥 Raw webhook received:', {
        headers: req.headers,
        body: req.body,
        rawBody: req.rawBody?.substring?.(0, 500), // First 500 chars if raw body exists
      });
      
      let body: any = req.body || {};
      if (!body || (Object.keys(body).length === 0 && req.rawBody)) {
        try { body = JSON.parse(req.rawBody); } catch {}
      }
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
      
      // Log parsed body
      console.log('📋 Parsed webhook body:', JSON.stringify(body, null, 2));
      
      let maybe: any = body?.payload ?? body?.data ?? body?.event ?? body;
      if (typeof maybe === 'string') { try { maybe = JSON.parse(maybe); } catch {} }
      
      // Extract all possible fields from Helcim webhook
      const normalized = {
        // Allow our app-generated invoiceNumber to be passed as query param
        invoiceNumber: req?.query?.invoiceNumber || req?.query?.inv || req?.query?.reference || maybe?.invoiceNumber || maybe?.invoice || maybe?.referenceNumber || maybe?.reference || maybe?.invoiceId,
        transactionId: maybe?.transactionId || maybe?.cardTransactionId || maybe?.id || maybe?.paymentId || body?.id || maybe?.transaction?.id,
        last4: maybe?.last4 || maybe?.cardLast4 || maybe?.card?.last4 || maybe?.cardNumber?.substring?.(maybe.cardNumber.length - 4),
        status: maybe?.status || maybe?.result || maybe?.outcome || maybe?.approved,
        amount: maybe?.amount || maybe?.totalAmount || maybe?.transaction?.amount,
        type: maybe?.type || maybe?.transactionType,
        approved: maybe?.approved,
        cardType: maybe?.cardType || maybe?.card?.type,
        customerCode: maybe?.customerCode,
      };

      // Record a global last-completed marker so the app can accept minimal confirmations
      try {
        if (normalized) {
          (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__ = {
            status: 'completed',
            transactionId: normalized.transactionId,
            invoiceNumber: normalized.invoiceNumber,
            last4: normalized.last4,
            updatedAt: Date.now(),
          };
        }
      } catch {}
      
      console.log('✅ Normalized webhook data:', normalized);
      
      // Respond immediately to avoid Helcim timeout, process asynchronously
      try { res.json({ received: true }); } catch {}
      try {
        setImmediate(async () => {
          try {
            await (terminalService as any).handleWebhook(normalized);
          } catch (err) {
            try { console.error('❌ Async helcim webhook processing error:', err); } catch {}
          }
        });
      } catch (e) {
        try { (terminalService as any).handleWebhook(normalized).catch(() => {}); } catch {}
      }
      return;
    } catch (error: any) {
      console.error('❌ Error handling Helcim webhook:', error);
      return res.status(400).json({ received: false });
    }
  };

  router.post('/webhook', handler);
  router.post('/webhook/payment-success', handler);
  router.post('/webhook/payment-failed', handler);
  // Legacy/alternate alias (some older configs may still call this path)
  router.post('/smart-terminal/webhook', handler);
  // Minimal confirmation endpoints that accept any POST and mark last completed
  router.post('/webhook/success', (req: any, res: any) => {
    try {
      const id = String((req.body && (req.body.id || req.body.transactionId)) || req.query.id || Date.now());
      try {
        (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__ = {
          status: 'completed',
          transactionId: id,
          updatedAt: Date.now(),
        };
      } catch {}
      try { (storage as any).__terminalService?.handleWebhook?.({ id, transactionId: id, type: 'cardTransaction', approved: true }); } catch {}
      return res.json({ received: true });
    } catch {
      return res.json({ received: true });
    }
  });
  // Health/simple GET success confirmation for quick tests
  router.get('/webhook/success', (_req, res) => res.json({ received: true }));
  router.get('/webhook/health', (_req, res) => res.json({ status: 'ok' }));

  return router;
}



