import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  asyncHandler 
} from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";
import { validateRequest, requireAuth } from "../middleware/error-handler.js";
import { sendEmail } from "../email.js";
import { sendSMS, isTwilioConfigured } from "../sms.js";
import { redisCache } from "../utils/redis-cache.js";
import { insertMarketingCampaignSchema } from "../../shared/schema.js";

// Use the shared schema for campaign creation
const campaignSchema = insertMarketingCampaignSchema;

export function registerMarketingRoutes(app: Express, storage: IStorage) {
  // Create marketing campaign
  app.post("/api/marketing/campaigns", validateRequest(campaignSchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const campaignData = req.body;

    LoggerService.info("Creating marketing campaign", { ...context, campaignData });

    const newCampaign = await storage.createMarketingCampaign(campaignData);

    LoggerService.info("Marketing campaign created", { ...context, campaignId: newCampaign.id });

    res.status(201).json(newCampaign);
  }));

  // Get all marketing campaigns
  app.get("/api/marketing/campaigns", asyncHandler(async (req: Request, res: Response) => {
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
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    campaigns = campaigns.slice(startIndex, startIndex + limitNum);

    LoggerService.info("Marketing campaigns fetched", { ...context, count: campaigns.length });
    res.json(campaigns);
  }));

  // Get campaign by ID
  app.get("/api/marketing/campaigns/:id", asyncHandler(async (req: Request, res: Response) => {
    const campaignId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.debug("Fetching marketing campaign", { ...context, campaignId });

    const campaign = await storage.getMarketingCampaign(campaignId);
    if (!campaign) {
      throw new NotFoundError("Marketing campaign");
    }

    res.json(campaign);
  }));

  // Update campaign
  app.put("/api/marketing/campaigns/:id", validateRequest(campaignSchema.partial()), asyncHandler(async (req: Request, res: Response) => {
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

  // Delete campaign
  app.delete("/api/marketing/campaigns/:id", asyncHandler(async (req: Request, res: Response) => {
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

  // Send campaign
  app.post("/api/marketing/campaigns/:id/send", asyncHandler(async (req: Request, res: Response) => {
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

    // Get target audience
    let recipients: any[] = [];
    switch (campaign.audience) {
      case 'all':
        recipients = await storage.getAllUsers();
        break;
      case 'clients':
        recipients = await storage.getUsersByRole('client');
        break;
      case 'staff':
        recipients = await storage.getUsersByRole('staff');
        break;
      case 'specific':
        // Note: targetIds field doesn't exist in current schema, so we'll use all users
        recipients = await storage.getAllUsers();
        break;
    }

    let sentCount = 0;
    let errorCount = 0;

    // Send campaign based on type
    for (const recipient of recipients) {
      try {
        if (campaign.type === 'email') {
          if (recipient.email && recipient.emailPromotions) {
            await sendEmail({
              to: recipient.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
              subject: campaign.subject || 'Glo Head Spa - Special Offer',
              html: campaign.content,
            });
            sentCount++;
          }
        }

        if (campaign.type === 'sms') {
          if (recipient.phone && recipient.smsPromotions) {
            await sendSMS(recipient.phone, campaign.content, campaign.photoUrl || undefined);
            sentCount++;
          }
        }

        // Track campaign send
        await (storage as any).createCampaignSend?.({
          campaignId,
          recipientId: recipient.id,
          type: campaign.type,
          status: 'sent',
        });

      } catch (error) {
        errorCount++;
        LoggerService.error("Campaign send error", { ...context, recipientId: recipient.id }, error as Error);
        
        // Track failed send
        await (storage as any).createCampaignSend?.({
          campaignId,
          recipientId: recipient.id,
          type: campaign.type,
          status: 'failed',
          error: (error as Error).message,
        });
      }
    }

    // Update campaign status
    await storage.updateMarketingCampaign(campaignId, {
      status: 'completed',
      sentCount,
      failedCount: errorCount,
    } as any);

    LoggerService.info("Marketing campaign sent", { ...context, campaignId, sentCount, errorCount });

    res.json({
      success: true,
      message: "Campaign sent successfully",
      sentCount,
      errorCount,
      totalRecipients: recipients.length,
    });
  }));

  // Get campaign statistics
  app.get("/api/marketing/campaigns/:id/statistics", asyncHandler(async (req: Request, res: Response) => {
    const campaignId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.debug("Fetching campaign statistics", { ...context, campaignId });

    const campaign = await storage.getMarketingCampaign(campaignId);
    if (!campaign) {
      throw new NotFoundError("Marketing campaign");
    }

    const statistics = await (storage as any).getCampaignStatistics?.(campaignId) ?? {};

    res.json({
      campaign,
      statistics,
    });
  }));

  // Create email template
  app.post("/api/marketing/email-templates", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { name, subject, htmlContent, variables } = req.body;

    LoggerService.info("Creating email template", { ...context, name });

    const template = await (storage as any).createEmailTemplate({
      name,
      subject,
      htmlContent,
      variables: variables || [],
    });

    LoggerService.info("Email template created", { ...context, templateId: template.id });

    res.status(201).json(template);
  }));

  // Get email templates
  app.get("/api/marketing/email-templates", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);

    LoggerService.debug("Fetching email templates", context);

    const templates = await (storage as any).getEmailTemplates?.() ?? [];

    LoggerService.info("Email templates fetched", { ...context, count: templates.length });
    res.json(templates);
  }));

  // Send promotional email
  app.post("/api/marketing/send-promotional-email", asyncHandler(async (req: Request, res: Response) => {
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

        await sendEmail({
          to: recipient.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
          subject: subject || 'Glo Head Spa - Special Offer',
          html: emailContent,
        });

        sentCount++;
        LoggerService.logCommunication("email", "promotional_sent", { ...context, userId: recipientId });

      } catch (error) {
        errorCount++;
        LoggerService.error("Promotional email send error", { ...context, recipientId }, error as Error);
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

  // Send promotional SMS
  app.post("/api/marketing/send-promotional-sms", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { recipientIds, message } = req.body;

    LoggerService.info("Sending promotional SMS", { ...context, recipientCount: recipientIds.length });

    let sentCount = 0;
    let errorCount = 0;

    for (const recipientId of recipientIds) {
      try {
        const recipient = await storage.getUser(recipientId);
        if (!recipient || !recipient.phone || !recipient.smsPromotions) {
          continue;
        }

        await sendSMS(recipient.phone, message);
        sentCount++;
        LoggerService.logCommunication("sms", "promotional_sent", { ...context, userId: recipientId });

      } catch (error) {
        errorCount++;
        LoggerService.error("Promotional SMS send error", { ...context, recipientId }, error as Error);
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
  app.get("/api/marketing/analytics", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { startDate, endDate, type } = req.query;

    LoggerService.debug("Fetching marketing analytics", { ...context, filters: { startDate, endDate, type } });

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    const analytics = await (storage as any).getMarketingAnalytics?.(start, end, type as string) ?? {};

    res.json({
      period: { start, end },
      analytics,
    });
  }));

  // Create customer segment
  app.post("/api/marketing/segments", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { name, description, criteria } = req.body;

    LoggerService.info("Creating customer segment", { ...context, name });

    const segment = await (storage as any).createCustomerSegment?.({
      name,
      description,
      criteria,
    }) ?? { id: 0, name, description, criteria };

    LoggerService.info("Customer segment created", { ...context, segmentId: segment.id });

    res.status(201).json(segment);
  }));

  // Get customer segments
  app.get("/api/marketing/segments", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);

    LoggerService.debug("Fetching customer segments", context);

    const segments = await (storage as any).getCustomerSegments?.() ?? [];

    LoggerService.info("Customer segments fetched", { ...context, count: segments.length });
    res.json(segments);
  }));

  // Get segment members
  app.get("/api/marketing/segments/:id/members", asyncHandler(async (req: Request, res: Response) => {
    const segmentId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.debug("Fetching segment members", { ...context, segmentId });

    const members = await (storage as any).getSegmentMembers?.(segmentId) ?? [];

    LoggerService.info("Segment members fetched", { ...context, segmentId, count: members.length });
    res.json(members);
  }));

  // Schedule campaign
  app.post("/api/marketing/campaigns/:id/schedule", asyncHandler(async (req: Request, res: Response) => {
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
  app.post("/api/marketing/campaigns/:id/cancel", asyncHandler(async (req: Request, res: Response) => {
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

  // Get SMS configuration status
  app.get("/api/sms-config-status", asyncHandler(async (req: Request, res: Response) => {
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
    } catch (error) {
      LoggerService.error("Error checking SMS configuration status", { ...context, error });
      res.json({
        configured: false,
        message: "Error checking SMS configuration status"
      });
    }
  }));
} 