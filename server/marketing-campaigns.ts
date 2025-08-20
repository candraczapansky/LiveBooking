import { sendEmail } from './email.js';
import { marketingCampaignTemplate, generateEmailHTML, generateEmailText } from './email-templates.js';
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
      const scheduledCampaigns = campaigns.filter(campaign => 
        campaign.status === 'scheduled' && 
        campaign.sendDate && 
        new Date() >= new Date(campaign.sendDate)
      );

      for (const campaign of scheduledCampaigns) {
        await this.sendCampaign(campaign);
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
      // Get target audience
      const recipients = await this.getTargetAudience(campaign.audience);
      
      let sentCount = 0;
      let deliveredCount = 0;
      let failedCount = 0;
      let openedCount = 0;
      let clickedCount = 0;
      let unsubscribedCount = 0;

      // Update campaign status to sending
      await this.storage.updateMarketingCampaign(campaign.id, {
        status: 'sending'
      });

      // Send emails in batches to avoid rate limits
      const batchSize = 50;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (recipient) => {
          if (!recipient.email || !recipient.emailPromotions) {
            return { success: false, reason: 'no_email_or_preferences' };
          }

          try {
            const templateData = {
              clientName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || 'Valued Client',
              clientEmail: recipient.email,
              campaignTitle: campaign.name,
              campaignSubtitle: campaign.subject || '',
              campaignContent: campaign.htmlContent || campaign.content,
              // optional campaign CTA fields may not exist in DB schema
              ctaButton: (campaign as any).ctaButton,
              ctaUrl: (campaign as any).ctaUrl,
              specialOffer: (campaign as any).specialOffer,
              promoCode: (campaign as any).promoCode,
              unsubscribeUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/unsubscribe/${recipient.id}`
            };

            const html = generateEmailHTML(marketingCampaignTemplate, templateData, campaign.subject || campaign.name);
            const text = generateEmailText(marketingCampaignTemplate, templateData);

            const emailSent = await sendEmail({
              to: recipient.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
              subject: campaign.subject || campaign.name,
              html,
              text
            });

            if (emailSent) {
              deliveredCount++;
              return { success: true };
            } else {
              failedCount++;
              return { success: false, reason: 'send_failed' };
            }
          } catch (error) {
            console.error(`Failed to send campaign email to ${recipient.email}:`, error);
            failedCount++;
            return { success: false, reason: 'error' };
          }
        });

        const results = await Promise.all(batchPromises);
        sentCount += results.filter(r => r.success).length;

        // Add delay between batches to avoid rate limits
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Calculate statistics
      const stats: CampaignStats = {
        totalRecipients: recipients.length,
        sentCount,
        deliveredCount,
        failedCount,
        openedCount,
        clickedCount,
        unsubscribedCount,
        openRate: deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0,
        clickRate: deliveredCount > 0 ? (clickedCount / deliveredCount) * 100 : 0,
        unsubscribeRate: deliveredCount > 0 ? (unsubscribedCount / deliveredCount) * 100 : 0
      };

      // Update campaign with final statistics
      await this.storage.updateMarketingCampaign(campaign.id, {
        status: 'sent',
        sentCount,
        deliveredCount,
        failedCount,
        openedCount,
        clickedCount,
        unsubscribedCount,
        sentAt: new Date()
      });

      console.log(`✅ Campaign "${campaign.name}" completed:`, stats);
      return stats;

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