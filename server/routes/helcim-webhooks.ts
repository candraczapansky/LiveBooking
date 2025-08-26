import { Router } from 'express';
import type { IStorage } from '../storage.js';
import { TerminalConfigService } from '../services/terminal-config-service.js';
import { HelcimTerminalService } from '../services/helcim-terminal-service.js';
import { log } from '../vite.js';

export default function createHelcimWebhookRoutes(storage: IStorage) {
  const router = Router();
  const configService = new TerminalConfigService(storage);
  const terminalService = new HelcimTerminalService(configService);

  const handler = async (req: any, res: any) => {
    try {
      try { log('🟢 POST /api/helcim/webhook'); } catch {}
      let body: any = req.body || {};
      if (!body || (Object.keys(body).length === 0 && req.rawBody)) {
        try { body = JSON.parse(req.rawBody); } catch {}
      }
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
      let maybe: any = body?.payload ?? body?.data ?? body?.event ?? body;
      if (typeof maybe === 'string') { try { maybe = JSON.parse(maybe); } catch {} }
      const normalized = {
        invoiceNumber: maybe?.invoiceNumber || maybe?.invoice || maybe?.referenceNumber || maybe?.reference,
        transactionId: maybe?.transactionId || maybe?.id || maybe?.paymentId || body?.id,
        last4: maybe?.last4 || maybe?.cardLast4 || maybe?.card?.last4,
        status: maybe?.status || maybe?.result || maybe?.outcome,
      };
      await (terminalService as any).handleWebhook(normalized);
      return res.json({ received: true });
    } catch (error: any) {
      console.error('❌ Error handling Helcim webhook:', error);
      return res.status(400).json({ received: false });
    }
  };

  router.post('/webhook', handler);
  router.post('/webhook/payment-success', handler);
  router.post('/webhook/payment-failed', handler);
  router.get('/webhook/health', (_req, res) => res.json({ status: 'ok' }));

  return router;
}



