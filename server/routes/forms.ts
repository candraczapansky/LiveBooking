import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { insertFormSchema } from "../../shared/schema.js";
import { asyncHandler } from "../utils/errors.js";
import { validateRequest } from "../middleware/error-handler.js";
import { sendSMS } from "../sms.js";
import { getFormPublicUrl } from "../utils/url.js";

// Schema for form submission (public endpoint)
const formSubmissionSchema = z.object({
  formData: z.record(z.any()),
  submittedAt: z.union([z.string(), z.date()]),
  clientId: z.union([z.number(), z.string().regex(/^\d+$/)]).optional(),
});

// Schema for sending a form link via SMS
const sendFormSMSSchema = z.object({
  clientId: z.union([z.number(), z.string().regex(/^\d+$/)]).optional(),
  phone: z.string().optional(),
  customMessage: z.string().optional(),
}).refine((data) => !!(data.clientId || data.phone), {
  message: "Either clientId or phone is required",
});

export function registerFormsRoutes(app: Express, storage: IStorage) {
  // Get all forms
  app.get("/api/forms", asyncHandler(async (_req: Request, res: Response) => {
    const forms = await storage.getAllForms();
    res.json(forms);
  }));

  // Create a new form
  app.post("/api/forms", validateRequest(insertFormSchema), asyncHandler(async (req: Request, res: Response) => {
    // Storage layer handles fields JSON conversion and robust parsing
    const created = await storage.createForm(req.body);
    res.status(201).json(created);
  }));

  // Get a single form by ID
  app.get("/api/forms/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid form id" });
    }
    const form = await storage.getForm(id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    res.json(form);
  }));

  // Update a form
  app.put("/api/forms/:id", validateRequest(insertFormSchema.partial()), asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid form id" });
    }
    const updated = await storage.updateForm(id, req.body);
    res.json(updated);
  }));

  // Delete a form
  app.delete("/api/forms/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid form id" });
    }
    const ok = await storage.deleteForm(id);
    if (!ok) {
      return res.status(404).json({ error: "Form not found" });
    }
    res.json({ success: true });
  }));

  // Get submissions for a form
  app.get("/api/forms/:id/submissions", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid form id" });
    }
    const submissions = await storage.getFormSubmissions(id);
    res.json(submissions);
  }));

  // Submit a form (public)
  app.post("/api/forms/:id/submit", asyncHandler(async (req: Request, res: Response) => {
    const parseResult = formSubmissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid submission payload", details: parseResult.error.flatten() });
    }

    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid form id" });
    }

    const form = await storage.getForm(id);
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    const { formData, submittedAt, clientId } = parseResult.data as any;
    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.ip;
    const userAgent = req.headers["user-agent"] as string | undefined;

    await storage.saveFormSubmission({
      formId: id,
      clientId: clientId ? Number(clientId) : undefined,
      formData,
      submittedAt: submittedAt instanceof Date ? submittedAt : new Date(submittedAt),
      ipAddress,
      userAgent,
    });

    // Update form submission counters safely
    const currentCount = form.submissions ?? 0;
    await storage.updateFormSubmissions(id, currentCount + 1, new Date());

    res.status(201).json({ success: true });
  }));

  // Send form link via SMS
  app.post("/api/forms/:id/send-sms", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid form id" });
    }

    const parseResult = sendFormSMSSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request payload", details: parseResult.error.flatten() });
    }

    const { clientId, phone, customMessage } = parseResult.data as any;

    let destinationPhone: string | undefined = undefined;
    let resolvedClientId: number | undefined = undefined;

    if (clientId) {
      const numericClientId = Number(clientId);
      const user = await storage.getUser(numericClientId);
      if (!user || !user.phone) {
        return res.status(400).json({ error: "Selected client does not have a phone number" });
      }
      destinationPhone = user.phone;
      resolvedClientId = numericClientId;
    } else if (phone) {
      destinationPhone = phone as string;
    }

    if (!destinationPhone) {
      return res.status(400).json({ error: "No destination phone number provided" });
    }

    const publicUrl = getFormPublicUrl(id, resolvedClientId);
    const message = customMessage && customMessage.trim().length > 0
      ? `${customMessage.trim()}\n\n${publicUrl}`
      : `You have a new form to complete. Please tap the link: ${publicUrl}`;

    const result = await sendSMS(destinationPhone, message);
    if (!result.success) {
      return res.status(500).json({ error: result.error || "Failed to send SMS" });
    }

    res.json({ success: true, messageId: result.messageId });
  }));
}


