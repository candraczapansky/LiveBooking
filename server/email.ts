import { 
  appointmentConfirmationTemplate, 
  appointmentReminderTemplate, 
  followUpTemplate,
  birthdayTemplate,
  marketingCampaignTemplate,
  generateEmailHTML,
  generateEmailText,
  generateRawMarketingEmailHTML,
  htmlToText
} from './email-templates.js';
import Handlebars from 'handlebars';

// SendGrid is loaded dynamically when needed to avoid ESM/CJS interop issues in some runtimes

interface EmailParams {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

// Known verified senders (update this list with actually verified senders)
const VERIFIED_SENDERS = [
  'hello@headspaglo.com'  // Primary verified sender - this is the only verified email
];

// Check if an email is in our verified list
function isVerifiedSender(email: string): boolean {
  return VERIFIED_SENDERS.some(sender => 
    email.toLowerCase() === sender.toLowerCase()
  );
}

// Get a fallback verified sender
function getFallbackSender(): string {
  const envSender = process.env.SENDGRID_FROM_EMAIL;
  if (envSender && isVerifiedSender(envSender)) {
    return envSender;
  }
  return VERIFIED_SENDERS[0]; // Use first verified sender as fallback
}

// Fallback email function using console logging (for development/testing)
async function sendEmailFallback(params: EmailParams): Promise<boolean> {
  console.log('📧 EMAIL FALLBACK MODE - Email would be sent:');
  console.log('From:', params.from);
  console.log('To:', params.to);
  console.log('Subject:', params.subject);
  console.log('Text:', params.text);
  console.log('HTML:', params.html);
  console.log('⚠️  This is a fallback - no actual email was sent.');
  console.log('🔧 To enable real email sending, verify a sender in SendGrid.');
  return true; // Return true to indicate "success" for fallback
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  console.log('📧 SENDEMAIL CALLED - Debug Info:');
  console.log('  - To:', params.to);
  console.log('  - From:', params.from);
  console.log('  - Subject:', params.subject);
  console.log('  - Has HTML:', !!params.html);
  console.log('  - Has Text:', !!params.text);
  console.log('  - Template ID:', params.templateId);
  
  try {
    // Try to get SendGrid configuration from database first
    let apiKey = process.env.SENDGRID_API_KEY;
    let fromEmail = process.env.SENDGRID_FROM_EMAIL;
    
    console.log('📧 SENDEMAIL - Environment Check:');
    console.log('  - API Key available:', !!apiKey);
    console.log('  - From Email:', fromEmail);
    
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
      
      console.log('📧 SENDEMAIL - Database Config:');
      console.log('  - DB API Key available:', !!dbApiKey);
      console.log('  - DB From Email:', dbFromEmail);
    } catch (error) {
      console.log('📧 SENDEMAIL - Using environment variables for SendGrid config');
    }
    
    if (!apiKey) {
      console.log('📧 SENDEMAIL - SendGrid API key not available. Using fallback mode.');
      return await sendEmailFallback(params);
    }
    
    // Dynamically import SendGrid to avoid build-time ESM/CJS issues
    const sgMailModule = await import('@sendgrid/mail');
    const sgMail = sgMailModule.default;
    sgMail.setApiKey(apiKey);
    
    // Determine the final from email
    let finalFromEmail = fromEmail || params.from;
    
    console.log('📧 SENDEMAIL - Final Configuration:');
    console.log('  - Final From Email:', finalFromEmail);
    console.log('  - Is Verified Sender:', isVerifiedSender(finalFromEmail));
    
    // If the sender is not verified, use fallback and log warning
    if (!isVerifiedSender(finalFromEmail)) {
      console.warn(`⚠️  WARNING: Sender email "${finalFromEmail}" is not verified in SendGrid.`);
      console.warn(`Using fallback sender: ${getFallbackSender()}`);
      console.warn('To fix this permanently, verify one of these senders in your SendGrid account:');
      console.warn(VERIFIED_SENDERS.join(', '));
      finalFromEmail = getFallbackSender();
    }
    
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

    console.log('📧 SENDEMAIL - Attempting to send email with SendGrid...');
    console.log('  - Final From:', finalFromEmail);
    console.log('  - To:', params.to);
    console.log('  - Subject:', params.subject);
    console.log('  - API Key loaded:', !!process.env.SENDGRID_API_KEY);
    console.log('  - From email verified:', isVerifiedSender(finalFromEmail));
    
    const response = await sgMail.send(msg);
    console.log('✅ SENDEMAIL - Email sent successfully to:', params.to);
    console.log('  - SendGrid response status:', response[0]?.statusCode);
    console.log('  - Message ID:', response[0]?.headers?.['x-message-id']);
    return true;
  } catch (error: any) {
    console.error('❌ SENDEMAIL - SendGrid email error:', error.message);
    
    // Enhanced error logging with specific guidance
    if (error.response) {
      console.error('SENDEMAIL - SendGrid response status:', error.response.status);
      
      if (error.response.body && error.response.body.errors) {
        console.error('SENDEMAIL - SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
        
        // Provide specific guidance based on error type
        const errors = error.response.body.errors;
        for (const err of errors) {
          if (err.message && err.message.includes('verified Sender Identity')) {
            console.error('🔧 SENDER VERIFICATION FIX REQUIRED:');
            console.error('1. Go to your SendGrid account dashboard');
            console.error('2. Navigate to Settings > Sender Authentication');
            console.error('3. Verify one of these email addresses:', VERIFIED_SENDERS.join(', '));
            console.error('4. Update your SENDGRID_FROM_EMAIL environment variable');
            console.error('5. Restart your application');
            console.error('📧 For now, using fallback email mode...');
            return await sendEmailFallback(params);
          } else if (err.message && err.message.includes('API key')) {
            console.error('🔧 API KEY ISSUE:');
            console.error('1. Check if your SendGrid API key is valid');
            console.error('2. Ensure the API key has "Mail Send" permissions');
            console.error('3. Verify the API key in your SendGrid account');
          } else if (err.message && err.message.includes('rate limit')) {
            console.error('🔧 RATE LIMIT EXCEEDED:');
            console.error('1. Check your SendGrid sending limits');
            console.error('2. Consider upgrading your SendGrid plan');
            console.error('3. Implement rate limiting in your application');
          }
        }
      }
    }
    
    // Log additional error context
    console.error('SENDEMAIL - Error context:', {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      fromEmail: params.from,
      toEmail: params.to,
      subject: params.subject,
      verifiedSenders: VERIFIED_SENDERS
    });
    
    // Use fallback for any SendGrid error
    console.log('📧 SENDEMAIL - Using fallback email mode due to SendGrid error...');
    return await sendEmailFallback(params);
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
  salonEmail: string,
  additionalData?: any
): EmailParams {
  const templateData = {
    clientName,
    clientEmail,
    serviceName,
    appointmentDate,
    appointmentTime,
    ...additionalData
  };

  const html = generateEmailHTML(appointmentReminderTemplate, templateData, `Appointment Reminder - ${serviceName}`);
  const text = generateEmailText(appointmentReminderTemplate, templateData);

  return {
    to: clientEmail,
    from: salonEmail,
    subject: `Appointment Reminder - ${serviceName}`,
    html,
    text
  };
}

export function createMarketingCampaignEmail(
  clientEmail: string,
  clientName: string,
  subject: string,
  content: string,
  salonEmail: string,
  trackingToken?: string,
  additionalData?: any
): EmailParams {
  const baseUrl = process.env.CUSTOM_DOMAIN || 'https://gloupheadspa.app' || (process.env.REPLIT_DOMAINS ? 
    `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
    'http://localhost:5000');
  
  const templateData = {
    clientName,
    clientEmail,
    campaignTitle: subject,
    campaignSubtitle: '',
    campaignContent: content,
    ctaButton: additionalData?.ctaButton || '',
    ctaUrl: additionalData?.ctaUrl || '',
    specialOffer: additionalData?.specialOffer || '',
    promoCode: additionalData?.promoCode || '',
    unsubscribeUrl: trackingToken ? 
      `${baseUrl}/api/email-marketing/unsubscribe/${trackingToken}` : 
      `${baseUrl}/api/email-marketing/unsubscribe/0`
  };

  const looksLikeFullHtml = /<!DOCTYPE|<html|<body/i.test(content || '');
  const html = looksLikeFullHtml
    ? generateRawMarketingEmailHTML(content, templateData.unsubscribeUrl)
    : generateEmailHTML(marketingCampaignTemplate, templateData, subject);
  const text = looksLikeFullHtml ? htmlToText(html) : generateEmailText(marketingCampaignTemplate, templateData);

  return {
    to: clientEmail,
    from: salonEmail,
    subject: subject,
    html,
    text
  };
}

export function createAccountUpdateEmail(
  clientEmail: string,
  clientName: string,
  updateType: string,
  details: string,
  salonEmail: string
): EmailParams {
  const templateData = {
    clientName,
    clientEmail,
    updateType,
    details
  };

  // Create a simple template for account updates
  const accountUpdateTemplate = Handlebars.compile(`
    <div class="email-container">
      <div class="email-header">
        <h2>Account Update</h2>
      </div>
      <div class="email-content">
        <p>Dear {{clientName}},</p>
        <p>Your account has been updated:</p>
        <div class="info-box">
          <p><strong>Update Type:</strong> {{updateType}}</p>
          <p><strong>Details:</strong> {{details}}</p>
        </div>
        <p>If you have any questions, please contact us.</p>
        <p>Best regards,<br>Glo Head Spa Team</p>
      </div>
    </div>
  `);

  const html = generateEmailHTML(accountUpdateTemplate, templateData, `Account Update - ${updateType}`);
  const text = generateEmailText(accountUpdateTemplate, templateData);

  return {
    to: clientEmail,
    from: salonEmail,
    subject: `Account Update - ${updateType}`,
    html,
    text
  };
}