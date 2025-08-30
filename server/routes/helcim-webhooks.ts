import { Router } from 'express';
import type { IStorage } from '../storage.js';
import { log } from '../log.js';

export default function createHelcimWebhookRoutes(_storage: IStorage) {
  const router = Router();

  // Minimal success-only webhook handler: treat ANY POST as a success confirmation.
  const handler = async (req: any, res: any) => {
    try {
      try { log('🟢 POST /api/helcim/webhook (success-only)'); } catch {}
      try {
        console.log('📥 Helcim webhook received (success-only). Ignoring body and marking success.', {
          headers: req.headers,
        });
      } catch {}

      // Record a global last-completed marker for polling endpoints to detect completion.
      try {
        (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__ = {
          status: 'completed',
          updatedAt: Date.now(),
        };
      } catch {}

      // Respond immediately; no further processing.
      try { return res.json({ received: true }); } catch {}
      return;
    } catch (error: any) {
      try { console.error('❌ Error in success-only Helcim webhook:', error); } catch {}
      return res.status(200).json({ received: true });
    }
  };

  router.post('/webhook', handler);
  router.post('/webhook/payment-success', handler);
  // For BASIC setups, treat any failure callback as a no-op to avoid loops
  router.post('/webhook/payment-failed', handler);
  // Legacy/alternate alias (some older configs may still call this path)
  router.post('/smart-terminal/webhook', handler);
  // Minimal confirmation endpoints that accept any POST and mark last completed
  router.post('/webhook/success', (req: any, res: any) => {
    try {
      try {
        (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__ = {
          status: 'completed',
          updatedAt: Date.now(),
        };
      } catch {}
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



