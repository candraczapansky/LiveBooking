import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { LLMService } from "../llm-service.js";
import { sendEmail } from "../email.js";
import { sendSMS } from "../sms.js";

export function registerLLMRoutes(app: Express, storage: IStorage) {
  const llmService = new LLMService(storage);

  app.post("/api/llm/generate-response", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        clientMessage: z.string().min(1),
        clientId: z.number().optional().nullable(),
        channel: z.enum(["email", "sms"]).default("email"),
      });
      const { clientMessage, clientId, channel } = schema.parse(req.body);

      const [services, staff, knowledge] = await Promise.all([
        storage.getAllServices(),
        storage.getAllStaff(),
        storage.getBusinessKnowledge(),
      ]);

      let client: any = null;
      if (clientId) client = await storage.getUser(clientId);

      const history: Array<{ role: "user" | "assistant" | "system"; content: string; timestamp: Date }> = [];
      if (clientId) {
        const past = await storage.getLLMConversations(clientId);
        for (const conv of past.slice(-3)) {
          history.push({ role: "user", content: conv.clientMessage, timestamp: conv.createdAt });
          history.push({ role: "assistant", content: conv.aiResponse, timestamp: conv.createdAt });
        }
      }

      const context = {
        clientName: client ? `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.username : undefined,
        clientEmail: client?.email,
        clientPhone: client?.phone,
        conversationHistory: history,
        clientPreferences: client
          ? {
              emailAccountManagement: !!client.emailAccountManagement,
              emailAppointmentReminders: !!client.emailAppointmentReminders,
              emailPromotions: !!client.emailPromotions,
              smsAccountManagement: !!client.smsAccountManagement,
              smsAppointmentReminders: !!client.smsAppointmentReminders,
              smsPromotions: !!client.smsPromotions,
            }
          : undefined,
        availableServices: services.map((s: any) => ({
          name: s.name,
          description: s.description || undefined,
          price: s.price ?? undefined,
          duration: s.duration ?? undefined,
        })),
        availableStaff: staff.map((st: any) => ({
          name: st.user ? `${st.user.firstName || ""} ${st.user.lastName || ""}`.trim() : "Staff",
          title: st.title || undefined,
          bio: st.bio || undefined,
        })),
        businessKnowledge: knowledge.map((k: any) => ({
          category: k.category,
          title: k.title,
          content: k.content,
          keywords: k.keywords || undefined,
          priority: k.priority ?? 1,
        })),
      } as any;

      const result = await llmService.generateResponse(clientMessage, context, channel);
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error || "LLM failed" });
      }

      const responseText = result.message || "";
      if (clientId) {
        await llmService.saveConversation(clientId, clientMessage, responseText, channel, {
          confidence: result.confidence,
          suggestedActions: result.suggestedActions,
        });
      }

      return res.json({
        success: true,
        response: responseText,
        suggestedActions: result.suggestedActions ?? [],
        confidence: result.confidence ?? 0.8,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || "Bad request" });
    }
  });

  app.post("/api/llm/test", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        message: z.string().min(1),
        businessKnowledge: z
          .array(z.object({ question: z.string(), answer: z.string(), category: z.string().optional() }))
          .optional(),
      });
      const { message, businessKnowledge } = schema.parse(req.body);

      const [services, staff] = await Promise.all([storage.getAllServices(), storage.getAllStaff()]);

      const context: any = {
        availableServices: services.map((s: any) => ({ name: s.name, description: s.description || undefined })),
        availableStaff: staff.map((st: any) => ({
          name: st.user ? `${st.user.firstName || ""} ${st.user.lastName || ""}`.trim() : "Staff",
          title: st.title || undefined,
        })),
        businessKnowledge: (businessKnowledge || []).map((k) => ({
          category: k.category || "general",
          title: k.question,
          content: k.answer,
          priority: 1,
        })),
      };

      const result = await llmService.generateResponse(message, context, "email");
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error || "LLM failed" });
      }

      return res.json({
        success: true,
        response: result.message || "",
        confidence: result.confidence ?? 0.8,
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || "Bad request" });
    }
  });

  app.get("/api/llm/conversations", async (req: Request, res: Response) => {
    try {
      const clientId = req.query.clientId ? parseInt(String(req.query.clientId)) : undefined;
      const conversations = await storage.getLLMConversations(clientId);

      const out = await Promise.all(
        conversations.map(async (c: any) => {
          const user = c.clientId ? await storage.getUser(c.clientId) : null;
          const name =
            user && (user.firstName || user.lastName)
              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
              : user?.username || "Unknown";
          return {
            id: c.id,
            clientId: c.clientId,
            clientName: name,
            clientEmail: user?.email || null,
            channel: c.channel,
            status: "responded",
            confidence: c.confidence ?? 0.8,
            clientMessage: c.clientMessage,
            lastMessage: c.aiResponse,
            createdAt: c.createdAt,
          };
        })
      );

      return res.json(out);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch conversations" });
    }
  });

  app.post("/api/llm/send-email", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        clientId: z.string().min(1),
        clientMessage: z.string().min(1),
        aiResponse: z.string().min(1),
        subject: z.string().optional(),
      });
      const { clientId, clientMessage, aiResponse, subject } = schema.parse(req.body);

      const client = await storage.getUser(parseInt(clientId));
      if (!client?.email) {
        return res.status(400).json({ success: false, error: "Client email not found" });
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <p><strong>Your message:</strong></p>
          <p style="background:#f8f8f8;padding:10px;border-left:4px solid #ddd;">${clientMessage}</p>
          <p><strong>Our response:</strong></p>
          <p style="background:#eef9f0;padding:10px;border-left:4px solid #22c55e;">${aiResponse.replace(/\n/g, '<br>')}</p>
        </div>`;

      await sendEmail({
        to: client.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
        subject: subject || 'Response from Glo Head Spa',
        html,
        text: `Your message:\n${clientMessage}\n\nOur response:\n${aiResponse}`,
      });

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || "Failed to send email" });
    }
  });

  app.post("/api/llm/send-sms", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        clientId: z.string().min(1),
        clientMessage: z.string().min(1),
        aiResponse: z.string().min(1),
      });
      const { clientId, aiResponse } = schema.parse(req.body);

      const client = await storage.getUser(parseInt(clientId));
      if (!client?.phone) {
        return res.status(400).json({ success: false, error: "Client phone not found" });
      }

      const result = await sendSMS(client.phone, aiResponse);
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error || "Failed to send SMS" });
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || "Failed to send SMS" });
    }
  });
}


