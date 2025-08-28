import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { insertAutomationRuleSchema } from "../../shared/schema.js";
import { z } from "zod";
import { asyncHandler } from "../utils/errors.js";
import { AutomationService } from "../automation-service.js";
import { triggerAutomations } from "../automation-triggers.js";

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

  // Manually trigger automations (for testing)
  // Body: { appointmentId?: number, testEmail?: string, trigger?: string, customTriggerName?: string }
  app.post("/api/automation-rules/trigger", asyncHandler(async (req: Request, res: Response) => {
    const bodySchema = z.object({
      appointmentId: z.number().optional(),
      testEmail: z.string().email().optional(),
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
    }).refine(v => (typeof v.appointmentId === 'number' && !Number.isNaN(v.appointmentId as any)) || !!v.testEmail, {
      message: 'appointmentId or testEmail is required'
    });

    const { appointmentId, testEmail, trigger, customTriggerName } = bodySchema.parse(req.body);
    const locationIdRaw = (req.body as any)?.locationId;
    const locationId = locationIdRaw != null ? parseInt(String(locationIdRaw)) : undefined;

    // Determine trigger if not provided
    const resolvedTrigger = trigger || (customTriggerName ? "custom" : "booking_confirmation");

    // If testEmail provided, run in test mode without requiring an appointment
    if (testEmail && (appointmentId == null || Number.isNaN(Number(appointmentId)))) {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      await triggerAutomations(resolvedTrigger as any, {
        id: 0,
        clientId: 0,
        serviceId: 0,
        staffId: 0,
        startTime: now.toISOString(),
        endTime: inOneHour.toISOString(),
        status: 'test',
        testEmail,
        locationId: Number.isFinite(locationId as any) ? (locationId as number) : undefined,
      } as any, storage, customTriggerName);
      return res.json({ success: true, trigger: resolvedTrigger, testEmail });
    }

    // Otherwise require a real appointment
    const apptId = Number(appointmentId);
    if (Number.isNaN(apptId)) {
      return res.status(400).json({ error: 'Invalid appointmentId' });
    }
    const appointment = await storage.getAppointment(apptId);
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

    await service.triggerAutomations(resolvedTrigger as any, context, customTriggerName);

    res.json({ success: true, trigger: resolvedTrigger, appointmentId: apptId });
  }));
}


