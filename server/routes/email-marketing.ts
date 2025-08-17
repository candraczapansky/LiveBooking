import express from 'express';
import { EmailAutomationService } from '../email-automation';
import { MarketingCampaignService } from '../marketing-campaigns';
import { sendEmail } from '../email';
import { 
  appointmentConfirmationTemplate, 
  appointmentReminderTemplate, 
  followUpTemplate,
  birthdayTemplate,
  generateEmailHTML,
  generateEmailText
} from '../email-templates';
import type { IStorage } from '../storage';
import { addDays, format } from 'date-fns';

const router = express.Router();

// Initialize services
let emailAutomationService: EmailAutomationService;
let marketingCampaignService: MarketingCampaignService;
let storageInstance: IStorage;

export function initializeEmailMarketingRoutes(storage: IStorage) {
  storageInstance = storage;
  emailAutomationService = new EmailAutomationService(storage);
  marketingCampaignService = new MarketingCampaignService(storage);
}

// ===== EMAIL AUTOMATION ROUTES =====

// Send immediate appointment confirmation
router.post('/automation/appointment-confirmation', async (req, res) => {
  try {
    const { appointmentId } = req.body;
    
    if (!appointmentId) {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }

    const appointment = await storageInstance.getAppointment(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const [client, service, staffUser] = await Promise.all([
      storageInstance.getUser(appointment.clientId),
      storageInstance.getService(appointment.serviceId),
      storageInstance.getUser(appointment.staffId)
    ]);

    if (!client || !service || !staffUser) {
      return res.status(400).json({ error: 'Missing appointment data' });
    }

    // Create staff data object with user info
    const staff = {
      id: appointment.staffId,
      userId: appointment.staffId,
      user: {
        firstName: staffUser.firstName,
        lastName: staffUser.lastName
      }
    };

    // Convert appointment to expected format
    const appointmentData = {
      id: appointment.id,
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      startTime: appointment.startTime.toISOString(),
      endTime: appointment.endTime.toISOString(),
      status: appointment.status,
      totalAmount: appointment.totalAmount
    };

    await emailAutomationService.sendAppointmentConfirmation(appointmentData, client, service, staff);

    res.json({ 
      success: true, 
      message: 'Appointment confirmation email sent successfully' 
    });
  } catch (error) {
    console.error('Error sending appointment confirmation:', error);
    res.status(500).json({ error: 'Failed to send appointment confirmation email' });
  }
});

// Manually trigger appointment reminders
router.post('/automation/trigger-reminders', async (req, res) => {
  try {
    await emailAutomationService['processAppointmentReminders']();
    
    res.json({ 
      success: true, 
      message: 'Appointment reminders processed successfully' 
    });
  } catch (error) {
    console.error('Error triggering reminders:', error);
    res.status(500).json({ error: 'Failed to process appointment reminders' });
  }
});

// Manually trigger follow-up emails
router.post('/automation/trigger-follow-ups', async (req, res) => {
  try {
    await emailAutomationService['processFollowUpEmails']();
    
    res.json({ 
      success: true, 
      message: 'Follow-up emails processed successfully' 
    });
  } catch (error) {
    console.error('Error triggering follow-ups:', error);
    res.status(500).json({ error: 'Failed to process follow-up emails' });
  }
});

// Manually trigger birthday emails
router.post('/automation/trigger-birthdays', async (req, res) => {
  try {
    await emailAutomationService['processBirthdayEmails']();
    
    res.json({ 
      success: true, 
      message: 'Birthday emails processed successfully' 
    });
  } catch (error) {
    console.error('Error triggering birthday emails:', error);
    res.status(500).json({ error: 'Failed to process birthday emails' });
  }
});

// ===== MARKETING CAMPAIGN ROUTES =====

// Get all campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await marketingCampaignService.getAllCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get campaign by ID
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await storageInstance.getMarketingCampaign(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const stats = await marketingCampaignService.getCampaignStats(campaignId);
    res.json({ ...campaign, stats });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Create new campaign
router.post('/campaigns', async (req, res) => {
  try {
    const campaignData = req.body;
    
    // Validate required fields
    if (!campaignData.name || !campaignData.type || !campaignData.audience || !campaignData.content) {
      return res.status(400).json({ 
        error: 'Name, type, audience, and content are required' 
      });
    }

    const campaign = await marketingCampaignService.createCampaign(campaignData);
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const updates = req.body;
    
    const campaign = await marketingCampaignService.updateCampaign(campaignId, updates);
    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Send campaign immediately
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = await storageInstance.getMarketingCampaign(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const stats = await marketingCampaignService.sendCampaign(campaign);
    res.json({ 
      success: true, 
      message: 'Campaign sent successfully',
      stats 
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// Send test email for campaign
router.post('/campaigns/:id/test', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ error: 'Test email is required' });
    }

    const success = await marketingCampaignService.sendTestEmail(campaignId, testEmail);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully' 
      });
    } else {
      res.status(500).json({ error: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Get campaign analytics
router.get('/campaigns/:id/analytics', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const stats = await marketingCampaignService.getCampaignStats(campaignId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
});

// Get overall campaign analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate as string) : addDays(new Date(), -30);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const analytics = await marketingCampaignService.getCampaignAnalytics(start, end);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ===== EMAIL TEMPLATE ROUTES =====

// Send custom email using template
router.post('/send-template', async (req, res) => {
  try {
    const { 
      templateType, 
      recipientEmail, 
      recipientName, 
      data,
      subject 
    } = req.body;

    if (!templateType || !recipientEmail) {
      return res.status(400).json({ error: 'Template type and recipient email are required' });
    }

    let template;
    let defaultSubject = '';

    switch (templateType) {
      case 'appointment_confirmation':
        template = appointmentConfirmationTemplate;
        defaultSubject = 'Appointment Confirmed';
        break;
      case 'appointment_reminder':
        template = appointmentReminderTemplate;
        defaultSubject = 'Appointment Reminder';
        break;
      case 'follow_up':
        template = followUpTemplate;
        defaultSubject = 'Thank You for Your Visit';
        break;
      case 'birthday':
        template = birthdayTemplate;
        defaultSubject = 'Happy Birthday from Glo Head Spa!';
        break;
      default:
        return res.status(400).json({ error: 'Invalid template type' });
    }

    const templateData = {
      clientName: recipientName || 'Valued Client',
      clientEmail: recipientEmail,
      ...data
    };

    const html = generateEmailHTML(template, templateData, subject || defaultSubject);
    const text = generateEmailText(template, templateData);

    const emailSent = await sendEmail({
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
      subject: subject || defaultSubject,
      html,
      text
    });

    if (emailSent) {
      res.json({ 
        success: true, 
        message: 'Email sent successfully' 
      });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error sending template email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get available template types
router.get('/templates', (req, res) => {
  const templates = [
    {
      id: 'appointment_confirmation',
      name: 'Appointment Confirmation',
      description: 'Sent immediately after booking an appointment',
      variables: ['clientName', 'serviceName', 'appointmentDate', 'appointmentTime', 'duration', 'staffName', 'totalAmount']
    },
    {
      id: 'appointment_reminder',
      name: 'Appointment Reminder',
      description: 'Sent 24 hours before appointment',
      variables: ['clientName', 'serviceName', 'appointmentDate', 'appointmentTime', 'duration', 'staffName', 'salonAddress', 'salonPhone']
    },
    {
      id: 'follow_up',
      name: 'Follow-up Email',
      description: 'Sent 1 day after appointment completion',
      variables: ['clientName', 'serviceName', 'appointmentDate', 'staffName', 'careTips']
    },
    {
      id: 'birthday',
      name: 'Birthday Email',
      description: 'Sent on client birthday with special offer',
      variables: ['clientName', 'birthdayYear', 'discountPercent', 'expiryDate']
    }
  ];

  res.json(templates);
});

// ===== TRACKING ROUTES =====

// Track email open
router.get('/track/open/:campaignId/:recipientId', async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;
    
    await marketingCampaignService.trackEmailOpen(parseInt(campaignId), parseInt(recipientId));
    
    // Return a 1x1 transparent pixel
    res.set('Content-Type', 'image/png');
    res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
  } catch (error) {
    console.error('Error tracking email open:', error);
    res.status(500).send('Error');
  }
});

// Track email click
router.get('/track/click/:campaignId/:recipientId', async (req, res) => {
  try {
    const { campaignId, recipientId } = req.params;
    const { url } = req.query;
    
    await marketingCampaignService.trackEmailClick(parseInt(campaignId), parseInt(recipientId));
    
    // Redirect to the original URL
    if (url) {
      res.redirect(url as string);
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error('Error tracking email click:', error);
    res.redirect('/');
  }
});

// Unsubscribe from emails
router.get('/unsubscribe/:recipientId', async (req, res) => {
  try {
    const { recipientId } = req.params;
    
    await marketingCampaignService.trackUnsubscribe(0, parseInt(recipientId));
    
    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed from marketing emails' 
    });
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    res.status(500).json({ error: 'Failed to process unsubscribe' });
  }
});

// ===== BULK EMAIL ROUTES =====

// Send bulk promotional email
router.post('/bulk/promotional', async (req, res) => {
  try {
    const { 
      recipientIds, 
      subject, 
      content, 
      htmlContent,
      ctaButton,
      ctaUrl,
      specialOffer,
      promoCode 
    } = req.body;

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: 'Recipient IDs array is required' });
    }

    if (!subject || !content) {
      return res.status(400).json({ error: 'Subject and content are required' });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const recipientId of recipientIds) {
      try {
        const recipient = await storageInstance.getUser(recipientId);
        if (!recipient || !recipient.email || !recipient.emailPromotions) {
          failedCount++;
          continue;
        }

        const templateData = {
          clientName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || 'Valued Client',
          clientEmail: recipient.email,
          campaignTitle: subject,
          campaignSubtitle: '',
          campaignContent: htmlContent || content,
          ctaButton,
          ctaUrl,
          specialOffer,
          promoCode,
          unsubscribeUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/unsubscribe/${recipient.id}`
        };

        const html = generateEmailHTML(require('../email-templates').marketingCampaignTemplate, templateData, subject);
        const text = generateEmailText(require('../email-templates').marketingCampaignTemplate, templateData);

        const emailSent = await sendEmail({
          to: recipient.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
          subject,
          html,
          text
        });

        if (emailSent) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Failed to send email to recipient ${recipientId}:`, error);
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: 'Bulk promotional emails sent',
      sentCount,
      failedCount,
      totalRecipients: recipientIds.length
    });
  } catch (error) {
    console.error('Error sending bulk promotional emails:', error);
    res.status(500).json({ error: 'Failed to send bulk promotional emails' });
  }
});

export { router as emailMarketingRoutes }; 