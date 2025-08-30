import { sendEmail } from './email.js';
import { sendLocationMessage, upsertLocationTemplate } from './location-messenger.js';
import { sendSMS } from './sms.js';
let getPublicUrl: (path: string) => string = (p) => p;
try {
  // Lazy bind getPublicUrl if module exists when compiled
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getPublicUrl = (await import('./utils/url.js')).getPublicUrl as any;
} catch {}
let marketingCampaignTemplate: any, generateEmailHTML: any, generateEmailText: any, generateRawMarketingEmailHTML: any, htmlToText: any;
async function loadEmailTpl() {
  if (marketingCampaignTemplate) return;
  try {
    const mod = await import('./email-templates.js');
    marketingCampaignTemplate = (mod as any).marketingCampaignTemplate;
    generateEmailHTML = (mod as any).generateEmailHTML;
    generateEmailText = (mod as any).generateEmailText;
    generateRawMarketingEmailHTML = (mod as any).generateRawMarketingEmailHTML;
    htmlToText = (mod as any).htmlToText;
  } catch (e) {
    console.error('Failed to load email-templates in marketing-campaigns:', e);
  }
}
import type { IStorage } from './storage.js';
import { addDays, format } from 'date-fns';

interface CampaignData {
  id: number;
  name: string;
  type: string; // 'email' | 'sms'
  audience: string;
  subject?: string | null;
  content: string;
  htmlContent?: string | null;
  templateDesign?: string | null;
  sendDate?: Date | string | null;
  status: string;
  sentCount?: number | null;
  deliveredCount?: number | null;
  failedCount?: number | null;
  openedCount?: number | null;
  clickedCount?: number | null;
  unsubscribedCount?: number | null;
  ctaButton?: string | null;
  ctaUrl?: string | null;
  specialOffer?: string | null;
  promoCode?: string | null;
}

interface CampaignStats {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  unsubscribedCount: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
}

export class MarketingCampaignService {
  private storage: IStorage;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Start the marketing campaign service
   */
  startService(): void {
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
      } catch (error) {
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
  stopService(): void {
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
  private async processScheduledCampaigns(): Promise<void> {
    console.log('📢 Processing scheduled marketing campaigns...');

    try {
      const campaigns = await this.storage.getMarketingCampaigns();
      const now = new Date();
      const dueScheduled = campaigns.filter(campaign => 
        campaign.status === 'scheduled' && 
        campaign.sendDate && 
        now >= new Date(campaign.sendDate)
      );
      const inProgress = campaigns.filter(campaign => 
        campaign.status === 'sending'
      );

      // Process due scheduled first, then any in-progress drips
      const toProcess = [...dueScheduled, ...inProgress];
      for (const campaign of toProcess) {
        if (campaign.type === 'sms') {
          await this.processSmsDrip(campaign as any);
        } else {
          // Process email campaigns via drip as well
          await this.processEmailDrip(campaign as any);
        }
      }
    } catch (error) {
      console.error('Error processing marketing campaigns:', error);
    }
  }

  /**
   * Send a marketing campaign
   */
  async sendCampaign(campaign: CampaignData): Promise<CampaignStats> {
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

    } catch (error) {
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
  private async seedEmailRecipientsIfNeeded(campaign: CampaignData): Promise<void> {
    const existing = await this.storage.getMarketingCampaignRecipients(campaign.id);
    if (existing && existing.length > 0) {
      return;
    }
    let recipients: any[] = [];
    try {
      // Prefer storage helper if available to respect audience logic
      // @ts-ignore
      if (typeof this.storage.getUsersByAudience === 'function') {
        // Parse targetClientIds when audience is specific
        let ids: number[] | undefined;
        const raw: any = (campaign as any).targetClientIds ?? undefined;
        if (Array.isArray(raw)) {
          ids = raw.map((v: any) => parseInt(String(v))).filter((n: number) => !Number.isNaN(n));
        } else if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) ids = parsed.map((v: any) => parseInt(String(v))).filter((n: number) => !Number.isNaN(n));
          } catch {
            if (raw.startsWith('{') && raw.endsWith('}')) {
              ids = raw
                .slice(1, -1)
                .split(',')
                .map((s: string) => parseInt(s.trim()))
                .filter((n: number) => !Number.isNaN(n));
            }
          }
        }
        // @ts-ignore
        recipients = await this.storage.getUsersByAudience(campaign.audience, ids);
      }
    } catch {
      // Fallback: all clients
      // @ts-ignore
      recipients = await this.storage.getUsersByRole?.('client');
    }

    const seenUserIds = new Set<number>();
    const seenEmails = new Set<string>();
    for (const r of recipients || []) {
      const userId = r?.id;
      if (!userId || seenUserIds.has(userId)) continue;
      seenUserIds.add(userId);
      if (!r.email || !r.emailPromotions) continue;
      const emailKey = (r.email as string).trim().toLowerCase();
      if (!emailKey) continue;
      if (seenEmails.has(emailKey)) continue; // prevent duplicate sends to same email across multiple users
      await this.storage.createMarketingCampaignRecipient({
        campaignId: campaign.id,
        userId,
        status: 'pending',
      } as any);
      seenEmails.add(emailKey);
    }
  }

  /**
   * Process one EMAIL drip batch for a campaign
   */
  private async processEmailDrip(campaign: CampaignData): Promise<CampaignStats> {
    await loadEmailTpl();
    // Seed recipients on first run
    await this.seedEmailRecipientsIfNeeded(campaign);

    const allRecipients = await this.storage.getMarketingCampaignRecipients(campaign.id);
    const pending = (allRecipients || []).filter(r => (r as any).status === 'pending');
    const batchSize = parseInt(process.env.EMAIL_DRIP_BATCH_SIZE || '50', 10);
    const batch = pending.slice(0, Math.max(0, batchSize));

    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    const perMessageDelayMs = parseInt(process.env.EMAIL_DRIP_PER_MESSAGE_DELAY_MS || '250', 10);
    // Determine if campaign has a location scope from system_config (set by route when sending with locationId)
    let campaignLocationId: number | null = null;
    try {
      // @ts-ignore
      const cfg = await this.storage.getSystemConfig?.(`marketing_campaign_location:${campaign.id}`);
      const raw = (cfg?.value || cfg) as any;
      if (raw != null) {
        const n = parseInt(String((cfg?.value ?? raw)));
        if (!Number.isNaN(n)) campaignLocationId = n;
      }
    } catch {}

    for (const rec of batch) {
      try {
        const user = await this.storage.getUser((rec as any).userId);
        if (!user || !user.email || !user.emailPromotions) {
          await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'failed', errorMessage: 'no_email_or_pref' } as any);
          failedCount++;
          continue;
        }

        // Deduplicate at send-time by email within this campaign to be extra safe
        // Build a set of emails that have already been sent/processing in this batch
        // Note: we can keep a local set per invocation to avoid multiple sends in same run
        if (!(process as any)._emailSendSet) (process as any)._emailSendSet = new Map<number, Set<string>>();
        const campaignSendSet: Set<string> = (process as any)._emailSendSet.get(campaign.id) || new Set<string>();
        const emailKey = (user.email as string).trim().toLowerCase();
        if (campaignSendSet.has(emailKey)) {
          await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'failed', errorMessage: 'duplicate_email_suppressed' } as any);
          failedCount++;
          continue;
        }
        campaignSendSet.add(emailKey);
        (process as any)._emailSendSet.set(campaign.id, campaignSendSet);

        const baseUrl = process.env.CUSTOM_DOMAIN || 'http://localhost:5000';
        const editorHtml = (campaign.htmlContent || campaign.content || '').toString();
        const templateData = {
          clientName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Client',
          clientEmail: user.email,
          campaignTitle: campaign.name,
          campaignSubtitle: campaign.subject || '',
          campaignContent: editorHtml,
          ctaButton: (campaign as any).ctaButton,
          ctaUrl: (campaign as any).ctaUrl,
          specialOffer: (campaign as any).specialOffer,
          promoCode: (campaign as any).promoCode,
          unsubscribeUrl: `${baseUrl}/api/email-marketing/unsubscribe/${user.id}`
        };

        // Always send raw editor content for marketing emails with only an unsubscribe footer
        const html = generateRawMarketingEmailHTML(editorHtml, templateData.unsubscribeUrl);
        const text = htmlToText(html);

        let emailSent = false;
        if (campaignLocationId != null) {
          try {
            // Attempt to register location display name
            try {
              // @ts-ignore
              const rows = await this.storage.getAllLocations?.();
              const loc = Array.isArray(rows) ? rows.find((l: any) => String(l.id) === String(campaignLocationId)) : null;
              if (loc?.name) upsertLocationTemplate(String(campaignLocationId), { name: String(loc.name) });
            } catch {}
            const res = await sendLocationMessage({
              messageType: 'marketing',
              locationId: String(campaignLocationId),
              channel: 'email',
              to: { email: user.email, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username },
              overrides: {
                subject: campaign.subject || campaign.name,
                body: html
              }
            });
            emailSent = !!res.success;
          } catch {
            emailSent = await sendEmail({
              to: user.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
              subject: campaign.subject || campaign.name,
              html,
              text
            });
          }
        } else {
          emailSent = await sendEmail({
            to: user.email,
            from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
            subject: campaign.subject || campaign.name,
            html,
            text
          });
        }

        if (emailSent) {
          sentCount++;
          deliveredCount++;
          await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'sent', sentAt: new Date() } as any);
        } else {
          failedCount++;
          await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'failed', errorMessage: 'send_failed' } as any);
        }
      } catch (err: any) {
        failedCount++;
        await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'failed', errorMessage: err?.message || 'error' } as any);
      }
      // Brief delay between messages to control throughput
      await new Promise(resolve => setTimeout(resolve, perMessageDelayMs));
    }

    const remainingPending = (await this.storage.getMarketingCampaignRecipients(campaign.id)).filter(r => (r as any).status === 'pending');

    // Update campaign counters and status
    const newSent = (campaign.sentCount || 0) + sentCount;
    const newDelivered = (campaign.deliveredCount || 0) + deliveredCount;
    const newFailed = (campaign.failedCount || 0) + failedCount;
    const update: any = { 
      status: remainingPending.length > 0 ? 'sending' : 'sent', 
      sentCount: newSent, 
      deliveredCount: newDelivered,
      failedCount: newFailed 
    };
    if (update.status === 'sent') {
      update.sentAt = new Date();
    }
    await this.storage.updateMarketingCampaign(campaign.id, update);

    const stats: CampaignStats = {
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
  private async seedSmsRecipientsIfNeeded(campaign: CampaignData): Promise<void> {
    const existing = await this.storage.getMarketingCampaignRecipients(campaign.id);
    if (existing && existing.length > 0) {
      return;
    }
    let recipients: any[] = [];
    try {
      // Prefer storage helper if available to respect audience logic
      // @ts-ignore
      if (typeof this.storage.getUsersByAudience === 'function') {
        // Parse targetClientIds when audience is specific
        let ids: number[] | undefined;
        const raw: any = (campaign as any).targetClientIds ?? undefined;
        if (Array.isArray(raw)) {
          ids = raw.map((v: any) => parseInt(String(v))).filter((n: number) => !Number.isNaN(n));
        } else if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) ids = parsed.map((v: any) => parseInt(String(v))).filter((n: number) => !Number.isNaN(n));
          } catch {
            if (raw.startsWith('{') && raw.endsWith('}')) {
              ids = raw
                .slice(1, -1)
                .split(',')
                .map((s: string) => parseInt(s.trim()))
                .filter((n: number) => !Number.isNaN(n));
            }
          }
        }
        // @ts-ignore
        recipients = await this.storage.getUsersByAudience(campaign.audience, ids);
      }
    } catch {
      // Fallback: all clients
      // @ts-ignore
      recipients = await this.storage.getUsersByRole?.('client');
    }

    const seenUserIds = new Set<number>();
    const seenPhones = new Set<string>();
    const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-10);
    const isSpecificAudience = (campaign.audience || '').toString().toLowerCase().includes('specific');
    for (const r of recipients || []) {
      const userId = r?.id;
      if (!userId || seenUserIds.has(userId)) continue;
      seenUserIds.add(userId);
      const hasConsent = !!r.smsPromotions || isSpecificAudience;
      if (!r.phone || !hasConsent) continue;
      const phoneKey = normalizePhone(r.phone as string);
      if (!phoneKey) continue;
      if (seenPhones.has(phoneKey)) continue; // prevent duplicate sends to same phone across multiple users
      await this.storage.createMarketingCampaignRecipient({
        campaignId: campaign.id,
        userId,
        status: 'pending',
      } as any);
      seenPhones.add(phoneKey);
    }
  }

  /**
   * Process one SMS drip batch for a campaign. Sends up to configured batch size.
   */
  private async processSmsDrip(campaign: CampaignData): Promise<{ totalRecipients: number; sentCount: number; failedCount: number; }> {
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
    const pending = (allRecipients || []).filter(r => (r as any).status === 'pending');
    const batchSize = parseInt(process.env.SMS_DRIP_BATCH_SIZE || '100', 10);
    const batch = pending.slice(0, Math.max(0, batchSize));

    let sentCount = 0;
    let failedCount = 0;

    // Send sequentially to avoid bursts; small gap for safety
    const perMessageDelayMs = parseInt(process.env.SMS_DRIP_PER_MESSAGE_DELAY_MS || '1000', 10);
    const isSpecificAudience = (campaign.audience || '').toString().toLowerCase().includes('specific');
    // Keep a per-run set of normalized phone numbers already sent for this campaign
    if (!(process as any)._smsSendSet) (process as any)._smsSendSet = new Map<number, Set<string>>();
    const campaignSendSet: Set<string> = (process as any)._smsSendSet.get(campaign.id) || new Set<string>();
    const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-10);

    for (const rec of batch) {
      try {
        const user = await this.storage.getUser((rec as any).userId);
        const hasConsent = !!user?.smsPromotions || isSpecificAudience;
        if (!user || !user.phone || !hasConsent) {
          await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'failed', errorMessage: 'no_phone_or_pref' } as any);
          failedCount++;
          continue;
        }

        // Atomically claim recipient to avoid duplicate sends across workers
        const claimed = await (this.storage as any).claimMarketingCampaignRecipient?.((rec as any).id);
        if (!claimed) {
          // Already claimed elsewhere; skip
          continue;
        }

        // Deduplicate by normalized phone within this campaign during this run
        const phoneKey = normalizePhone(user.phone as string);
        if (phoneKey && campaignSendSet.has(phoneKey)) {
          // Already sent to this phone in this run; mark as failed to avoid reprocessing
          await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'failed', errorMessage: 'duplicate_phone_suppressed' } as any);
          failedCount++;
          continue;
        }
        if (phoneKey) campaignSendSet.add(phoneKey);
        (process as any)._smsSendSet.set(campaign.id, campaignSendSet);

        // Use campaign.content for SMS body; attach public media URL when media exists
        const mediaUrl = (campaign as any).photoUrl
          ? getPublicUrl(`/api/marketing-campaigns/${campaign.id}/photo`)
          : undefined;
        const result = await sendSMS(
          user.phone,
          (campaign.content || '').toString(),
          mediaUrl
        );
        if (result.success) {
          sentCount++;
          await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'sent', sentAt: new Date() } as any);
        } else {
          failedCount++;
          await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'failed', errorMessage: result.error || 'send_failed' } as any);
        }
      } catch (err: any) {
        failedCount++;
        await this.storage.updateMarketingCampaignRecipient((rec as any).id, { status: 'failed', errorMessage: err?.message || 'error' } as any);
      }
      // Brief delay between messages to control throughput (default 1s)
      await new Promise(resolve => setTimeout(resolve, perMessageDelayMs));
    }

    const remainingPending = (await this.storage.getMarketingCampaignRecipients(campaign.id)).filter(r => (r as any).status === 'pending');

    // Update campaign counters and status
    const newSent = (campaign.sentCount || 0) + sentCount;
    const newFailed = (campaign.failedCount || 0) + failedCount;
    const newDelivered = (campaign.deliveredCount || 0) + sentCount;
    const update: any = { status: remainingPending.length > 0 ? 'sending' : 'sent', sentCount: newSent, deliveredCount: newDelivered, failedCount: newFailed };
    if (update.status === 'sent') {
      update.sentAt = new Date();
    }
    await this.storage.updateMarketingCampaign(campaign.id, update);

    return { totalRecipients: (allRecipients || []).length, sentCount, failedCount };
  }

  /**
   * Create a new marketing campaign
   */
  async createCampaign(campaignData: Omit<CampaignData, 'id' | 'sentCount' | 'deliveredCount' | 'failedCount' | 'openedCount' | 'clickedCount' | 'unsubscribedCount'>): Promise<CampaignData> {
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
  async updateCampaign(campaignId: number, updates: Partial<CampaignData>): Promise<CampaignData> {
    console.log(`📝 Updating campaign: ${campaignId}`);

    const campaign = await this.storage.updateMarketingCampaign(campaignId, updates);
    console.log(`✅ Campaign updated: ${campaign.name}`);
    return campaign;
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: number): Promise<CampaignStats> {
    const campaign = await this.storage.getMarketingCampaign(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const stats: CampaignStats = {
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
  async getAllCampaigns(): Promise<(CampaignData & { stats: CampaignStats })[]> {
    const campaigns = await this.storage.getMarketingCampaigns();
    
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const stats = await this.getCampaignStats(campaign.id);
        return { ...campaign, stats };
      })
    );

    return campaignsWithStats;
  }

  /**
   * Send a test email for a campaign
   */
  async sendTestEmail(campaignId: number, testEmail: string): Promise<boolean> {
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
        ctaButton: (campaign as any).ctaButton,
        ctaUrl: (campaign as any).ctaUrl,
        specialOffer: (campaign as any).specialOffer,
        promoCode: (campaign as any).promoCode,
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
      } else {
        console.log(`❌ Test email failed to send to: ${testEmail}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error sending test email:`, error);
      return false;
    }
  }

  /**
   * Get target audience for a campaign
   */
  private async getTargetAudience(audience: string): Promise<any[]> {
    const allClients = await this.storage.getAllUsers();
    
    switch (audience) {
      case 'all_clients':
        return allClients.filter(client => client.role === 'client');
      
      case 'regular_clients':
        // Clients with 3+ appointments in the last 6 months
        const sixMonthsAgo = addDays(new Date(), -180);
        const regularClients = [];
        
        for (const client of allClients) {
          if (client.role !== 'client') continue;
          
          const appointments = await this.storage.getAppointmentsByClient(client.id);
          const recentAppointments = appointments.filter(apt => 
            new Date(apt.startTime) > sixMonthsAgo
          );
          
          if (recentAppointments.length >= 3) {
            regularClients.push(client);
          }
        }
        
        return regularClients;
      
      case 'new_clients':
        // Clients who joined in the last 30 days
        const thirtyDaysAgo = addDays(new Date(), -30);
        return allClients.filter(client => 
          client.role === 'client' && 
          client.createdAt && 
          new Date(client.createdAt) > thirtyDaysAgo
        );
      
      case 'inactive_clients':
        // Clients with no appointments in the last 3 months
        const threeMonthsAgo = addDays(new Date(), -90);
        const inactiveClients = [];
        
        for (const client of allClients) {
          if (client.role !== 'client') continue;
          
          const appointments = await this.storage.getAppointmentsByClient(client.id);
          const recentAppointments = appointments.filter(apt => 
            new Date(apt.startTime) > threeMonthsAgo
          );
          
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
  private async getTargetAudienceCount(audience: string): Promise<number> {
    const recipients = await this.getTargetAudience(audience);
    return recipients.length;
  }

  /**
   * Track email open
   */
  async trackEmailOpen(campaignId: number, recipientId: number): Promise<void> {
    try {
      const campaign = await this.storage.getMarketingCampaign(campaignId);
      if (campaign) {
        await this.storage.updateMarketingCampaign(campaignId, {
          openedCount: (campaign.openedCount || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error tracking email open:', error);
    }
  }

  /**
   * Track email click
   */
  async trackEmailClick(campaignId: number, recipientId: number): Promise<void> {
    try {
      const campaign = await this.storage.getMarketingCampaign(campaignId);
      if (campaign) {
        await this.storage.updateMarketingCampaign(campaignId, {
          clickedCount: (campaign.clickedCount || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error tracking email click:', error);
    }
  }

  /**
   * Track unsubscribe
   */
  async trackUnsubscribe(campaignId: number, recipientId: number): Promise<void> {
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
    } catch (error) {
      console.error('Error tracking unsubscribe:', error);
    }
  }

  /**
   * Get campaign performance analytics
   */
  async getCampaignAnalytics(startDate: Date, endDate: Date): Promise<{
    totalCampaigns: number;
    totalEmailsSent: number;
    averageOpenRate: number;
    averageClickRate: number;
    topPerformingCampaigns: CampaignData[];
  }> {
    const campaigns = await this.storage.getMarketingCampaigns();
    
    const dateFilteredCampaigns = campaigns.filter(campaign => {
      if (!campaign.sentAt) return false;
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