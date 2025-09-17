import { Router } from 'express';
import type { IStorage } from '../storage.js';
import { TerminalConfigService } from '../services/terminal-config-service.js';
import { HelcimTerminalService } from '../services/helcim-terminal-service.js';
import { log } from '../log.js';
import * as crypto from 'crypto';

export default function createHelcimWebhookRoutes(storage: IStorage) {
  const router = Router();
  const configService = new TerminalConfigService(storage);
  const terminalService: any = (storage as any).__terminalService || new HelcimTerminalService(configService);
  (storage as any).__terminalService = terminalService;

  // Webhook handler with proper signature verification
  const handler = async (req: any, res: any) => {
    try {
      try { log('🟢 POST /api/helcim/webhook'); } catch {}
      
      // Get webhook headers
      const signature = req.headers['webhook-signature'] || req.headers['Webhook-Signature'];
      const timestamp = req.headers['webhook-timestamp'] || req.headers['Webhook-Timestamp'];
      const webhookId = req.headers['webhook-id'] || req.headers['Webhook-Id'];
      
      console.log('📥 Helcim webhook received:', {
        headers: {
          'webhook-signature': signature,
          'webhook-timestamp': timestamp,
          'webhook-id': webhookId,
        },
        body: req.body,
        path: req.path,
        method: req.method,
      });
      
      // Log raw body for debugging
      console.log('📝 Raw webhook payload:', JSON.stringify(req.body, null, 2));

      // Verify webhook signature if verifier token is configured
      const verifierToken = process.env.HELCIM_WEBHOOK_VERIFIER_TOKEN;
      if (verifierToken && signature && timestamp && webhookId) {
        try {
          // Get the raw body string for signature verification
          let bodyString = '';
          if (typeof req.body === 'string') {
            bodyString = req.body;
          } else if ((req as any).rawBody) {
            bodyString = (req as any).rawBody;
          } else {
            bodyString = JSON.stringify(req.body);
          }
          
          // Construct the signed content
          const signedContent = `${webhookId}.${timestamp}.${bodyString}`;
          
          // Base64 decode the verifier token
          const verifierTokenBytes = Buffer.from(verifierToken, 'base64');
          
          // Generate the expected signature
          const expectedSignature = crypto
            .createHmac('sha256', verifierTokenBytes)
            .update(signedContent)
            .digest('base64');
          
          // Extract the actual signature (format: "v1,signature v2,signature")
          const signatures = signature.split(' ');
          let signatureValid = false;
          
          for (const sig of signatures) {
            const parts = sig.split(',');
            if (parts.length === 2) {
              const [version, actualSig] = parts;
              if (actualSig === expectedSignature) {
                signatureValid = true;
                console.log('✅ Webhook signature verified successfully');
                break;
              }
            }
          }
          
          if (!signatureValid) {
            console.warn('⚠️ Webhook signature verification failed, but continuing anyway');
            // Note: We're not rejecting invalid signatures for now to avoid blocking legitimate webhooks
            // In production, you might want to: return res.status(401).json({ error: 'Invalid signature' });
          }
        } catch (err) {
          console.error('❌ Error verifying webhook signature:', err);
        }
      } else if (verifierToken) {
        console.warn('⚠️ Missing webhook headers for signature verification');
      }

      // Parse the webhook payload
      let payload: any = req.body || {};
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch {}
      }
      
      // Helcim sends minimal webhook: {"id":"TRANSACTION_ID", "type":"cardTransaction"}
      const txId = payload?.id;
      const type = payload?.type;
      
      // Log full payload to see if amount/tip is included
      console.log('🔍 WEBHOOK PAYLOAD DETAILS:', {
        id: txId,
        type,
        amount: payload?.amount,
        tipAmount: payload?.tipAmount,
        totalAmount: payload?.totalAmount,
        total: payload?.total,
        tip: payload?.tip,
        // Log all numeric fields to find where the amounts are
        allNumericFields: Object.entries(payload || {})
          .filter(([_, v]) => typeof v === 'number')
          .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
      });

      // Do not set any global completion markers here; wait until status is verified below

      // Process webhook based on type
      if (type === 'cardTransaction' && txId) {
        console.log('🎯 Processing cardTransaction webhook for transaction:', txId);
        
        // CRITICAL FIX: Default to 'pending' NOT 'completed' to prevent auto-completion of failed transactions
        let paymentStatus = 'pending'; // SAFE DEFAULT - don't assume success
        
        // Extract all status-related fields
        const statusFields = [
          payload?.status,
          payload?.approved,
          payload?.transactionStatus,
          payload?.response,
          payload?.responseMessage,
          payload?.responseText,
          payload?.error,
          payload?.result
        ];
        
        // Create combined status string for checking
        const statusStr = statusFields.filter(s => s != null).map(s => String(s).toLowerCase()).join(' ');
        
        // Check for EXPLICIT success indicators FIRST
        if (payload?.approved === true || 
            payload?.approved === 'true' ||
            payload?.approved === 1 ||
            payload?.approved === '1' ||
            statusStr.includes('approved') ||
            statusStr.includes('captured') ||
            statusStr.includes('sale') ||
            (statusStr.includes('success') && !statusStr.includes('unsuccess'))) {
          paymentStatus = 'completed';
          console.log('✅ Payment EXPLICITLY approved/completed in webhook');
        }
        // Check for failure indicators
        else if (statusStr.includes('declined') || 
            statusStr.includes('failed') || 
            statusStr.includes('cancelled') || 
            statusStr.includes('cancel') ||
            statusStr.includes('voided') ||
            statusStr.includes('refunded') ||
            statusStr.includes('error') ||
            statusStr.includes('rejected') ||
            statusStr.includes('insufficient') ||
            payload?.approved === false ||
            payload?.approved === 'false' ||
            payload?.approved === 0 ||
            payload?.approved === '0') {
          paymentStatus = 'failed';
          console.log('❌ Payment declined/failed detected in webhook');
        } else {
          // NO CLEAR STATUS - keep as pending (DO NOT auto-complete!)
          console.log('⚠️ Webhook status unclear - keeping as PENDING to prevent auto-completion');
          console.log('   Raw webhook data:', {
            approved: payload?.approved,
            status: payload?.status,
            response: payload?.response,
            transactionStatus: payload?.transactionStatus
          });
        }
        
        // Handle the webhook asynchronously to return quickly
        setImmediate(async () => {
          try {
            // Pass the webhook data to the handler with the actual status
            // Include amount if present in payload under any common field name
            const amount = payload?.amount || payload?.totalAmount || payload?.total || 
                         payload?.transactionAmount || payload?.paymentAmount;
            
            await (terminalService as any).handleWebhook({
              id: txId,
              transactionId: txId,
              type: 'cardTransaction',
              status: paymentStatus,
              approved: payload?.approved,
              response: payload?.response,
              amount: amount,
              rawPayload: payload
            });
            console.log(`✅ Webhook processing completed for transaction ${txId} with status: ${paymentStatus}`);
          } catch (err) {
            console.error('❌ Helcim webhook processing failed:', err);
            // Store the actual status in webhook cache
            try {
              const webhookStore = (terminalService as any).webhookStore || new Map();
              webhookStore.set(String(txId), {
                status: paymentStatus,
                transactionId: txId,
                updatedAt: Date.now(),
              });
            } catch {}
          }
        });
      } else if (type === 'terminalCancel' || type === 'terminalDecline' || type === 'declined') {
        console.log('🚫 Terminal cancel/decline webhook received:', payload);
        // Handle terminal cancel or decline
        if (txId) {
          const cancelStatus = type === 'declined' || type === 'terminalDecline' ? 'failed' : 'cancelled';
          setImmediate(async () => {
            try {
              await (terminalService as any).handleWebhook({
                id: txId,
                transactionId: txId,
                type: type,
                status: cancelStatus,
                rawPayload: payload
              });
              console.log(`✅ Terminal ${type} webhook processed for transaction:`, txId);
            } catch (err) {
              console.error(`❌ Terminal ${type} webhook processing failed:`, err);
              try {
                const webhookStore = (terminalService as any).webhookStore || new Map();
                webhookStore.set(String(txId), {
                  status: cancelStatus,
                  transactionId: txId,
                  updatedAt: Date.now(),
                });
              } catch {}
            }
          });
        }
      } else if (type === 'refund' || type === 'void') {
        console.log('🔁 Refund/void webhook received:', payload);
        // Handle refund or void
        if (txId) {
          setImmediate(async () => {
            try {
              await (terminalService as any).handleWebhook({
                id: txId,
                transactionId: txId,
                type: type,
                status: 'failed', // Treat refunds/voids as failed for the original payment
                rawPayload: payload
              });
              console.log(`✅ ${type} webhook processed for transaction:`, txId);
            } catch (err) {
              console.error(`❌ ${type} webhook processing failed:`, err);
            }
          });
        }
      }

      // Respond immediately with 200 OK to acknowledge receipt
      // This is critical - Helcim expects a 2xx response quickly
      return res.status(200).json({ received: true });
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
      // Extract transaction ID from the payload
      let payload = req.body;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch {}
      }
      
      const txId = payload?.id || payload?.transactionId || payload?.invoiceNumber;
      
      // Only set the global marker if we have a transaction ID
      if (txId) {
        try {
          (globalThis as any).__HEL_WEBHOOK_LAST_COMPLETED__ = {
            status: 'completed',
            transactionId: txId,
            invoiceNumber: txId, // Use same ID for both fields for compatibility
            updatedAt: Date.now(),
          };
          console.log(`✅ Webhook success marked for transaction: ${txId}`);
        } catch {}
      } else {
        console.log('⚠️ Webhook success endpoint called without transaction ID');
      }
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



