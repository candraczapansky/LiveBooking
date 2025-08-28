import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
let getPublicUrl = (p) => p;
try {
    // Lazy bind getPublicUrl if module exists when compiled
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    getPublicUrl = (await import('./utils/url.js')).getPublicUrl;
}
catch { }
let marketingCampaignTemplate, generateEmailHTML, generateEmailText, generateRawMarketingEmailHTML, htmlToText;
async function loadEmailTpl() {
    if (marketingCampaignTemplate)
        return;
    try {
        const mod = await import('./email-templates.js');
        marketingCampaignTemplate = mod.marketingCampaignTemplate;
        generateEmailHTML = mod.generateEmailHTML;
        generateEmailText = mod.generateEmailText;
        generateRawMarketingEmailHTML = mod.generateRawMarketingEmailHTML;
        htmlToText = mod.htmlToText;
    }
    catch (e) {
        console.error('Failed to load email-templates in marketing-campaigns:', e);
    }
}
import { addDays } from 'date-fns';
export class MarketingCampaignService {
    constructor(storage) {
        this.isRunning = false;
        this.storage = storage;
    }
    /**
     * Start the marketing campaign service
     */
    startService() {
        if (this.isRunning) {
            console.log('Marketing campaign service is already running');
            return;
        }
        this.isRunning = true;
        console.log('📢 Starting marketing campaign service...');
        // Check for campaigns to send every 10 minutes
        this.intervalId = setInterval(async () => {
            try {
                // Add a small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.processScheduledCampaigns();
            }
            catch (error) {
                console.error('Error in marketing campaign service:', error);
                // If there's a critical error, stop the service to prevent loops
                if (error instanceof Error && error.message.includes('database')) {
                    console.error('Critical database error detected. Stopping marketing campaign service to prevent loops.');
                    this.stopService();
                }
            }
        }, 10 * 60 * 1000); // 10 minutes
        // Also process immediately on startup
        this.processScheduledCampaigns();
    }
    /**
     * Stop the marketing campaign service
     */
    stopService() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.isRunning = false;
        console.log('🛑 Marketing campaign service stopped');
    }
    /**
     * Process scheduled marketing campaigns
     */
    async processScheduledCampaigns() {
        console.log('📢 Processing scheduled marketing campaigns...');
        try {
            const campaigns = await this.storage.getMarketingCampaigns();
            const now = new Date();
            const dueScheduled = campaigns.filter(campaign => campaign.status === 'scheduled' &&
                campaign.sendDate &&
                now >= new Date(campaign.sendDate));
            const inProgress = campaigns.filter(campaign => campaign.status === 'sending');
            // Process due scheduled first, then any in-progress drips
            const toProcess = [...dueScheduled, ...inProgress];
            for (const campaign of toProcess) {
                if (campaign.type === 'sms') {
                    await this.processSmsDrip(campaign);
                }
                else {
                    // Process email campaigns via drip as well
                    await this.processEmailDrip(campaign);
                }
            }
        }
        catch (error) {
            console.error('Error processing marketing campaigns:', error);
        }
    }
    /**
     * Send a marketing campaign
     */
    async sendCampaign(campaign) {
        console.log(`📢 Sending campaign: ${campaign.name}`);
        try {
            await loadEmailTpl();
            // For SMS campaigns, use drip processing and return batch stats
            if (campaign.type === 'sms') {
                const { sentCount, failedCount, totalRecipients } = await this.processSmsDrip(campaign);
                return {
                    totalRecipients,
                    sentCount,
                    deliveredCount: sentCount,
                    failedCount,
                    openedCount: 0,
                    clickedCount: 0,
                    unsubscribedCount: 0,
                    openRate: 0,
                    clickRate: 0,
                    unsubscribeRate: 0,
                };
            }
            // For email campaigns, process via drip as well
            const stats = await this.processEmailDrip(campaign);
            return stats;
            // Unreachable for email since we return above, keep for type safety
        }
        catch (error) {
            console.error(`❌ Error sending campaign "${campaign.name}":`, error);
            // Update campaign status to failed
            await this.storage.updateMarketingCampaign(campaign.id, {
                status: 'failed'
            });
            throw error;
        }
    }
    /**
     * Ensure recipients are created for an EMAIL campaign (pending status)
     */
    async seedEmailRecipientsIfNeeded(campaign) {
        const existing = await this.storage.getMarketingCampaignRecipients(campaign.id);
        if (existing && existing.length > 0) {
            return;
        }
        let recipients = [];
        try {
            // Prefer storage helper if available to respect audience logic
            // @ts-ignore
            if (typeof this.storage.getUsersByAudience === 'function') {
                // Parse targetClientIds when audience is specific
                let ids;
                const raw = campaign.targetClientIds ?? undefined;
                if (Array.isArray(raw)) {
                    ids = raw.map((v) => parseInt(String(v))).filter((n) => !Number.isNaN(n));
                }
                else if (typeof raw === 'string') {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed))
                            ids = parsed.map((v) => parseInt(String(v))).filter((n) => !Number.isNaN(n));
                    }
                    catch {
                        if (raw.startsWith('{') && raw.endsWith('}')) {
                            ids = raw
                                .slice(1, -1)
                                .split(',')
                                .map((s) => parseInt(s.trim()))
                                .filter((n) => !Number.isNaN(n));
                        }
                    }
                }
                // @ts-ignore
                recipients = await this.storage.getUsersByAudience(campaign.audience, ids);
            }
        }
        catch {
            // Fallback: all clients
            // @ts-ignore
            recipients = await this.storage.getUsersByRole?.('client');
        }
        const seenUserIds = new Set();
        const seenEmails = new Set();
        for (const r of recipients || []) {
            const userId = r?.id;
            if (!userId || seenUserIds.has(userId))
                continue;
            seenUserIds.add(userId);
            if (!r.email || !r.emailPromotions)
                continue;
            const emailKey = r.email.trim().toLowerCase();
            if (!emailKey)
                continue;
            if (seenEmails.has(emailKey))
                continue; // prevent duplicate sends to same email across multiple users
            await this.storage.createMarketingCampaignRecipient({
                campaignId: campaign.id,
                userId,
                status: 'pending',
            });
            seenEmails.add(emailKey);
        }
    }
    /**
     * Process one EMAIL drip batch for a campaign
     */
    async processEmailDrip(campaign) {
        await loadEmailTpl();
        // Seed recipients on first run
        await this.seedEmailRecipientsIfNeeded(campaign);
        const allRecipients = await this.storage.getMarketingCampaignRecipients(campaign.id);
        const pending = (allRecipients || []).filter(r => r.status === 'pending');
        const batchSize = parseInt(process.env.EMAIL_DRIP_BATCH_SIZE || '50', 10);
        const batch = pending.slice(0, Math.max(0, batchSize));
        let sentCount = 0;
        let deliveredCount = 0;
        let failedCount = 0;
        const perMessageDelayMs = parseInt(process.env.EMAIL_DRIP_PER_MESSAGE_DELAY_MS || '250', 10);
        for (const rec of batch) {
            try {
                const user = await this.storage.getUser(rec.userId);
                if (!user || !user.email || !user.emailPromotions) {
                    await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'failed', errorMessage: 'no_email_or_pref' });
                    failedCount++;
                    continue;
                }
                // Deduplicate at send-time by email within this campaign to be extra safe
                // Build a set of emails that have already been sent/processing in this batch
                // Note: we can keep a local set per invocation to avoid multiple sends in same run
                if (!process._emailSendSet)
                    process._emailSendSet = new Map();
                const campaignSendSet = process._emailSendSet.get(campaign.id) || new Set();
                const emailKey = user.email.trim().toLowerCase();
                if (campaignSendSet.has(emailKey)) {
                    await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'failed', errorMessage: 'duplicate_email_suppressed' });
                    failedCount++;
                    continue;
                }
                campaignSendSet.add(emailKey);
                process._emailSendSet.set(campaign.id, campaignSendSet);
                const baseUrl = process.env.CUSTOM_DOMAIN || 'http://localhost:5000';
                const editorHtml = (campaign.htmlContent || campaign.content || '').toString();
                const templateData = {
                    clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Client',
                    clientEmail: user.email,
                    campaignTitle: campaign.name,
                    campaignSubtitle: campaign.subject || '',
                    campaignContent: editorHtml,
                    ctaButton: campaign.ctaButton,
                    ctaUrl: campaign.ctaUrl,
                    specialOffer: campaign.specialOffer,
                    promoCode: campaign.promoCode,
                    unsubscribeUrl: `${baseUrl}/api/email-marketing/unsubscribe/${user.id}`
                };
                // Always send raw editor content for marketing emails with only an unsubscribe footer
                const html = generateRawMarketingEmailHTML(editorHtml, templateData.unsubscribeUrl);
                const text = htmlToText(html);
                const emailSent = await sendEmail({
                    to: user.email,
                    from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                    subject: campaign.subject || campaign.name,
                    html,
                    text
                });
                if (emailSent) {
                    sentCount++;
                    deliveredCount++;
                    await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'sent', sentAt: new Date() });
                }
                else {
                    failedCount++;
                    await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'failed', errorMessage: 'send_failed' });
                }
            }
            catch (err) {
                failedCount++;
                await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'failed', errorMessage: err?.message || 'error' });
            }
            // Brief delay between messages to control throughput
            await new Promise(resolve => setTimeout(resolve, perMessageDelayMs));
        }
        const remainingPending = (await this.storage.getMarketingCampaignRecipients(campaign.id)).filter(r => r.status === 'pending');
        // Update campaign counters and status
        const newSent = (campaign.sentCount || 0) + sentCount;
        const newDelivered = (campaign.deliveredCount || 0) + deliveredCount;
        const newFailed = (campaign.failedCount || 0) + failedCount;
        const update = {
            status: remainingPending.length > 0 ? 'sending' : 'sent',
            sentCount: newSent,
            deliveredCount: newDelivered,
            failedCount: newFailed
        };
        if (update.status === 'sent') {
            update.sentAt = new Date();
        }
        await this.storage.updateMarketingCampaign(campaign.id, update);
        const stats = {
            totalRecipients: (allRecipients || []).length,
            sentCount: newSent,
            deliveredCount: newDelivered,
            failedCount: newFailed,
            openedCount: campaign.openedCount || 0,
            clickedCount: campaign.clickedCount || 0,
            unsubscribedCount: campaign.unsubscribedCount || 0,
            openRate: newDelivered > 0 ? ((campaign.openedCount || 0) / newDelivered) * 100 : 0,
            clickRate: newDelivered > 0 ? ((campaign.clickedCount || 0) / newDelivered) * 100 : 0,
            unsubscribeRate: newDelivered > 0 ? ((campaign.unsubscribedCount || 0) / newDelivered) * 100 : 0,
        };
        return stats;
    }
    /**
     * Ensure recipients are created for an SMS campaign (pending status)
     */
    async seedSmsRecipientsIfNeeded(campaign) {
        const existing = await this.storage.getMarketingCampaignRecipients(campaign.id);
        if (existing && existing.length > 0) {
            return;
        }
        let recipients = [];
        try {
            // Prefer storage helper if available to respect audience logic
            // @ts-ignore
            if (typeof this.storage.getUsersByAudience === 'function') {
                // Parse targetClientIds when audience is specific
                let ids;
                const raw = campaign.targetClientIds ?? undefined;
                if (Array.isArray(raw)) {
                    ids = raw.map((v) => parseInt(String(v))).filter((n) => !Number.isNaN(n));
                }
                else if (typeof raw === 'string') {
                    try {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed))
                            ids = parsed.map((v) => parseInt(String(v))).filter((n) => !Number.isNaN(n));
                    }
                    catch {
                        if (raw.startsWith('{') && raw.endsWith('}')) {
                            ids = raw
                                .slice(1, -1)
                                .split(',')
                                .map((s) => parseInt(s.trim()))
                                .filter((n) => !Number.isNaN(n));
                        }
                    }
                }
                // @ts-ignore
                recipients = await this.storage.getUsersByAudience(campaign.audience, ids);
            }
        }
        catch {
            // Fallback: all clients
            // @ts-ignore
            recipients = await this.storage.getUsersByRole?.('client');
        }
        const seenUserIds = new Set();
        const seenPhones = new Set();
        const normalizePhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
        const isSpecificAudience = (campaign.audience || '').toString().toLowerCase().includes('specific');
        for (const r of recipients || []) {
            const userId = r?.id;
            if (!userId || seenUserIds.has(userId))
                continue;
            seenUserIds.add(userId);
            const hasConsent = !!r.smsPromotions || isSpecificAudience;
            if (!r.phone || !hasConsent)
                continue;
            const phoneKey = normalizePhone(r.phone);
            if (!phoneKey)
                continue;
            if (seenPhones.has(phoneKey))
                continue; // prevent duplicate sends to same phone across multiple users
            await this.storage.createMarketingCampaignRecipient({
                campaignId: campaign.id,
                userId,
                status: 'pending',
            });
            seenPhones.add(phoneKey);
        }
    }
    /**
     * Process one SMS drip batch for a campaign. Sends up to configured batch size.
     */
    async processSmsDrip(campaign) {
        // Seed recipients on first run
        await this.seedSmsRecipientsIfNeeded(campaign);
        // Enforce 8am–8pm Central Time sending window for SMS campaigns
        const now = new Date();
        const centralNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
        const startOfWindow = new Date(centralNow);
        startOfWindow.setHours(8, 0, 0, 0);
        const endOfWindow = new Date(centralNow);
        endOfWindow.setHours(20, 0, 0, 0);
        const withinWindow = centralNow >= startOfWindow && centralNow <= endOfWindow;
        if (!withinWindow) {
            // Defer processing until next interval during allowed hours
            return { totalRecipients: (await this.storage.getMarketingCampaignRecipients(campaign.id)).length, sentCount: 0, failedCount: 0 };
        }
        const allRecipients = await this.storage.getMarketingCampaignRecipients(campaign.id);
        const pending = (allRecipients || []).filter(r => r.status === 'pending');
        const batchSize = parseInt(process.env.SMS_DRIP_BATCH_SIZE || '100', 10);
        const batch = pending.slice(0, Math.max(0, batchSize));
        let sentCount = 0;
        let failedCount = 0;
        // Send sequentially to avoid bursts; small gap for safety
        const perMessageDelayMs = parseInt(process.env.SMS_DRIP_PER_MESSAGE_DELAY_MS || '1000', 10);
        const isSpecificAudience = (campaign.audience || '').toString().toLowerCase().includes('specific');
        // Keep a per-run set of normalized phone numbers already sent for this campaign
        if (!process._smsSendSet)
            process._smsSendSet = new Map();
        const campaignSendSet = process._smsSendSet.get(campaign.id) || new Set();
        const normalizePhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
        for (const rec of batch) {
            try {
                const user = await this.storage.getUser(rec.userId);
                const hasConsent = !!user?.smsPromotions || isSpecificAudience;
                if (!user || !user.phone || !hasConsent) {
                    await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'failed', errorMessage: 'no_phone_or_pref' });
                    failedCount++;
                    continue;
                }
                // Atomically claim recipient to avoid duplicate sends across workers
                const claimed = await this.storage.claimMarketingCampaignRecipient?.(rec.id);
                if (!claimed) {
                    // Already claimed elsewhere; skip
                    continue;
                }
                // Deduplicate by normalized phone within this campaign during this run
                const phoneKey = normalizePhone(user.phone);
                if (phoneKey && campaignSendSet.has(phoneKey)) {
                    // Already sent to this phone in this run; mark as failed to avoid reprocessing
                    await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'failed', errorMessage: 'duplicate_phone_suppressed' });
                    failedCount++;
                    continue;
                }
                if (phoneKey)
                    campaignSendSet.add(phoneKey);
                process._smsSendSet.set(campaign.id, campaignSendSet);
                // Use campaign.content for SMS body; attach public media URL when media exists
                const mediaUrl = campaign.photoUrl
                    ? getPublicUrl(`/api/marketing-campaigns/${campaign.id}/photo`)
                    : undefined;
                const result = await sendSMS(user.phone, (campaign.content || '').toString(), mediaUrl);
                if (result.success) {
                    sentCount++;
                    await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'sent', sentAt: new Date() });
                }
                else {
                    failedCount++;
                    await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'failed', errorMessage: result.error || 'send_failed' });
                }
            }
            catch (err) {
                failedCount++;
                await this.storage.updateMarketingCampaignRecipient(rec.id, { status: 'failed', errorMessage: err?.message || 'error' });
            }
            // Brief delay between messages to control throughput (default 1s)
            await new Promise(resolve => setTimeout(resolve, perMessageDelayMs));
        }
        const remainingPending = (await this.storage.getMarketingCampaignRecipients(campaign.id)).filter(r => r.status === 'pending');
        // Update campaign counters and status
        const newSent = (campaign.sentCount || 0) + sentCount;
        const newFailed = (campaign.failedCount || 0) + failedCount;
        const newDelivered = (campaign.deliveredCount || 0) + sentCount;
        const update = { status: remainingPending.length > 0 ? 'sending' : 'sent', sentCount: newSent, deliveredCount: newDelivered, failedCount: newFailed };
        if (update.status === 'sent') {
            update.sentAt = new Date();
        }
        await this.storage.updateMarketingCampaign(campaign.id, update);
        return { totalRecipients: (allRecipients || []).length, sentCount, failedCount };
    }
    /**
     * Create a new marketing campaign
     */
    async createCampaign(campaignData) {
        console.log(`📝 Creating new campaign: ${campaignData.name}`);
        const campaign = await this.storage.createMarketingCampaign({
            name: campaignData.name,
            type: campaignData.type,
            audience: campaignData.audience,
            subject: campaignData.subject,
            content: campaignData.content,
            htmlContent: campaignData.htmlContent,
            templateDesign: campaignData.templateDesign,
            sendDate: campaignData.sendDate,
            status: campaignData.status,
            // extra fields omitted in DB schema
        });
        console.log(`✅ Campaign created: ${campaign.name}`);
        return campaign;
    }
    /**
     * Update a marketing campaign
     */
    async updateCampaign(campaignId, updates) {
        console.log(`📝 Updating campaign: ${campaignId}`);
        const campaign = await this.storage.updateMarketingCampaign(campaignId, updates);
        console.log(`✅ Campaign updated: ${campaign.name}`);
        return campaign;
    }
    /**
     * Get campaign statistics
     */
    async getCampaignStats(campaignId) {
        const campaign = await this.storage.getMarketingCampaign(campaignId);
        if (!campaign) {
            throw new Error('Campaign not found');
        }
        const stats = {
            totalRecipients: await this.getTargetAudienceCount(campaign.audience),
            sentCount: campaign.sentCount || 0,
            deliveredCount: campaign.deliveredCount || 0,
            failedCount: campaign.failedCount || 0,
            openedCount: campaign.openedCount || 0,
            clickedCount: campaign.clickedCount || 0,
            unsubscribedCount: campaign.unsubscribedCount || 0,
            openRate: (campaign.deliveredCount || 0) > 0 ? ((campaign.openedCount || 0) / (campaign.deliveredCount || 0)) * 100 : 0,
            clickRate: (campaign.deliveredCount || 0) > 0 ? ((campaign.clickedCount || 0) / (campaign.deliveredCount || 0)) * 100 : 0,
            unsubscribeRate: (campaign.deliveredCount || 0) > 0 ? ((campaign.unsubscribedCount || 0) / (campaign.deliveredCount || 0)) * 100 : 0
        };
        return stats;
    }
    /**
     * Get all campaigns with statistics
     */
    async getAllCampaigns() {
        const campaigns = await this.storage.getMarketingCampaigns();
        const campaignsWithStats = await Promise.all(campaigns.map(async (campaign) => {
            const stats = await this.getCampaignStats(campaign.id);
            return { ...campaign, stats };
        }));
        return campaignsWithStats;
    }
    /**
     * Send a test email for a campaign
     */
    async sendTestEmail(campaignId, testEmail) {
        console.log(`🧪 Sending test email for campaign: ${campaignId}`);
        try {
            const campaign = await this.storage.getMarketingCampaign(campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }
            const templateData = {
                clientName: 'Test Client',
                clientEmail: testEmail,
                campaignTitle: campaign.name,
                campaignSubtitle: campaign.subject || '',
                campaignContent: campaign.htmlContent || campaign.content,
                ctaButton: campaign.ctaButton,
                ctaUrl: campaign.ctaUrl,
                specialOffer: campaign.specialOffer,
                promoCode: campaign.promoCode,
                unsubscribeUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/unsubscribe/test`
            };
            const html = generateEmailHTML(marketingCampaignTemplate, templateData, `[TEST] ${campaign.subject || campaign.name}`);
            const text = generateEmailText(marketingCampaignTemplate, templateData);
            const emailSent = await sendEmail({
                to: testEmail,
                from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                subject: `[TEST] ${campaign.subject || campaign.name}`,
                html,
                text
            });
            if (emailSent) {
                console.log(`✅ Test email sent successfully to: ${testEmail}`);
                return true;
            }
            else {
                console.log(`❌ Test email failed to send to: ${testEmail}`);
                return false;
            }
        }
        catch (error) {
            console.error(`❌ Error sending test email:`, error);
            return false;
        }
    }
    /**
     * Get target audience for a campaign
     */
    async getTargetAudience(audience) {
        const allClients = await this.storage.getAllUsers();
        switch (audience) {
            case 'all_clients':
                return allClients.filter(client => client.role === 'client');
            case 'regular_clients':
                // Clients with 3+ appointments in the last 6 months
                const sixMonthsAgo = addDays(new Date(), -180);
                const regularClients = [];
                for (const client of allClients) {
                    if (client.role !== 'client')
                        continue;
                    const appointments = await this.storage.getAppointmentsByClient(client.id);
                    const recentAppointments = appointments.filter(apt => new Date(apt.startTime) > sixMonthsAgo);
                    if (recentAppointments.length >= 3) {
                        regularClients.push(client);
                    }
                }
                return regularClients;
            case 'new_clients':
                // Clients who joined in the last 30 days
                const thirtyDaysAgo = addDays(new Date(), -30);
                return allClients.filter(client => client.role === 'client' &&
                    client.createdAt &&
                    new Date(client.createdAt) > thirtyDaysAgo);
            case 'inactive_clients':
                // Clients with no appointments in the last 3 months
                const threeMonthsAgo = addDays(new Date(), -90);
                const inactiveClients = [];
                for (const client of allClients) {
                    if (client.role !== 'client')
                        continue;
                    const appointments = await this.storage.getAppointmentsByClient(client.id);
                    const recentAppointments = appointments.filter(apt => new Date(apt.startTime) > threeMonthsAgo);
                    if (recentAppointments.length === 0) {
                        inactiveClients.push(client);
                    }
                }
                return inactiveClients;
            default:
                return allClients.filter(client => client.role === 'client');
        }
    }
    /**
     * Get target audience count
     */
    async getTargetAudienceCount(audience) {
        const recipients = await this.getTargetAudience(audience);
        return recipients.length;
    }
    /**
     * Track email open
     */
    async trackEmailOpen(campaignId, recipientId) {
        try {
            const campaign = await this.storage.getMarketingCampaign(campaignId);
            if (campaign) {
                await this.storage.updateMarketingCampaign(campaignId, {
                    openedCount: (campaign.openedCount || 0) + 1
                });
            }
        }
        catch (error) {
            console.error('Error tracking email open:', error);
        }
    }
    /**
     * Track email click
     */
    async trackEmailClick(campaignId, recipientId) {
        try {
            const campaign = await this.storage.getMarketingCampaign(campaignId);
            if (campaign) {
                await this.storage.updateMarketingCampaign(campaignId, {
                    clickedCount: (campaign.clickedCount || 0) + 1
                });
            }
        }
        catch (error) {
            console.error('Error tracking email click:', error);
        }
    }
    /**
     * Track unsubscribe
     */
    async trackUnsubscribe(campaignId, recipientId) {
        try {
            const campaign = await this.storage.getMarketingCampaign(campaignId);
            if (campaign) {
                await this.storage.updateMarketingCampaign(campaignId, {
                    unsubscribedCount: (campaign.unsubscribedCount || 0) + 1
                });
            }
            // Update user preferences
            await this.storage.updateUser(recipientId, {
                emailPromotions: false
            });
        }
        catch (error) {
            console.error('Error tracking unsubscribe:', error);
        }
    }
    /**
     * Get campaign performance analytics
     */
    async getCampaignAnalytics(startDate, endDate) {
        const campaigns = await this.storage.getMarketingCampaigns();
        const dateFilteredCampaigns = campaigns.filter(campaign => {
            if (!campaign.sentAt)
                return false;
            const sentDate = new Date(campaign.sentAt);
            return sentDate >= startDate && sentDate <= endDate;
        });
        const totalCampaigns = dateFilteredCampaigns.length;
        const totalEmailsSent = dateFilteredCampaigns.reduce((sum, campaign) => sum + (campaign.sentCount || 0), 0);
        const campaignsWithRates = dateFilteredCampaigns.map(campaign => ({
            ...campaign,
            openRate: (campaign.deliveredCount || 0) > 0 ? ((campaign.openedCount || 0) / (campaign.deliveredCount || 0)) * 100 : 0,
            clickRate: (campaign.deliveredCount || 0) > 0 ? ((campaign.clickedCount || 0) / (campaign.deliveredCount || 0)) * 100 : 0
        }));
        const averageOpenRate = campaignsWithRates.length > 0
            ? campaignsWithRates.reduce((sum, campaign) => sum + campaign.openRate, 0) / campaignsWithRates.length
            : 0;
        const averageClickRate = campaignsWithRates.length > 0
            ? campaignsWithRates.reduce((sum, campaign) => sum + campaign.clickRate, 0) / campaignsWithRates.length
            : 0;
        const topPerformingCampaigns = campaignsWithRates
            .sort((a, b) => b.openRate - a.openRate)
            .slice(0, 5);
        return {
            totalCampaigns,
            totalEmailsSent,
            averageOpenRate,
            averageClickRate,
            topPerformingCampaigns
        };
    }
}
