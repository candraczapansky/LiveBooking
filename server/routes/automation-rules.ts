import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { insertAutomationRuleSchema } from "../../shared/schema.js";
import { z } from "zod";
import { asyncHandler } from "../utils/errors.js";
import { AutomationService } from "../automation-service.js";
import { triggerAutomations } from "../automation-triggers.js";
import { sendLocationMessage, upsertLocationTemplate } from "../location-messenger.js";

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
  // Body: { appointmentId?: number, testEmail?: string, testPhone?: string, trigger?: string, customTriggerName?: string }
  app.post("/api/automation-rules/trigger", asyncHandler(async (req: Request, res: Response) => {
    const bodySchema = z.object({
      appointmentId: z.number().optional(),
      testEmail: z.string().email().optional(),
      testPhone: z.string().optional(),
      ruleId: z.number().optional(),
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
    }).refine(v => (typeof v.appointmentId === 'number' && !Number.isNaN(v.appointmentId as any)) || !!v.testEmail || !!v.testPhone, {
      message: 'appointmentId or testEmail or testPhone is required'
    });

    const { appointmentId, testEmail, testPhone, trigger, customTriggerName, ruleId } = bodySchema.parse(req.body);
    const locationIdRaw = (req.body as any)?.locationId;
    const locationId = locationIdRaw != null ? parseInt(String(locationIdRaw)) : undefined;

    // Determine trigger if not provided
    const resolvedTrigger = trigger || (customTriggerName ? "custom" : "booking_confirmation");

    // If testEmail/testPhone provided, run in test mode without requiring an appointment
    if ((testEmail || testPhone) && (appointmentId == null || Number.isNaN(Number(appointmentId)))) {
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
        testPhone,
        locationId: Number.isFinite(locationId as any) ? (locationId as number) : undefined,
        __testRuleId: Number.isFinite(ruleId as any) ? (ruleId as number) : undefined,
      } as any, storage, customTriggerName);
      return res.json({ success: true, trigger: resolvedTrigger, testEmail, testPhone });
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

  // Bootstrap: ensure the 4 location-specific after_payment review SMS rules exist
  app.post("/api/automation-rules/bootstrap-review-sms", asyncHandler(async (_req: Request, res: Response) => {
    const TEMPLATE = "Hi there {client_first_name}! We want to thank you for visiting us today! If you were unsatisfied with your appointment in any way please call us so we can help! If you loved your service, would you please leave us a review if you have the time? {review_link}. {business_phone_number}";

    const ensure = async (name: string) => {
      const all = await (storage as any).getAllAutomationRules();
      const exists = Array.isArray(all) && (all as any[]).some((r: any) => String(r.name).toLowerCase() === name.toLowerCase());
      if (!exists) {
        await storage.createAutomationRule({
          name,
          type: 'sms' as any,
          trigger: 'after_payment' as any,
          timing: '2_hours_after',
          template: TEMPLATE,
          active: true,
        } as any);
      }
    };

    await ensure('Thank You SMS [location:Flutter]');
    await ensure('Thank You SMS [location:The Extensionist]');
    await ensure('Thank You SMS [location:GloUp]');
    await ensure('Thank You SMS [location:Glo Head Spa]');

    res.json({ success: true });
  }));

  // Send a one-off test review SMS to a given number for a given location
  // Body: { to: string, location: string, firstName?: string }
  app.post("/api/automation-rules/test-review-sms", asyncHandler(async (req: Request, res: Response) => {
    const to = (req.body?.to || '').toString().trim();
    const locationNameRaw = (req.body?.location || '').toString().trim();
    const firstName = (req.body?.firstName || 'there').toString().trim();
    if (!to || !locationNameRaw) return res.status(400).json({ error: 'to and location are required' });

    const locLower = locationNameRaw.toLowerCase();
    // Map to stable keys for our location messenger config
    const locationKey = locLower.includes('flutter') ? 'flutter'
      : locLower.includes('extensionist') ? 'the_extensionist'
      : locLower.includes('gloup') ? 'gloup'
      : locLower.includes('glo head spa') ? 'glo_head_spa'
      : 'global';

    // Upsert display names for nicer {locationName}
    try {
      const displayName = locationKey === 'the_extensionist' ? 'The Extensionist'
        : locationKey === 'gloup' ? 'GloUp'
        : locationKey === 'glo_head_spa' ? 'Glo Head Spa'
        : locationKey === 'flutter' ? 'Flutter'
        : 'Our Location';
      upsertLocationTemplate(locationKey, { name: displayName });
    } catch {}

    // Build review link and phone by location
    const reviewLink = locationKey === 'flutter' ? 'https://g.page/r/CVsPQrGuF_l1EAE/review'
      : locationKey === 'the_extensionist' ? 'https://g.page/r/Cb63DI0Siy4gEAE/review'
      : locationKey === 'gloup' ? 'https://g.page/r/CZgpVISFNvHDEAE/review'
      : locationKey === 'glo_head_spa' ? 'https://g.page/r/CY3ndFc_3Sm6EAE/review'
      : '';
    const businessPhone = locationKey === 'flutter' ? '918-940-2888'
      : locationKey === 'the_extensionist' ? '918-949-6299'
      : locationKey === 'gloup' ? '918-932-5396'
      : locationKey === 'glo_head_spa' ? '918-932-5396'
      : '';

    const body = `Hi there ${firstName}! We want to thank you for visiting us today! If you were unsatisfied with your appointment in any way please call us so we can help! If you loved your service, would you please leave us a review if you have the time? ${reviewLink}. ${businessPhone}`;

    const result = await sendLocationMessage({
      messageType: 'follow_up',
      locationId: locationKey,
      channel: 'sms',
      to: { phone: to, name: firstName },
      overrides: { body }
    });

    if (!result.success) return res.status(500).json({ success: false, error: result.error || 'send_failed' });
    res.json({ success: true, messageId: result.id });
  }));
}


