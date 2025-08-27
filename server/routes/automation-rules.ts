import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { insertAutomationRuleSchema } from "../../shared/schema.js";
import { z } from "zod";
import { asyncHandler } from "../utils/errors.js";
import { AutomationService } from "../automation-service.js";

const updateAutomationRuleSchema = insertAutomationRuleSchema.partial();

export function registerAutomationRuleRoutes(app: Express, storage: IStorage) {
  // List all automation rules
  app.get("/api/automation-rules", asyncHandler(async (_req: Request, res: Response) => {
    const rules = await storage.getAllAutomationRules();
    res.json(rules);
  }));

  // Create a new automation rule
  app.post("/api/automation-rules", asyncHandler(async (req: Request, res: Response) => {
    const data = insertAutomationRuleSchema.parse(req.body);
    const created = await storage.createAutomationRule(data as any);
    res.status(201).json(created);
  }));

  // Update an automation rule
  app.put("/api/automation-rules/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid rule id" });
    }
    const updateData = updateAutomationRuleSchema.parse(req.body);
    const updated = await storage.updateAutomationRule(id, updateData as any);
    if (!updated) {
      return res.status(404).json({ error: "Automation rule not found" });
    }
    res.json(updated);
  }));

  // Delete an automation rule
  app.delete("/api/automation-rules/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid rule id" });
    }
    const ok = await storage.deleteAutomationRule(id);
    if (!ok) {
      return res.status(404).json({ error: "Automation rule not found" });
    }
    res.json({ success: true });
  }));

  // Manually trigger automations for a specific appointment (for testing)
  // Body: { appointmentId: number, trigger?: string, customTriggerName?: string }
  app.post("/api/automation-rules/trigger", asyncHandler(async (req: Request, res: Response) => {
    const bodySchema = z.object({
      appointmentId: z.number(),
      trigger: z.enum([
        "booking_confirmation",
        "appointment_reminder",
        "follow_up",
        "cancellation",
        "no_show",
        "after_payment",
        "custom"
      ]).optional(),
      customTriggerName: z.string().optional()
    });

    const { appointmentId, trigger, customTriggerName } = bodySchema.parse(req.body);

    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Build automation context
    const context = {
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      startTime: new Date(appointment.startTime).toISOString(),
      endTime: new Date(appointment.endTime).toISOString(),
      status: appointment.status,
    };

    const service = new AutomationService(storage);

    // Determine trigger if not provided
    const resolvedTrigger = trigger || (customTriggerName ? "custom" : "booking_confirmation");

    await service.triggerAutomations(resolvedTrigger as any, context, customTriggerName);

    res.json({ success: true, trigger: resolvedTrigger, appointmentId });
  }));
}


