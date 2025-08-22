import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { SMSAutoRespondService } from "../sms-auto-respond-service.js";

export function registerSmsAutoRespondRoutes(app: Express, storage: IStorage) {
  const smsService = SMSAutoRespondService.getInstance(storage);

  // Health
  app.get('/api/sms-auto-respond/health', async (_req: Request, res: Response) => {
    try {
      const result = await smsService.healthCheck();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ status: 'unhealthy', issues: [err.message || 'Health check failed'] });
    }
  });

  // Configuration
  app.get('/api/sms-auto-respond/config', (_req: Request, res: Response) => {
    try {
      const cfg = smsService.getConfig();
      res.json(cfg);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch config' });
    }
  });

  app.put('/api/sms-auto-respond/config', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        enabled: z.boolean().optional(),
        confidenceThreshold: z.number().min(0).max(1).optional(),
        maxResponseLength: z.number().min(50).max(500).optional(),
        businessHoursOnly: z.boolean().optional(),
        businessHours: z.object({
          start: z.string(),
          end: z.string(),
          timezone: z.string()
        }).partial().optional(),
        excludedKeywords: z.array(z.string()).optional(),
        excludedPhoneNumbers: z.array(z.string()).optional()
      });
      const payload = schema.parse(req.body);
      // Merge nested businessHours against current config to satisfy type requirements
      const current = smsService.getConfig();
      const mergedPayload: Partial<{
        enabled: boolean;
        confidenceThreshold: number;
        maxResponseLength: number;
        businessHoursOnly: boolean;
        businessHours: { start: string; end: string; timezone: string };
        excludedKeywords: string[];
        excludedPhoneNumbers: string[];
      }> = { ...payload } as any;
      if (payload.businessHours) {
        mergedPayload.businessHours = {
          ...current.businessHours,
          ...payload.businessHours
        } as { start: string; end: string; timezone: string };
      }
      await smsService.updateConfig(mergedPayload as any);
      res.json(smsService.getConfig());
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update config' });
    }
  });

  app.put('/api/sms-auto-respond/phone-numbers', async (req: Request, res: Response) => {
    try {
      const schema = z.object({ phoneNumbers: z.array(z.string().min(3)) });
      const { phoneNumbers } = schema.parse(req.body);
      await smsService.updateAutoRespondPhoneNumbers(phoneNumbers);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update phone numbers' });
    }
  });

  // Stats
  app.get('/api/sms-auto-respond/stats', async (_req: Request, res: Response) => {
    try {
      const stats = await smsService.getStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch stats' });
    }
  });

  // Conversation flows (in-memory)
  app.get('/api/sms-auto-respond/conversation-flows', (_req: Request, res: Response) => {
    try {
      const flowsMap = (smsService as any).conversationFlows as Map<string, any> | undefined;
      const flows = flowsMap ? Array.from(flowsMap.values()) : [];
      res.json(flows);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch flows' });
    }
  });

  app.post('/api/sms-auto-respond/conversation-flows', (req: Request, res: Response) => {
    try {
      const schema = z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        description: z.string().default(''),
        steps: z.array(z.any()).default([]),
        isActive: z.boolean().default(true)
      });
      const flow = schema.parse(req.body);
      const id = flow.id && flow.id.trim() ? flow.id : `cf-${Date.now()}`;
      const flowsMap = (smsService as any).conversationFlows as Map<string, any>;
      flowsMap.set(id, {
        ...flow,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      res.status(201).json(flowsMap.get(id));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to save flow' });
    }
  });

  app.put('/api/sms-auto-respond/conversation-flows', (req: Request, res: Response) => {
    try {
      const schema = z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().default(''),
        steps: z.array(z.any()).default([]),
        isActive: z.boolean().default(true)
      });
      const flow = schema.parse(req.body);
      const flowsMap = (smsService as any).conversationFlows as Map<string, any>;
      if (!flowsMap.has(flow.id)) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      flowsMap.set(flow.id, { ...flow, updatedAt: new Date().toISOString() });
      res.json(flowsMap.get(flow.id));
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update flow' });
    }
  });

  app.delete('/api/sms-auto-respond/conversation-flows/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const flowsMap = (smsService as any).conversationFlows as Map<string, any>;
      const existed = flowsMap.delete(id);
      if (!existed) return res.status(404).json({ error: 'Flow not found' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete flow' });
    }
  });

  // Test endpoint
  app.post('/api/sms-auto-respond/test', async (req: Request, res: Response) => {
    try {
      const schema = z.object({ from: z.string(), to: z.string(), body: z.string() });
      const { from, to, body } = schema.parse(req.body);
      const result = await smsService.processIncomingSMS({
        from,
        to,
        body,
        timestamp: new Date().toISOString(),
        messageId: `test_${Date.now()}`
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Test failed' });
    }
  });

  // Twilio webhook (production)
  app.post('/api/sms-auto-respond/webhook', async (req: Request, res: Response) => {
    try {
      // Twilio sends urlencoded body: From, To, Body, MessageSid
      const from = (req.body.From || req.body.from || '').toString();
      const to = (req.body.To || req.body.to || '').toString();
      const body = (req.body.Body || req.body.body || '').toString();
      const messageId = (req.body.MessageSid || req.body.messageId || `sid_${Date.now()}`).toString();

      if (!from || !to || !body) {
        return res.status(400).send('Missing parameters');
      }

      await smsService.processIncomingSMS({
        from,
        to,
        body,
        timestamp: new Date().toISOString(),
        messageId
      });

      // We send our own SMS replies via API; return minimal TwiML response
      res.set('Content-Type', 'text/xml');
      res.send('<Response></Response>');
    } catch (err: any) {
      res.status(500).send('<Response></Response>');
    }
  });

  // Aliases for common Twilio webhook paths (backward compatibility)
  app.post(['/sms', '/sms/webhook', '/api/sms/webhook'], async (req: Request, res: Response) => {
    try {
      const from = (req.body.From || req.body.from || '').toString();
      const to = (req.body.To || req.body.to || '').toString();
      const body = (req.body.Body || req.body.body || '').toString();
      const messageId = (req.body.MessageSid || req.body.messageId || `sid_${Date.now()}`).toString();

      if (!from || !to || !body) {
        return res.status(400).send('<Response></Response>');
      }

      await smsService.processIncomingSMS({
        from,
        to,
        body,
        timestamp: new Date().toISOString(),
        messageId
      });

      res.set('Content-Type', 'text/xml');
      res.send('<Response></Response>');
    } catch {
      res.status(500).send('<Response></Response>');
    }
  });

  // Simple readiness check for configuring Twilio console
  app.get('/api/sms-auto-respond/webhook', (_req: Request, res: Response) => {
    res.type('text/plain').send('SMS webhook ready');
  });
}


