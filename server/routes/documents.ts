import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { asyncHandler, ValidationError, NotFoundError } from "../utils/errors.js";
import { sendSMS } from "../sms.js";
import { sendEmail } from "../email.js";
import { getPublicUrl } from "../utils/url.js";

const createDocumentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["active", "draft", "inactive"]).default("active"),
  tags: z.array(z.string()).optional(),
  design: z.any().optional(),
  htmlContent: z.string().min(1),
});

const updateDocumentSchema = createDocumentSchema.partial();

export function registerDocumentsRoutes(app: Express, storage: IStorage) {
  // List documents (stored in system_config under category 'documents')
  app.get("/api/documents", asyncHandler(async (_req: Request, res: Response) => {
    const rows = await storage.getSystemConfigByCategory('documents');
    const docs: any[] = [];
    for (const row of rows as any[]) {
      try {
        const parsed = JSON.parse(row.value || '{}');
        if (parsed && parsed.id && parsed.title) docs.push(parsed);
      } catch {
        // ignore bad rows
      }
    }
    // Sort newest first
    docs.sort((a, b) => (a.updatedAt || a.createdAt || 0) < (b.updatedAt || b.createdAt || 0) ? 1 : -1);
    res.json(docs);
  }));

  // Create document
  app.post("/api/documents", asyncHandler(async (req: Request, res: Response) => {
    const parsed = createDocumentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid document payload");
    }
    const data = parsed.data as any;
    const id = `doc_${Date.now()}`;
    const record = {
      id,
      title: data.title,
      description: data.description || '',
      status: data.status || 'active',
      tags: Array.isArray(data.tags) ? data.tags : [],
      design: data.design || null,
      htmlContent: data.htmlContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await storage.setSystemConfig({
      key: `document:${id}`,
      value: JSON.stringify(record),
      description: `Document: ${record.title}`,
      category: 'documents',
      isEncrypted: false,
      isActive: true,
    } as any);
    res.status(201).json(record);
  }));

  // Get document by id
  app.get("/api/documents/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const row = await storage.getSystemConfig(`document:${id}`);
    if (!row) throw new NotFoundError("Document");
    let parsed: any;
    try {
      parsed = JSON.parse((row as any).value || '{}');
    } catch {
      throw new ValidationError("Invalid stored document format");
    }
    res.json(parsed);
  }));

  // Update document
  app.put("/api/documents/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const existing = await storage.getSystemConfig(`document:${id}`);
    if (!existing) throw new NotFoundError("Document");
    let current: any = {};
    try {
      current = JSON.parse((existing as any).value || '{}');
    } catch {}
    const parsed = updateDocumentSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid document update");
    const update = parsed.data as any;
    const merged = {
      ...current,
      ...update,
      updatedAt: new Date().toISOString(),
    };
    await storage.updateSystemConfig(`document:${id}`, JSON.stringify(merged), `Document: ${merged.title}`);
    res.json(merged);
  }));

  // Delete document
  app.delete("/api/documents/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const ok = await storage.deleteSystemConfig(`document:${id}`);
    if (!ok) throw new NotFoundError("Document");
    res.json({ success: true });
  }));

  // Send document link via SMS
  app.post("/api/documents/:id/send-sms", asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const docCfg = await storage.getSystemConfig(`document:${id}`);
    if (!docCfg) throw new NotFoundError("Document");

    const schema = z.object({
      clientId: z.union([z.number(), z.string().regex(/^\d+$/)]).optional(),
      phone: z.string().optional(),
      customMessage: z.string().optional(),
    }).refine((d) => !!(d.clientId || d.phone), { message: "Either clientId or phone is required" });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid request payload");
    const { clientId, phone, customMessage } = parsed.data as any;

    let destinationPhone: string | undefined;
    let resolvedClientId: number | undefined;
    if (clientId) {
      const user = await storage.getUser(Number(clientId));
      if (!user || !user.phone) throw new ValidationError("Selected client does not have a phone number");
      destinationPhone = user.phone;
      resolvedClientId = Number(clientId);
    } else {
      destinationPhone = phone as string;
    }
    if (!destinationPhone) throw new ValidationError("No destination phone number provided");

    // Build public URL using request host to match the exact frontend origin
    const xfProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const xfHost = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const baseFromReq = xfHost ? `${xfProto}://${xfHost}` : undefined;
    const basePath = `/api/public-documents/${id}`;
    const publicUrl = baseFromReq
      ? `${baseFromReq}${basePath}${resolvedClientId != null ? `?clientId=${resolvedClientId}` : ''}`
      : (resolvedClientId != null
          ? getPublicUrl(`${basePath}?clientId=${resolvedClientId}`)
          : getPublicUrl(basePath));
    const message = customMessage && customMessage.trim().length > 0
      ? `${customMessage.trim()}\n\n${publicUrl}`
      : `Please review this document: ${publicUrl}`;

    const result = await sendSMS(destinationPhone, message);
    if (!result.success) return res.status(500).json({ error: result.error || 'Failed to send SMS' });
    res.json({ success: true, messageId: result.messageId });
  }));

  // Send document link via Email
  app.post("/api/documents/:id/send-email", asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const docCfg = await storage.getSystemConfig(`document:${id}`);
    if (!docCfg) throw new NotFoundError("Document");
    let doc: any = {};
    try { doc = JSON.parse((docCfg as any).value || '{}'); } catch {}

    const schema = z.object({
      clientId: z.union([z.number(), z.string().regex(/^\d+$/)]).optional(),
      email: z.string().email().optional(),
      subject: z.string().optional(),
      customMessage: z.string().optional(),
    }).refine((d) => !!(d.clientId || d.email), { message: "Either clientId or email is required" });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid request payload");
    const { clientId, email, subject, customMessage } = parsed.data as any;

    let destinationEmail: string | undefined = email;
    let resolvedClientId: number | undefined;
    if (clientId) {
      const user = await storage.getUser(Number(clientId));
      if (!user || !user.email) throw new ValidationError("Selected client does not have an email address");
      destinationEmail = user.email;
      resolvedClientId = Number(clientId);
    }
    if (!destinationEmail) throw new ValidationError("No destination email provided");

    const xfProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const xfHost = (req.headers['x-forwarded-host'] as string) || req.get('host');
    const baseFromReq = xfHost ? `${xfProto}://${xfHost}` : undefined;
    const basePath = `/api/public-documents/${id}`;
    const publicUrl = baseFromReq
      ? `${baseFromReq}${basePath}${resolvedClientId != null ? `?clientId=${resolvedClientId}` : ''}`
      : (resolvedClientId != null
          ? getPublicUrl(`${basePath}?clientId=${resolvedClientId}`)
          : getPublicUrl(basePath));

    const effectiveSubject = (subject && subject.trim()) || `Document: ${doc.title || 'Information'}`;
    const baseMessage = (customMessage && customMessage.trim()) || `Please review the following document.`;
    const html = `${baseMessage}<br/><br/><a href="${publicUrl}" target="_blank" rel="noopener noreferrer">Click here to view the document</a>`;
    const text = `${baseMessage}\n\nView the document: ${publicUrl}`;

    await sendEmail({
      to: destinationEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
      subject: effectiveSubject,
      html,
      text,
    });
    res.json({ success: true });
  }));

  // Public, standalone document viewer (no app shell, no auth), API path to bypass SPA catch-all
  app.get("/api/public-documents/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const row = await storage.getSystemConfig(`document:${id}`);
    if (!row) throw new NotFoundError("Document");
    let doc: any = {};
    try { doc = JSON.parse((row as any).value || '{}'); } catch {}

    const title = String(doc.title || 'Document');
    const description = String(doc.description || '');
    const htmlContent = String(doc.htmlContent || '');

    const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} | Glo Head Spa</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background: #f7f7f8; color: #111827; }
    .container { max-width: 960px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    h1 { margin: 0 0 4px; font-size: 24px; }
    .desc { margin: 0 0 16px; color: #6b7280; font-size: 14px; }
    @media (prefers-color-scheme: dark) {
      body { background: #0b0b0c; color: #e5e7eb; }
      .container { background: #111315; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
      .desc { color: #9ca3af; }
    }
  </style>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="description" content="${escapeHtml(description).slice(0, 150)}" />
  <link rel="icon" href="data:," />
  </head>
<body>
  <main class="container">
    <article>
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p class="desc">${escapeHtml(description)}</p>` : ''}
      <div>${htmlContent}</div>
    </article>
  </main>
</body>
</html>`;

    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(page);
  }));
}

function escapeHtml(input: string): string {
  return (input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


