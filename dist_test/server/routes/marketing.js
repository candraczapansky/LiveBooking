import { ValidationError, NotFoundError, asyncHandler } from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";
import { validateRequest } from "../middleware/error-handler.js";
import { sendEmail } from "../email.js";
import { sendSMS, isTwilioConfigured } from "../sms.js";
import { getPublicUrl } from "../utils/url.js";
import { insertMarketingCampaignSchema, insertPromoCodeSchema } from "../../shared/schema.js";
// Use the shared schema for campaign creation
const campaignSchema = insertMarketingCampaignSchema;
// Append required SMS marketing compliance text if missing
const SMS_MARKETING_COMPLIANCE_TEXT = "reply STOP to opt out. Call 918-932-5396 for HELP. Msg & data rates may apply.";
function ensureSmsMarketingCompliance(message) {
    const base = (message ?? '').toString().trim();
    // Heuristic: if the message already includes a STOP opt-out phrase, don't append again
    const hasStopOptOut = /\b(reply|text)\s+stop\b/i.test(base) || /\bstop\b.*\b(unsubscribe|opt\s*out)\b/i.test(base);
    if (hasStopOptOut) {
        return base;
    }
    return `${base}${base.length ? ' ' : ''}${SMS_MARKETING_COMPLIANCE_TEXT}`;
}
export function registerMarketingRoutes(app, storage) {
    // Create marketing campaign (support both /marketing/campaigns and /marketing-campaigns)
    app.post(["/api/marketing/campaigns", "/api/marketing-campaigns"], validateRequest(campaignSchema), asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        const campaignData = req.body;
        LoggerService.info("Creating marketing campaign", { ...context, campaignData });
        const newCampaign = await storage.createMarketingCampaign(campaignData);
        LoggerService.info("Marketing campaign created", { ...context, campaignId: newCampaign.id });
        res.status(201).json(newCampaign);
    }));
    // Get all marketing campaigns (support both /marketing/campaigns and /marketing-campaigns)
    app.get(["/api/marketing/campaigns", "/api/marketing-campaigns"], asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        const { status, type, page = 1, limit = 10 } = req.query;
        LoggerService.debug("Fetching marketing campaigns", { ...context, filters: { status, type, page, limit } });
        // Get all campaigns and filter in memory since getMarketingCampaigns doesn't exist
        const allCampaigns = await storage.getAllMarketingCampaigns();
        let campaigns = allCampaigns;
        // Apply filters
        if (status) {
            campaigns = campaigns.filter(c => c.status === status);
        }
        if (type) {
            campaigns = campaigns.filter(c => c.type === type);
        }
        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        campaigns = campaigns.slice(startIndex, startIndex + limitNum);
        LoggerService.info("Marketing campaigns fetched", { ...context, count: campaigns.length });
        res.json(campaigns);
    }));
    // Get campaign by ID (support both path variants)
    app.get(["/api/marketing/campaigns/:id", "/api/marketing-campaigns/:id"], asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        LoggerService.debug("Fetching marketing campaign", { ...context, campaignId });
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign) {
            throw new NotFoundError("Marketing campaign");
        }
        res.json(campaign);
    }));
    // Update campaign (support both path variants)
    app.put(["/api/marketing/campaigns/:id", "/api/marketing-campaigns/:id"], validateRequest(campaignSchema.partial()), asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        const updateData = req.body;
        LoggerService.info("Updating marketing campaign", { ...context, campaignId, updateData });
        const existingCampaign = await storage.getMarketingCampaign(campaignId);
        if (!existingCampaign) {
            throw new NotFoundError("Marketing campaign");
        }
        const updatedCampaign = await storage.updateMarketingCampaign(campaignId, updateData);
        LoggerService.info("Marketing campaign updated", { ...context, campaignId });
        res.json(updatedCampaign);
    }));
    // Delete campaign (support both path variants)
    app.delete(["/api/marketing/campaigns/:id", "/api/marketing-campaigns/:id"], asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        LoggerService.info("Deleting marketing campaign", { ...context, campaignId });
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign) {
            throw new NotFoundError("Marketing campaign");
        }
        await storage.deleteMarketingCampaign(campaignId);
        LoggerService.info("Marketing campaign deleted", { ...context, campaignId });
        res.json({ success: true, message: "Marketing campaign deleted successfully" });
    }));
    // Send campaign (support both path variants)
    app.post(["/api/marketing/campaigns/:id/send", "/api/marketing-campaigns/:id/send"], asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        LoggerService.info("Sending marketing campaign", { ...context, campaignId });
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign) {
            throw new NotFoundError("Marketing campaign");
        }
        if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
            throw new ValidationError("Campaign can only be sent if it's in draft or scheduled status");
        }
        // Optional per-location targeting: allow filtering recipients by locationId when provided in request
        const targetLocationId = (() => {
            try {
                const v = (req.body?.locationId ?? req.query?.locationId);
                if (v == null || v === '')
                    return null;
                const n = parseInt(String(v));
                return Number.isNaN(n) ? null : n;
            }
            catch {
                return null;
            }
        })();
        // Get target audience, supporting both legacy and UI labels
        let recipients = [];
        const audience = (campaign.audience || '').toString();
        if ([
            'all',
            'clients',
            'All Clients',
            'Regular Clients',
            'New Clients',
            'Inactive Clients',
            'Upcoming Appointments',
        ].includes(audience)) {
            recipients = await storage.getUsersByRole('client');
        }
        else if (audience === 'staff') {
            recipients = await storage.getUsersByRole('staff');
        }
        else if (audience === 'specific' || audience === 'Specific Clients') {
            const idsRaw = campaign.targetClientIds ?? [];
            let idStrings = [];
            if (Array.isArray(idsRaw)) {
                idStrings = idsRaw;
            }
            else if (typeof idsRaw === 'string') {
                try {
                    const parsed = JSON.parse(idsRaw);
                    if (Array.isArray(parsed)) {
                        idStrings = parsed.map((v) => String(v));
                    }
                }
                catch {
                    if (idsRaw.startsWith('{') && idsRaw.endsWith('}')) {
                        idStrings = idsRaw.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
                    }
                }
            }
            const uniqueIds = Array.from(new Set(idStrings.map((s) => parseInt(s)).filter((n) => !Number.isNaN(n))));
            const fetched = await Promise.all(uniqueIds.map((id) => storage.getUser(id)));
            recipients = fetched.filter(Boolean);
        }
        else {
            // Fallback to clients
            recipients = await storage.getUsersByRole('client');
        }
        // If filtering by location, restrict recipients to those with recent or upcoming appointments at that location,
        // or staff assigned to that location.
        if (targetLocationId != null) {
            try {
                const allAppointments = await storage.getAppointmentsByLocation(targetLocationId);
                const clientIdsAtLocation = new Set((allAppointments || []).map((a) => a.clientId).filter((id) => typeof id === 'number'));
                const staffList = await storage.getAllStaff();
                const staffUserIdsAtLocation = new Set((staffList || []).filter((s) => String(s.locationId) === String(targetLocationId)).map((s) => s.userId).filter((id) => typeof id === 'number'));
                recipients = (recipients || []).filter((u) => {
                    if (!u)
                        return false;
                    if (u.role === 'client')
                        return clientIdsAtLocation.has(u.id);
                    if (u.role === 'staff')
                        return staffUserIdsAtLocation.has(u.id);
                    return false;
                });
            }
            catch { }
        }
        let sentCount = 0;
        let errorCount = 0;
        // Prepare media URL for MMS if applicable
        let photoUrlForSending = undefined;
        if (campaign.type === 'sms' && campaign.photoUrl) {
            const raw = campaign.photoUrl.toString();
            if (/^https?:\/\//i.test(raw)) {
                photoUrlForSending = raw;
            }
            else {
                // Expose a stable public URL that serves the campaign photo
                let candidate = getPublicUrl(`/api/marketing-campaigns/${campaignId}/photo`);
                const looksLocal = /localhost|127\.0\.0\.1/i.test(candidate);
                if (looksLocal) {
                    const xfProto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
                    const xfHost = req.headers['x-forwarded-host'] || req.get('host');
                    if (xfHost) {
                        const baseFromReq = `${xfProto}://${xfHost}`;
                        if (!/localhost|127\.0\.0\.1/i.test(baseFromReq)) {
                            candidate = `${baseFromReq}/api/marketing-campaigns/${campaignId}/photo`;
                        }
                    }
                }
                photoUrlForSending = candidate;
            }
        }
        // Send campaign based on type
        if (campaign.type === 'email') {
            // Queue recipients for email drip sending (like SMS)
            const existing = await storage.getMarketingCampaignRecipients?.(campaignId) || [];
            const existingByUser = new Set(existing.map(r => r.userId));
            // Build a set of emails that are already queued/sent for this campaign to avoid duplicate sends
            const existingEmails = new Set();
            try {
                const existingUserIds = Array.from(new Set(existing.map((r) => r.userId).filter(Boolean)));
                const existingUsers = await Promise.all(existingUserIds.map((id) => storage.getUser(id)));
                for (const u of existingUsers) {
                    const key = (u?.email || '').toString().trim().toLowerCase();
                    if (key)
                        existingEmails.add(key);
                }
            }
            catch { }
            const queuedEmails = new Set();
            let queued = 0;
            for (const recipient of recipients) {
                if (!(recipient.email && recipient.emailPromotions))
                    continue;
                // Normalize email for deduplication across multiple client accounts sharing the same email
                const emailKey = recipient.email.trim().toLowerCase();
                if (!emailKey)
                    continue;
                if (existingByUser.has(recipient.id))
                    continue;
                if (existingEmails.has(emailKey))
                    continue;
                if (queuedEmails.has(emailKey))
                    continue;
                await storage.createMarketingCampaignRecipient?.({
                    campaignId,
                    userId: recipient.id,
                    status: 'pending',
                });
                queuedEmails.add(emailKey);
                queued++;
            }
            await storage.updateMarketingCampaign(campaignId, {
                status: 'sending',
                sentCount: (campaign.sentCount || 0),
                failedCount: (campaign.failedCount || 0),
                sendDate: new Date(),
            });
            LoggerService.info("Marketing campaign queued for EMAIL drip", { ...context, campaignId, queued });
            return res.json({
                success: true,
                message: "Campaign queued for email drip sending",
                queuedCount: queued,
                totalRecipients: recipients.length,
                batchSize: parseInt(process.env.EMAIL_DRIP_BATCH_SIZE || '50', 10),
                batchIntervalMinutes: 10,
            });
        }
        if (campaign.type === 'sms') {
            const isSpecificAudience = (campaign.audience || '').toString().toLowerCase().includes('specific');
            // Queue recipients for drip sending instead of blasting at once
            const existing = await storage.getMarketingCampaignRecipients?.(campaignId) || [];
            const existingByUser = new Set(existing.map(r => r.userId));
            // Build a set of existing phone numbers already queued/sent for this campaign to avoid duplicate sends across multiple client accounts
            const normalizePhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
            const existingPhones = new Set();
            try {
                const existingUserIds = Array.from(new Set(existing.map((r) => r.userId).filter(Boolean)));
                const existingUsers = await Promise.all(existingUserIds.map((id) => storage.getUser(id)));
                for (const u of existingUsers) {
                    const key = normalizePhone(u?.phone || '');
                    if (key)
                        existingPhones.add(key);
                }
            }
            catch { }
            const queuedPhones = new Set();
            let queued = 0;
            for (const recipient of recipients) {
                const hasConsent = !!recipient.smsPromotions || isSpecificAudience;
                if (!(recipient.phone && hasConsent))
                    continue;
                const phoneKey = normalizePhone(recipient.phone);
                if (!phoneKey)
                    continue;
                if (existingByUser.has(recipient.id))
                    continue;
                if (existingPhones.has(phoneKey))
                    continue;
                if (queuedPhones.has(phoneKey))
                    continue;
                await storage.createMarketingCampaignRecipient?.({
                    campaignId,
                    userId: recipient.id,
                    status: 'pending',
                });
                queuedPhones.add(phoneKey);
                queued++;
            }
            await storage.updateMarketingCampaign(campaignId, {
                status: 'sending',
                sentCount: (campaign.sentCount || 0),
                failedCount: (campaign.failedCount || 0),
                sendDate: new Date(),
            });
            LoggerService.info("Marketing campaign queued for SMS drip", { ...context, campaignId, queued });
            // Process a small immediate batch to provide real-time feedback
            let immediateSent = 0;
            let immediateFailed = 0;
            try {
                const now = new Date();
                const centralNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
                const startOfWindow = new Date(centralNow);
                startOfWindow.setHours(8, 0, 0, 0);
                const endOfWindow = new Date(centralNow);
                endOfWindow.setHours(20, 0, 0, 0);
                const withinWindow = centralNow >= startOfWindow && centralNow <= endOfWindow;
                if (withinWindow) {
                    const immediateBatchSize = parseInt(process.env.SMS_DRIP_IMMEDIATE_BATCH_SIZE || '10', 10);
                    const allAfterQueue = await storage.getMarketingCampaignRecipients?.(campaignId) || [];
                    const pendingBatch = allAfterQueue.filter(r => r.status === 'pending').slice(0, Math.max(0, immediateBatchSize));
                    const seenPhonesImmediate = new Set();
                    for (const rec of pendingBatch) {
                        try {
                            const user = await storage.getUser(rec.userId);
                            const hasConsent = !!user?.smsPromotions || isSpecificAudience;
                            if (!user || !user.phone || !hasConsent) {
                                await storage.updateMarketingCampaignRecipient?.(rec.id, { status: 'failed', errorMessage: 'no_phone_or_pref' });
                                immediateFailed++;
                                continue;
                            }
                            const normalizePhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
                            const phoneKey = normalizePhone(user.phone);
                            if (phoneKey && seenPhonesImmediate.has(phoneKey)) {
                                // Skip duplicate phone in the immediate batch; process drip will handle remaining
                                continue;
                            }
                            if (phoneKey)
                                seenPhonesImmediate.add(phoneKey);
                            // Attempt to atomically claim this recipient to avoid duplicate sends
                            const claimed = await storage.claimMarketingCampaignRecipient?.(rec.id);
                            if (!claimed) {
                                // Already claimed by another worker; skip
                                continue;
                            }
                            const smsContent = ensureSmsMarketingCompliance((campaign.content || '').toString());
                            const sendResult = await sendSMS(user.phone, smsContent, photoUrlForSending);
                            if (sendResult.success) {
                                immediateSent++;
                                await storage.updateMarketingCampaignRecipient?.(rec.id, { status: 'sent', sentAt: new Date() });
                            }
                            else {
                                immediateFailed++;
                                await storage.updateMarketingCampaignRecipient?.(rec.id, { status: 'failed', errorMessage: sendResult.error || 'send_failed' });
                            }
                        }
                        catch (err) {
                            immediateFailed++;
                            try {
                                await storage.updateMarketingCampaignRecipient?.(rec.id, { status: 'failed', errorMessage: err?.message || 'error' });
                            }
                            catch { }
                        }
                    }
                }
                else {
                    LoggerService.info("Immediate SMS sending skipped due to quiet hours (8am–8pm CT)", { ...context, campaignId });
                }
                // Refresh campaign and update counters/status
                const fresh = await storage.getMarketingCampaign(campaignId);
                if (fresh) {
                    const allRecips = await storage.getMarketingCampaignRecipients?.(campaignId) || [];
                    const remainingPending = allRecips.filter(r => r.status === 'pending').length;
                    const update = {
                        status: remainingPending > 0 ? 'sending' : 'sent',
                        sentCount: (fresh.sentCount || 0) + immediateSent,
                        deliveredCount: (fresh.deliveredCount || 0) + immediateSent,
                        failedCount: (fresh.failedCount || 0) + immediateFailed,
                    };
                    if (update.status === 'sent') {
                        update.sentAt = new Date();
                    }
                    await storage.updateMarketingCampaign(campaignId, update);
                }
            }
            catch (kickErr) {
                LoggerService.error("Immediate SMS batch processing error", { ...context, campaignId }, kickErr);
            }
            return res.json({
                success: true,
                message: immediateSent > 0 ? "Campaign started sending" : "Campaign queued for SMS drip sending",
                queuedCount: queued,
                totalRecipients: recipients.length,
                results: {
                    sentCount: immediateSent,
                    failedCount: immediateFailed,
                },
                batchSize: parseInt(process.env.SMS_DRIP_BATCH_SIZE || '100', 10),
                batchIntervalMinutes: 10,
            });
        }
    }));
    // Serve campaign photo as a public image (support both path variants)
    app.get(["/api/marketing/campaigns/:id/photo", "/api/marketing-campaigns/:id/photo"], asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        LoggerService.debug("Serving marketing campaign photo", { ...context, campaignId });
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign || !campaign.photoUrl) {
            throw new NotFoundError("Marketing campaign photo not found");
        }
        try {
            const value = campaign.photoUrl || '';
            if (/^https?:\/\//i.test(value)) {
                // If already a URL, redirect for simplicity
                res.redirect(302, value);
                return;
            }
            // Expect a data URL: data:<mime>;base64,<data>
            const match = /^data:([^;]+);base64,(.*)$/i.exec(value);
            if (!match) {
                throw new ValidationError("Invalid campaign photo format");
            }
            const mimeType = match[1];
            const base64Data = match[2];
            const buffer = Buffer.from(base64Data, 'base64');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', buffer.length.toString());
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Content-Disposition', 'inline');
            res.status(200).end(buffer);
        }
        catch (err) {
            LoggerService.error("Error serving campaign photo", { ...context, campaignId }, err);
            throw new ValidationError("Failed to serve campaign photo");
        }
    }));
    // Get campaign statistics
    app.get("/api/marketing/campaigns/:id/statistics", asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        LoggerService.debug("Fetching campaign statistics", { ...context, campaignId });
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign) {
            throw new NotFoundError("Marketing campaign");
        }
        const statistics = await storage.getCampaignStatistics?.(campaignId) ?? {};
        res.json({
            campaign,
            statistics,
        });
    }));
    // Create email template
    app.post("/api/marketing/email-templates", asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        const { name, subject, htmlContent, variables } = req.body;
        LoggerService.info("Creating email template", { ...context, name });
        let template;
        if (typeof storage.createEmailTemplate === 'function') {
            template = await storage.createEmailTemplate({
                name,
                subject,
                htmlContent,
                variables: variables || [],
            });
        }
        else {
            // Fallback: store template in system_config under 'email_templates'
            const id = `tmpl_${Date.now()}`;
            const record = {
                id,
                name,
                subject: subject || null,
                htmlContent,
                variables: variables || [],
                createdAt: new Date().toISOString(),
            };
            await storage.setSystemConfig({
                key: `email_template:${id}`,
                value: JSON.stringify(record),
                description: `Email template: ${name}`,
                category: 'email_templates',
                isEncrypted: false,
                isActive: true,
            });
            template = record;
        }
        LoggerService.info("Email template created", { ...context, templateId: template.id });
        res.status(201).json(template);
    }));
    // Get email templates
    app.get("/api/marketing/email-templates", asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        LoggerService.debug("Fetching email templates", context);
        let templates = [];
        if (typeof storage.getEmailTemplates === 'function') {
            templates = await storage.getEmailTemplates();
        }
        else {
            // Fallback: read from system_config category 'email_templates'
            const rows = await storage.getSystemConfigByCategory('email_templates');
            for (const row of rows) {
                try {
                    const parsed = JSON.parse(row.value || '{}');
                    if (parsed && parsed.id && parsed.name) {
                        templates.push(parsed);
                    }
                }
                catch {
                    // ignore
                }
            }
            templates.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        }
        LoggerService.info("Email templates fetched", { ...context, count: templates.length });
        res.json(templates);
    }));
    // Send promotional email
    app.post("/api/marketing/send-promotional-email", asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        const { recipientIds, subject, message, templateId } = req.body;
        LoggerService.info("Sending promotional email", { ...context, recipientCount: recipientIds.length });
        let sentCount = 0;
        let errorCount = 0;
        for (const recipientId of recipientIds) {
            try {
                const recipient = await storage.getUser(recipientId);
                if (!recipient || !recipient.email || !recipient.emailPromotions) {
                    continue;
                }
                let emailContent = message;
                if (templateId) {
                    // Note: getEmailTemplate doesn't exist in current storage interface
                    // Using basic message for now until email templates are implemented
                    emailContent = message.replace(/\{\{name\}\}/g, recipient.firstName || recipient.username || 'Valued Client');
                }
                // Append a minimal unsubscribe footer for compliance
                try {
                    const baseUrl = process.env.CUSTOM_DOMAIN || `${req.protocol}://${req.get('host')}`;
                    const unsubscribeUrl = `${baseUrl}/api/email-marketing/unsubscribe/${recipient.id}`;
                    const compliance = `\n<div style="font-size:12px; color:#666; text-align:center; margin:16px 0;">You are receiving this because you opted in to emails from us. <a href="${unsubscribeUrl}" style="color:#667eea; text-decoration:underline;">Unsubscribe</a></div>`;
                    if (/<\/body>/i.test(emailContent)) {
                        emailContent = emailContent.replace(/<\/body>/i, `${compliance}</body>`);
                    }
                    else if (/<\/html>/i.test(emailContent)) {
                        emailContent = emailContent.replace(/<\/html>/i, `${compliance}</html>`);
                    }
                    else {
                        emailContent = `${emailContent}${compliance}`;
                    }
                }
                catch { }
                await sendEmail({
                    to: recipient.email,
                    from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                    subject: subject || 'Glo Head Spa - Special Offer',
                    html: emailContent,
                });
                sentCount++;
                LoggerService.logCommunication("email", "promotional_sent", { ...context, userId: recipientId });
            }
            catch (error) {
                errorCount++;
                LoggerService.error("Promotional email send error", { ...context, recipientId }, error);
            }
        }
        LoggerService.info("Promotional email campaign completed", { ...context, sentCount, errorCount });
        res.json({
            success: true,
            message: "Promotional emails sent",
            sentCount,
            errorCount,
        });
    }));
    // ===== Promo Codes =====
    app.get("/api/promo-codes", asyncHandler(async (_req, res) => {
        const codes = await storage.getAllPromoCodes?.() ?? [];
        res.json(codes);
    }));
    app.post("/api/promo-codes", validateRequest(insertPromoCodeSchema), asyncHandler(async (req, res) => {
        const payload = req.body;
        const created = await storage.createPromoCode?.(payload);
        res.status(201).json(created);
    }));
    // Update a promo code
    app.put("/api/promo-codes/:id", validateRequest(insertPromoCodeSchema.partial()), asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ID' });
        }
        const payload = req.body;
        const updated = await storage.updatePromoCode?.(id, payload);
        if (!updated) {
            return res.status(404).json({ error: 'Promo code not found' });
        }
        res.json(updated);
    }));
    // Delete a promo code
    app.delete("/api/promo-codes/:id", asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ID' });
        }
        const deleted = await storage.deletePromoCode?.(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Promo code not found' });
        }
        res.status(204).end();
    }));
    // Validate a promo code for checkout
    app.post("/api/promo-codes/validate", asyncHandler(async (req, res) => {
        const codeRaw = (req.body?.code || '').toString().trim();
        const amount = Number(req.body?.amount || 0) || 0;
        const serviceId = req.body?.serviceId;
        if (!codeRaw)
            return res.status(400).json({ valid: false, message: 'Missing code' });
        const promo = await storage.getPromoCodeByCode?.(codeRaw);
        if (!promo || promo.active === false) {
            return res.status(404).json({ valid: false, message: 'Invalid or inactive code' });
        }
        try {
            const now = new Date();
            if (promo.expirationDate && new Date(promo.expirationDate) < now) {
                return res.status(400).json({ valid: false, message: 'Code expired' });
            }
            if (typeof promo.usageLimit === 'number' && typeof promo.usedCount === 'number' && promo.usedCount >= promo.usageLimit) {
                return res.status(400).json({ valid: false, message: 'Usage limit reached' });
            }
            // Optional simple service check: if promo.service set, require match by ID string
            if (promo.service && serviceId != null && String(promo.service) !== String(serviceId)) {
                // Not a hard fail; treat as invalid for this service
                return res.status(400).json({ valid: false, message: 'Code not valid for this service' });
            }
            let discountAmount = 0;
            const type = (promo.type || '').toString().toLowerCase();
            const value = Number(promo.value || 0) || 0;
            if (type === 'percentage') {
                discountAmount = Math.max(0, Math.min(amount, amount * (value / 100)));
            }
            else if (type === 'fixed') {
                discountAmount = Math.max(0, Math.min(amount, value));
            }
            else {
                discountAmount = 0;
            }
            const newTotal = Math.max(0, amount - discountAmount);
            return res.json({ valid: discountAmount > 0, discountAmount, newTotal, code: codeRaw });
        }
        catch (err) {
            return res.status(500).json({ valid: false, message: 'Validation error' });
        }
    }));
    // ===== Email Unsubscribes =====
    app.get("/api/unsubscribes", asyncHandler(async (_req, res) => {
        const emailUnsubs = await storage.getAllEmailUnsubscribes?.() ?? [];
        // Also include SMS opt-outs captured via system_config keys: sms_opt_out:+E164
        const normalizeDigits = (s) => (s || '').replace(/\D/g, '');
        const equalPhones = (a, b) => {
            const da = normalizeDigits(a);
            const db = normalizeDigits(b);
            if (!da || !db)
                return false;
            // Compare last 10 digits to allow for country code formatting differences
            return da.slice(-10) === db.slice(-10);
        };
        const allConfig = await storage.getAllSystemConfig();
        const smsConfigs = (allConfig || []).filter((c) => (c.key || '').toLowerCase().includes('sms') && (c.key || '').toLowerCase().includes('opt') && (c.key || '').toLowerCase().includes('out'));
        const smsOptOuts = [];
        for (const cfg of smsConfigs) {
            try {
                // Handle keys like sms_opt_out:+E164, sms-opt-out:+E164, phone_opt_out:+E164
                const parts = cfg.key.split(':');
                const phone = parts.length > 1 ? parts.slice(1).join(':') : '';
                let at;
                try {
                    const parsed = JSON.parse(cfg.value || '{}');
                    if (parsed && parsed.at)
                        at = parsed.at;
                }
                catch {
                    // ignore
                }
                // Try to find user by exact phone first
                let user = await storage.getUserByPhone?.(phone);
                if (!user) {
                    // Fallback: scan all users and match by last 10 digits
                    const users = await storage.getAllUsers();
                    user = users.find((u) => u.phone && equalPhones(u.phone, phone));
                }
                smsOptOuts.push({
                    id: (user?.id ? user.id * 100000 + 1 : Date.now()),
                    userId: user?.id || null,
                    email: user?.email || phone, // display email if available, otherwise phone
                    unsubscribedAt: at || new Date().toISOString(),
                    reason: 'SMS STOP',
                    user: user ? {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        username: user.username,
                        phone: user.phone,
                        email: user.email
                    } : { phone }
                });
            }
            catch {
                // continue
            }
        }
        // Include users with all SMS preferences disabled as opted-out (fallback visibility)
        const clients = await storage.getUsersByRole('client');
        for (const u of clients) {
            const allSmsOff = !u.smsAccountManagement && !u.smsAppointmentReminders && !u.smsPromotions;
            if (!allSmsOff)
                continue;
            // Skip if already present via system_config key
            const already = smsOptOuts.some((o) => (o.user?.phone && u.phone && equalPhones(o.user.phone, u.phone)));
            if (already)
                continue;
            smsOptOuts.push({
                id: u.id * 100000 + 2,
                userId: u.id,
                email: u.email || (u.phone || 'Unknown'),
                unsubscribedAt: new Date(u.updatedAt || Date.now()).toISOString(),
                reason: 'SMS preferences disabled',
                user: {
                    id: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    username: u.username,
                    phone: u.phone,
                    email: u.email
                }
            });
        }
        // De-duplicate by userId or contact
        const merged = [...emailUnsubs, ...smsOptOuts];
        const seen = new Set();
        const dedup = merged.filter((item) => {
            const key = item.userId ? `u:${item.userId}` : `c:${item.email || item.user?.phone || item.id}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
        res.json(dedup);
    }));
    // Active SMS-capable clients (not opted-out and at least one SMS preference enabled)
    app.get("/api/marketing/active-sms-clients", asyncHandler(async (_req, res) => {
        const allUsers = await storage.getUsersByRole('client');
        const allConfig = await storage.getAllSystemConfig();
        const smsOptOutKeys = new Set((allConfig || [])
            .filter((c) => (c.key || '').toLowerCase().includes('sms') && (c.key || '').toLowerCase().includes('opt') && (c.key || '').toLowerCase().includes('out'))
            .map((c) => c.key));
        const isOptedOut = (phone) => {
            if (!phone)
                return false;
            const normalized = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
            // Match any key that ends with the normalized or raw last-10
            const last10 = phone.replace(/\D/g, '').slice(-10);
            for (const key of smsOptOutKeys) {
                const lower = key.toLowerCase();
                if (lower.endsWith(normalized.toLowerCase()) || lower.endsWith(`+${last10}`) || lower.endsWith(last10)) {
                    return true;
                }
            }
            return false;
        };
        const active = allUsers.filter(u => {
            const anyPref = !!(u.smsAccountManagement || u.smsAppointmentReminders || u.smsPromotions);
            return anyPref && !isOptedOut(u.phone);
        });
        res.json(active);
    }));
    // Clients who have not opened any tracked marketing emails (based on recipient open logs if available)
    app.get("/api/marketing/non-openers", asyncHandler(async (_req, res) => {
        try {
            const campaigns = await storage.getAllMarketingCampaigns();
            const userIdToOpened = new Map();
            const userIdSeen = new Set();
            for (const c of campaigns) {
                if (!('getMarketingCampaignRecipients' in storage))
                    continue;
                const recips = await storage.getMarketingCampaignRecipients(c.id);
                for (const r of recips) {
                    if (typeof r.userId === 'number') {
                        userIdSeen.add(r.userId);
                        if (r.openedAt)
                            userIdToOpened.set(r.userId, true);
                    }
                }
            }
            const nonOpenersIds = Array.from(userIdSeen).filter(id => !userIdToOpened.get(id));
            const users = await Promise.all(nonOpenersIds.map(id => storage.getUser(id)));
            res.json(users.filter(Boolean));
        }
        catch {
            res.json([]);
        }
    }));
    // Admin: Manually set SMS opt-out for a phone number (fallback if webhook didn't deliver STOP)
    app.post("/api/marketing/opt-out-sms", asyncHandler(async (req, res) => {
        const phoneRaw = (req.body?.phone || '').toString();
        const normalize = (p) => {
            const t = (p || '').trim();
            if (t.startsWith('+'))
                return t;
            const d = t.replace(/\D/g, '');
            if (d.length === 10)
                return `+1${d}`;
            return d ? `+${d}` : '';
        };
        const phone = normalize(phoneRaw);
        if (!phone)
            return res.status(400).json({ error: 'Invalid phone' });
        const key = `sms_opt_out:${phone}`;
        const value = JSON.stringify({ optedOut: true, at: new Date().toISOString(), reason: 'manual' });
        const existing = await storage.getSystemConfig(key);
        if (existing)
            await storage.updateSystemConfig(key, value, 'Manual SMS opt-out');
        else
            await storage.setSystemConfig({ key, value, description: 'Manual SMS opt-out', isEncrypted: false, isActive: true });
        // Try to update user flags if user exists
        let user = await storage.getUserByPhone?.(phone);
        if (!user) {
            const last10 = phone.replace(/\D/g, '').slice(-10);
            const users = await storage.getUsersByRole('client');
            user = users.find(u => (u.phone || '').replace(/\D/g, '').slice(-10) === last10);
        }
        if (user?.id) {
            await storage.updateUser(user.id, { smsAccountManagement: false, smsAppointmentReminders: false, smsPromotions: false });
        }
        res.json({ success: true });
    }));
    // Admin: Manually clear SMS opt-out
    app.post("/api/marketing/opt-in-sms", asyncHandler(async (req, res) => {
        const phoneRaw = (req.body?.phone || '').toString();
        const normalize = (p) => {
            const t = (p || '').trim();
            if (t.startsWith('+'))
                return t;
            const d = t.replace(/\D/g, '');
            if (d.length === 10)
                return `+1${d}`;
            return d ? `+${d}` : '';
        };
        const phone = normalize(phoneRaw);
        if (!phone)
            return res.status(400).json({ error: 'Invalid phone' });
        const key = `sms_opt_out:${phone}`;
        await storage.deleteSystemConfig(key);
        let user = await storage.getUserByPhone?.(phone);
        if (!user) {
            const last10 = phone.replace(/\D/g, '').slice(-10);
            const users = await storage.getUsersByRole('client');
            user = users.find(u => (u.phone || '').replace(/\D/g, '').slice(-10) === last10);
        }
        if (user?.id) {
            await storage.updateUser(user.id, { smsAccountManagement: true, smsAppointmentReminders: true, smsPromotions: true });
        }
        res.json({ success: true });
    }));
    // GET aliases for manual quick toggle (convenience)
    app.get("/api/marketing/opt-out-sms", asyncHandler(async (req, res) => {
        req.body = { phone: req.query.phone };
        // Reuse POST handler logic
        // @ts-ignore
        return app._router.handle(req, res, () => { });
    }));
    app.get("/api/marketing/opt-in-sms", asyncHandler(async (req, res) => {
        req.body = { phone: req.query.phone };
        // Reuse POST handler logic
        // @ts-ignore
        return app._router.handle(req, res, () => { });
    }));
    // Debug: list raw sms opt-out config keys
    app.get("/api/marketing/debug/sms-opt-outs", asyncHandler(async (_req, res) => {
        const rows = await storage.getAllSystemConfig();
        const keys = (rows || []).filter((c) => (c.key || '').toLowerCase().includes('sms') && (c.key || '').toLowerCase().includes('opt') && (c.key || '').toLowerCase().includes('out'));
        res.json(keys);
    }));
    // Send promotional SMS
    app.post("/api/marketing/send-promotional-sms", asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        const { recipientIds, message } = req.body;
        LoggerService.info("Sending promotional SMS", { ...context, recipientCount: recipientIds.length });
        let sentCount = 0;
        let errorCount = 0;
        const normalizePhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
        const seenPhones = new Set();
        for (const recipientId of recipientIds) {
            try {
                const recipient = await storage.getUser(recipientId);
                if (!recipient || !recipient.phone || !recipient.smsPromotions) {
                    continue;
                }
                const phoneKey = normalizePhone(recipient.phone);
                if (phoneKey && seenPhones.has(phoneKey)) {
                    // Skip duplicate phone number across different user records
                    continue;
                }
                if (phoneKey)
                    seenPhones.add(phoneKey);
                const smsContent = ensureSmsMarketingCompliance(message);
                await sendSMS(recipient.phone, smsContent);
                sentCount++;
                LoggerService.logCommunication("sms", "promotional_sent", { ...context, userId: recipientId });
            }
            catch (error) {
                errorCount++;
                LoggerService.error("Promotional SMS send error", { ...context, recipientId }, error);
            }
        }
        LoggerService.info("Promotional SMS campaign completed", { ...context, sentCount, errorCount });
        res.json({
            success: true,
            message: "Promotional SMS sent",
            sentCount,
            errorCount,
        });
    }));
    // Get marketing analytics
    app.get("/api/marketing/analytics", asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        const { startDate, endDate, type } = req.query;
        LoggerService.debug("Fetching marketing analytics", { ...context, filters: { startDate, endDate, type } });
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = endDate ? new Date(endDate) : new Date();
        const analytics = await storage.getMarketingAnalytics?.(start, end, type) ?? {};
        res.json({
            period: { start, end },
            analytics,
        });
    }));
    // Create customer segment
    app.post("/api/marketing/segments", asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        const { name, description, criteria } = req.body;
        LoggerService.info("Creating customer segment", { ...context, name });
        const segment = await storage.createCustomerSegment?.({
            name,
            description,
            criteria,
        }) ?? { id: 0, name, description, criteria };
        LoggerService.info("Customer segment created", { ...context, segmentId: segment.id });
        res.status(201).json(segment);
    }));
    // Get customer segments
    app.get("/api/marketing/segments", asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        LoggerService.debug("Fetching customer segments", context);
        const segments = await storage.getCustomerSegments?.() ?? [];
        LoggerService.info("Customer segments fetched", { ...context, count: segments.length });
        res.json(segments);
    }));
    // Get segment members
    app.get("/api/marketing/segments/:id/members", asyncHandler(async (req, res) => {
        const segmentId = parseInt(req.params.id);
        const context = getLogContext(req);
        LoggerService.debug("Fetching segment members", { ...context, segmentId });
        const members = await storage.getSegmentMembers?.(segmentId) ?? [];
        LoggerService.info("Segment members fetched", { ...context, segmentId, count: members.length });
        res.json(members);
    }));
    // Schedule campaign
    app.post("/api/marketing/campaigns/:id/schedule", asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        const { scheduledAt } = req.body;
        LoggerService.info("Scheduling marketing campaign", { ...context, campaignId, scheduledAt });
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign) {
            throw new NotFoundError("Marketing campaign");
        }
        const scheduledDate = new Date(scheduledAt);
        if (scheduledDate <= new Date()) {
            throw new ValidationError("Scheduled date must be in the future");
        }
        const updatedCampaign = await storage.updateMarketingCampaign(campaignId, {
            status: 'scheduled',
            sendDate: scheduledDate,
        });
        LoggerService.info("Marketing campaign scheduled", { ...context, campaignId, scheduledAt });
        res.json(updatedCampaign);
    }));
    // Cancel campaign
    app.post("/api/marketing/campaigns/:id/cancel", asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        LoggerService.info("Cancelling marketing campaign", { ...context, campaignId });
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign) {
            throw new NotFoundError("Marketing campaign");
        }
        if (campaign.status === 'completed') {
            throw new ValidationError("Cannot cancel completed campaign");
        }
        const updatedCampaign = await storage.updateMarketingCampaign(campaignId, {
            status: 'cancelled',
        });
        LoggerService.info("Marketing campaign cancelled", { ...context, campaignId });
        res.json(updatedCampaign);
    }));
    // Send a test SMS for a specific campaign to a specific number (POST and GET alias)
    const testSmsHandler = asyncHandler(async (req, res) => {
        const campaignId = parseInt(req.params.id);
        const context = getLogContext(req);
        LoggerService.info("Sending test SMS for campaign", { ...context, campaignId });
        const campaign = await storage.getMarketingCampaign(campaignId);
        if (!campaign) {
            throw new NotFoundError("Marketing campaign");
        }
        if (campaign.type !== 'sms') {
            throw new ValidationError("Test SMS is only available for SMS campaigns");
        }
        const toRaw = (req.body?.to || req.query?.to || '').toString().trim();
        if (!toRaw) {
            throw new ValidationError("Missing 'to' phone number");
        }
        // Prepare media URL for MMS if applicable
        let photoUrlForSending = undefined;
        if (campaign.photoUrl) {
            const raw = campaign.photoUrl.toString();
            if (/^https?:\/\//i.test(raw)) {
                photoUrlForSending = raw;
            }
            else {
                let candidate = getPublicUrl(`/api/marketing-campaigns/${campaignId}/photo`);
                const looksLocal = /localhost|127\.0\.0\.1/i.test(candidate);
                if (looksLocal) {
                    const xfProto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
                    const xfHost = req.headers['x-forwarded-host'] || req.get('host');
                    if (xfHost) {
                        const baseFromReq = `${xfProto}://${xfHost}`;
                        if (!/localhost|127\.0\.0\.1/i.test(baseFromReq)) {
                            candidate = `${baseFromReq}/api/marketing-campaigns/${campaignId}/photo`;
                        }
                    }
                }
                photoUrlForSending = candidate;
            }
        }
        const smsContent = ensureSmsMarketingCompliance((campaign.content || '').toString());
        const result = await sendSMS(toRaw, smsContent, photoUrlForSending);
        if (result.success) {
            LoggerService.info("Test SMS sent", { ...context, campaignId, to: toRaw });
            return res.json({ success: true, message: 'Test SMS sent', to: toRaw, messageId: result.messageId });
        }
        else {
            LoggerService.error("Test SMS failed", { ...context, campaignId, to: toRaw, error: result.error });
            return res.status(400).json({ success: false, error: result.error || 'Failed to send test SMS' });
        }
    });
    app.post(["/api/marketing/campaigns/:id/test-sms", "/api/marketing-campaigns/:id/test-sms"], testSmsHandler);
    app.get(["/api/marketing/campaigns/:id/test-sms", "/api/marketing-campaigns/:id/test-sms"], testSmsHandler);
    // Get SMS configuration status
    app.get("/api/sms-config-status", asyncHandler(async (req, res) => {
        const context = getLogContext(req);
        LoggerService.debug("Checking SMS configuration status", context);
        try {
            const isConfigured = await isTwilioConfigured();
            LoggerService.info("SMS configuration status checked", { ...context, isConfigured });
            res.json({
                configured: isConfigured,
                message: isConfigured
                    ? "SMS is properly configured and ready to send messages"
                    : "SMS is not configured. Please configure Twilio credentials to send SMS campaigns."
            });
        }
        catch (error) {
            LoggerService.error("Error checking SMS configuration status", { ...context, error });
            res.json({
                configured: false,
                message: "Error checking SMS configuration status"
            });
        }
    }));
}
