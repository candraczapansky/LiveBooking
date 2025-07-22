import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

// Initialize SendGrid with environment variable (fallback)
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized with environment API key');
} else {
  console.log('SendGrid API key not found in environment. Email functionality will be disabled.');
}

interface EmailParams {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Try to get SendGrid configuration from database first
    let apiKey = process.env.SENDGRID_API_KEY;
    let fromEmail = process.env.SENDGRID_FROM_EMAIL;
    
    // If we have a database connection, try to get config from there
    try {
      const { DatabaseConfig } = await import('./config');
      const { DatabaseStorage } = await import('./storage');
      const storage = new DatabaseStorage();
      const dbConfig = new DatabaseConfig(storage);
      
      const dbApiKey = await dbConfig.getSendGridKey();
      const dbFromEmail = await dbConfig.getSendGridFromEmail();
      
      if (dbApiKey) apiKey = dbApiKey;
      if (dbFromEmail) fromEmail = dbFromEmail;
    } catch (error) {
      console.log('Using environment variables for SendGrid config');
    }
    
    if (!apiKey) {
      console.log('SendGrid API key not available. Skipping email send.');
      return false;
    }
    
    // Create mail service with current API key
    const currentMailService = new MailService();
    currentMailService.setApiKey(apiKey);
    
    // Use database from email if available, otherwise use the one provided
    const finalFromEmail = fromEmail || params.from;
    
    const msg: any = {
      to: params.to,
      from: finalFromEmail,
      subject: params.subject,
    };

    if (params.templateId) {
      msg.templateId = params.templateId;
      msg.dynamicTemplateData = params.dynamicTemplateData;
    } else {
      if (params.html) {
        msg.html = params.html;
      }
      if (params.text) {
        msg.text = params.text;
      }
    }

    const response = await currentMailService.send(msg);
    console.log('Email sent successfully to:', params.to);
    console.log('SendGrid response:', JSON.stringify(response, null, 2));
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
    }
    return false;
  }
}

export async function sendBulkEmail(emails: EmailParams[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmail(email);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

// Template functions for common email types
export function createAppointmentReminderEmail(
  clientEmail: string,
  clientName: string,
  appointmentDate: string,
  appointmentTime: string,
  serviceName: string,
  salonEmail: string
): EmailParams {
  return {
    to: clientEmail,
    from: salonEmail,
    subject: `Appointment Reminder - ${serviceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e91e63;">Appointment Reminder</h2>
        <p>Dear ${clientName},</p>
        <p>This is a friendly reminder about your upcoming appointment:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
        </div>
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>Glo Head Spa Team</p>
      </div>
    `,
    text: `Dear ${clientName}, this is a reminder about your upcoming ${serviceName} appointment on ${appointmentDate} at ${appointmentTime}.`
  };
}

export function createMarketingCampaignEmail(
  clientEmail: string,
  clientName: string,
  subject: string,
  content: string,
  salonEmail: string,
  trackingToken?: string
): EmailParams {
  const baseUrl = process.env.CUSTOM_DOMAIN || 'https://gloupheadspa.app' || (process.env.REPLIT_DOMAINS ? 
    `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
    'http://localhost:5000');
  
  const trackingPixel = trackingToken ? 
    `<img src="${baseUrl}/api/track/open/${trackingToken}" width="1" height="1" style="display:none;" alt="">` : 
    '';
  
  const unsubscribeLink = trackingToken ? 
    `${baseUrl}/api/unsubscribe/${trackingToken}` : 
    '#';

  return {
    to: clientEmail,
    from: salonEmail,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #e91e63; color: white; padding: 20px; text-align: center;">
          <h1>Glo Head Spa</h1>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${clientName},</p>
          ${content}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            You received this email because you are a valued client of Glo Head Spa.
            <br><br>
            <a href="${unsubscribeLink}" style="color: #999; text-decoration: underline;">
              Unsubscribe from marketing emails
            </a>
          </p>
        </div>
        ${trackingPixel}
      </div>
    `,
    text: `Dear ${clientName}, ${content.replace(/<[^>]*>/g, '')}

To unsubscribe from marketing emails, visit: ${unsubscribeLink}`
  };
}

export function createAccountUpdateEmail(
  clientEmail: string,
  clientName: string,
  updateType: string,
  details: string,
  salonEmail: string
): EmailParams {
  return {
    to: clientEmail,
    from: salonEmail,
    subject: `Account Update - ${updateType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e91e63;">Account Update</h2>
        <p>Dear ${clientName},</p>
        <p>Your account has been updated:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Update Type:</strong> ${updateType}</p>
          <p><strong>Details:</strong> ${details}</p>
        </div>
        <p>If you have any questions, please contact us.</p>
        <p>Best regards,<br>Glo Head Spa Team</p>
      </div>
    `,
    text: `Dear ${clientName}, your account has been updated. ${updateType}: ${details}`
  };
}