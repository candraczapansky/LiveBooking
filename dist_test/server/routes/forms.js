import { z } from "zod";
import { insertFormSchema } from "../../shared/schema.js";
import { asyncHandler } from "../utils/errors.js";
import { validateRequest } from "../middleware/error-handler.js";
import { sendSMS } from "../sms.js";
import { sendEmail } from "../email.js";
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
export function registerFormsRoutes(app, storage) {
    // Get all forms
    app.get("/api/forms", asyncHandler(async (_req, res) => {
        const forms = await storage.getAllForms();
        res.json(forms);
    }));
    // Create a new form
    app.post("/api/forms", validateRequest(insertFormSchema), asyncHandler(async (req, res) => {
        // Storage layer handles fields JSON conversion and robust parsing
        const created = await storage.createForm(req.body);
        res.status(201).json(created);
    }));
    // Get a single form by ID
    app.get("/api/forms/:id", asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid form id" });
        }
        const form = await storage.getForm(id);
        if (!form) {
            return res.status(404).json({ error: "Form not found" });
        }
        // Soft-upgrade signature fields for legacy forms that used a text field
        try {
            let fields;
            const raw = form.fields;
            if (Array.isArray(raw)) {
                fields = raw;
            }
            else if (typeof raw === 'string') {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed))
                        fields = parsed;
                }
                catch { }
            }
            if (Array.isArray(fields)) {
                const upgraded = fields.map((f) => {
                    const typeLower = String(f?.type || '').toLowerCase();
                    const label = String(f?.config?.label || f?.label || '').toLowerCase();
                    const placeholder = String(f?.config?.placeholder || f?.placeholder || '').toLowerCase();
                    const idLower = String(f?.id || '').toLowerCase();
                    const looksLikeSignature = typeLower.includes('signature') ||
                        label.includes('signature') ||
                        placeholder.includes('signature') ||
                        idLower.includes('signature') ||
                        /\bsign\b/.test(label) ||
                        /\bsign\b/.test(placeholder);
                    if (!looksLikeSignature)
                        return f;
                    const cfg = {
                        ...(f?.config || {}),
                        label: f?.config?.label || f?.label || 'Signature',
                        required: (f?.config?.required ?? f?.required) ?? false,
                        penColor: f?.config?.penColor || '#000000',
                        backgroundColor: f?.config?.backgroundColor || '#ffffff',
                    };
                    return { ...f, type: 'signature', config: cfg };
                });
                form.fields = upgraded;
            }
        }
        catch { }
        res.json(form);
    }));
    // Update a form
    app.put("/api/forms/:id", validateRequest(insertFormSchema.partial()), asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid form id" });
        }
        const updated = await storage.updateForm(id, req.body);
        res.json(updated);
    }));
    // Delete a form
    app.delete("/api/forms/:id", asyncHandler(async (req, res) => {
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
    app.get("/api/forms/:id/submissions", asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid form id" });
        }
        const submissions = await storage.getFormSubmissions(id);
        res.json(submissions);
    }));
    // Submit a form (public)
    app.post("/api/forms/:id/submit", asyncHandler(async (req, res) => {
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
        const { formData, submittedAt, clientId } = parseResult.data;
        const ipAddress = req.headers["x-forwarded-for"] || req.ip;
        const userAgent = req.headers["user-agent"];
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
    app.post("/api/forms/:id/send-sms", asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid form id" });
        }
        const parseResult = sendFormSMSSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: "Invalid request payload", details: parseResult.error.flatten() });
        }
        const { clientId, phone, customMessage } = parseResult.data;
        let destinationPhone = undefined;
        let resolvedClientId = undefined;
        if (clientId) {
            const numericClientId = Number(clientId);
            const user = await storage.getUser(numericClientId);
            if (!user || !user.phone) {
                return res.status(400).json({ error: "Selected client does not have a phone number" });
            }
            destinationPhone = user.phone;
            resolvedClientId = numericClientId;
        }
        else if (phone) {
            destinationPhone = phone;
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
    // Send form link via Email
    app.post("/api/forms/:id/send-email", asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid form id" });
        }
        const emailSchema = z.object({
            clientId: z.union([z.number(), z.string().regex(/^\d+$/)]).optional(),
            email: z.string().email().optional(),
            subject: z.string().optional(),
            customMessage: z.string().optional(),
        }).refine((data) => !!(data.clientId || data.email), {
            message: "Either clientId or email is required",
        });
        const parseResult = emailSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: "Invalid request payload", details: parseResult.error.flatten() });
        }
        const { clientId, email, subject, customMessage } = parseResult.data;
        let destinationEmail = email;
        let resolvedClientId = undefined;
        if (clientId) {
            const numericClientId = Number(clientId);
            const user = await storage.getUser(numericClientId);
            if (!user || !user.email) {
                return res.status(400).json({ error: "Selected client does not have an email address" });
            }
            destinationEmail = user.email;
            resolvedClientId = numericClientId;
        }
        if (!destinationEmail) {
            return res.status(400).json({ error: "No destination email provided" });
        }
        const publicUrl = getFormPublicUrl(id, resolvedClientId);
        const effectiveSubject = subject && subject.trim().length > 0
            ? subject.trim()
            : "New form to complete";
        const baseMessage = customMessage && customMessage.trim().length > 0
            ? customMessage.trim()
            : "You have a new form to complete.";
        const html = `${baseMessage}<br/><br/><a href="${publicUrl}" target="_blank" rel="noopener noreferrer">Click here to open the form</a>`;
        const text = `${baseMessage}\n\nOpen the form: ${publicUrl}`;
        await sendEmail({
            to: destinationEmail,
            from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
            subject: effectiveSubject,
            html,
            text,
        });
        res.json({ success: true });
    }));
    // List all unclaimed form submissions (not attached to any client)
    app.get("/api/form-submissions/unclaimed", asyncHandler(async (_req, res) => {
        const unclaimed = await storage.getUnclaimedFormSubmissions();
        res.json(unclaimed || []);
    }));
    // Attach a specific form submission to a client
    app.post("/api/form-submissions/:id/attach", asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: "Invalid submission id" });
        }
        const bodySchema = z.object({
            clientId: z.union([z.number(), z.string().regex(/^\d+$/)])
        });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
        }
        const clientId = Number(parsed.data.clientId);
        const attached = await storage.attachFormSubmissionToClient(id, clientId);
        // Create a lightweight note history entry for the client's profile
        try {
            const submittedOn = new Date(attached.submittedAt).toLocaleString();
            // Include a structured submission tag so we can hide this item from future unclaimed lists
            const content = `Form attached [submission:${id}]: ${attached.formTitle || 'Form'} (type: ${attached.formType || 'form'}) on ${submittedOn}`;
            await storage.createNoteHistory({
                clientId: clientId,
                appointmentId: null,
                noteContent: content,
                noteType: 'form',
                createdBy: 1,
                createdByRole: 'staff'
            });
        }
        catch { }
        res.json(attached);
    }));
}
