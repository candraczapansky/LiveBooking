import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { sendSMS } from "../sms.js";

export function registerSmsMessagingRoutes(app: Express, storage: IStorage) {
  app.get("/api/sms/conversations", async (_req: Request, res: Response) => {
    try {
      const list = await storage.getSMSConversations();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to load SMS conversations" });
    }
  });

  app.get("/api/sms/messages", async (req: Request, res: Response) => {
    try {
      const clientId = req.query.clientId ? parseInt(String(req.query.clientId)) : undefined;
      const phone = req.query.phone ? String(req.query.phone) : undefined;
      const msgs = await storage.getSMSMessages(clientId, phone, 500);
      res.json([...msgs].reverse());
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to load messages" });
    }
  });

  app.post("/api/sms/send", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        clientId: z.number().optional(),
        phone: z.string().optional(),
        message: z.string().min(1),
      }).refine(d => !!(d.clientId || d.phone), { message: "clientId or phone required" });

      const { clientId, phone, message } = schema.parse(req.body);

      let toPhone = phone;
      let client: any = null;
      if (clientId && !toPhone) {
        client = await storage.getUser(clientId);
        if (!client?.phone) {
          return res.status(400).json({ error: "Client phone not found" });
        }
        toPhone = client.phone;
      }

      const result = await sendSMS(toPhone!, message);
      try {
        await storage.createSMSMessage({
          clientId: clientId ?? (client?.id ?? null),
          from: 'twilio',
          to: toPhone!,
          body: message,
          direction: 'outbound',
          messageSid: (result as any)?.messageId,
          status: result?.success ? 'sent' : 'failed',
          errorMessage: result?.success ? null : (result?.error || null),
        } as any);
      } catch (e) {
        console.warn('Failed to log outbound SMS:', (e as any)?.message || e);
      }

      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error || "Failed to send SMS" });
      }
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || "Invalid request" });
    }
  });
}



