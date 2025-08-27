import Handlebars from 'handlebars';
import { format } from 'date-fns';

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date: string | Date, formatStr: string) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
});

Handlebars.registerHelper('formatPrice', function(amount: number) {
  if (!amount) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
});

Handlebars.registerHelper('formatTime', function(time: string) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
});

// Central Time (America/Chicago) helpers for confirmations
const ordinalSuffix = (day: number): string => {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
};

Handlebars.registerHelper('formatDateCT', function(date: string | Date) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).formatToParts(dateObj);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const weekday = get('weekday');
  const month = get('month');
  const dayStr = get('day');
  const year = get('year');
  const dayNum = parseInt(dayStr || '0', 10);
  const dayWithOrdinal = isNaN(dayNum) ? dayStr : ordinalSuffix(dayNum);
  return `${weekday}, ${month} ${dayWithOrdinal}, ${year}`;
});

Handlebars.registerHelper('formatTimeCT', function(date: string | Date) {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
});

// Base email template with professional styling
const baseEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .content {
            padding: 40px 20px;
        }
        .appointment-details {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 500;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0;
            }
            .content {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Glo Head Spa</h1>
        </div>
        
        <div class="content">
            {{{content}}}
        </div>
        
        <div class="footer">
            <p>Thank you for choosing Glo Head Spa</p>
            <div class="social-links">
                <a href="#">Website</a> | 
                <a href="#">Facebook</a> | 
                <a href="#">Instagram</a>
            </div>
            <p style="font-size: 12px; margin-top: 20px;">
                This email was sent to {{email}}. 
                <a href="{{unsubscribeUrl}}" style="color: #667eea;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
`;

// Appointment confirmation template
export const appointmentConfirmationTemplate = Handlebars.compile(`
<div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #667eea; margin-bottom: 10px;">Appointment Confirmed!</h2>
    <p style="color: #666; font-size: 16px;">Your appointment has been successfully scheduled.</p>
</div>

<div class="appointment-details">
    <h3 style="margin-top: 0; color: #333;">Appointment Details</h3>
    <p><strong>Client:</strong> {{clientName}}</p>
    <p><strong>Service:</strong> {{serviceName}}</p>
    <p><strong>Date:</strong> {{formatDateCT appointmentDate}}</p>
    <p><strong>Time:</strong> {{formatTimeCT appointmentDate}}</p>
    <p><strong>Duration:</strong> {{duration}} minutes</p>
    <p><strong>Staff:</strong> {{staffName}}</p>
    {{#if totalAmount}}
    <p><strong>Total:</strong> {{formatPrice totalAmount}}</p>
    {{/if}}
</div>

<div style="margin: 30px 0;">
    <p>Please arrive 10 minutes before your scheduled appointment time.</p>
    <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
</div>

<div style="text-align: center;">
    <a href="{{rescheduleUrl}}" class="button">Reschedule Appointment</a>
    <a href="{{cancelUrl}}" class="button" style="background: #dc3545;">Cancel Appointment</a>
</div>

<div style="margin-top: 30px; padding: 20px; background-color: #e8f4fd; border-radius: 8px;">
    <h4 style="margin-top: 0; color: #0c5460;">What to Expect</h4>
    <ul style="text-align: left; color: #0c5460;">
        <li>Please arrive 10 minutes early</li>
        <li>Bring any relevant medical information</li>
        <li>Wear comfortable clothing</li>
        <li>We'll provide all necessary supplies</li>
    </ul>
</div>
`);

// Appointment reminder template (24 hours before)
export const appointmentReminderTemplate = Handlebars.compile(`
<div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #667eea; margin-bottom: 10px;">Appointment Reminder</h2>
    <p style="color: #666; font-size: 16px;">This is a friendly reminder about your upcoming appointment.</p>
</div>

<div class="appointment-details">
    <h3 style="margin-top: 0; color: #333;">Tomorrow's Appointment</h3>
    <p><strong>Client:</strong> {{clientName}}</p>
    <p><strong>Service:</strong> {{serviceName}}</p>
    <p><strong>Date:</strong> {{formatDate appointmentDate 'EEEE, MMMM do, yyyy'}}</p>
    <p><strong>Time:</strong> {{formatTime appointmentTime}}</p>
    <p><strong>Duration:</strong> {{duration}} minutes</p>
    <p><strong>Staff:</strong> {{staffName}}</p>
    {{#if totalAmount}}
    <p><strong>Total:</strong> {{formatPrice totalAmount}}</p>
    {{/if}}
</div>

<div style="margin: 30px 0;">
    <p><strong>Important Reminders:</strong></p>
    <ul style="text-align: left;">
        <li>Please arrive 10 minutes before your scheduled time</li>
        <li>Bring any relevant medical information</li>
        <li>Wear comfortable clothing</li>
        <li>We'll provide all necessary supplies</li>
    </ul>
</div>

<div style="text-align: center;">
    <a href="{{rescheduleUrl}}" class="button">Need to Reschedule?</a>
    <a href="{{cancelUrl}}" class="button" style="background: #dc3545;">Cancel Appointment</a>
</div>

<div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 8px;">
    <h4 style="margin-top: 0; color: #856404;">Location & Parking</h4>
    <p style="color: #856404; margin-bottom: 10px;"><strong>Address:</strong> {{salonAddress}}</p>
    <p style="color: #856404; margin-bottom: 10px;"><strong>Phone:</strong> {{salonPhone}}</p>
    <p style="color: #856404;">Free parking available in the rear lot.</p>
</div>
`);

// Marketing campaign template
export const marketingCampaignTemplate = Handlebars.compile(`
<div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #667eea; margin-bottom: 10px;">{{campaignTitle}}</h2>
    <p style="color: #666; font-size: 16px;">{{campaignSubtitle}}</p>
</div>

<div style="margin: 30px 0;">
    {{{campaignContent}}}
</div>

{{#if ctaButton}}
<div style="text-align: center; margin: 30px 0;">
    <a href="{{ctaUrl}}" class="button">{{ctaButton}}</a>
</div>
{{/if}}

{{#if specialOffer}}
<div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; border-radius: 8px; text-align: center;">
    <h3 style="margin-top: 0;">Special Offer!</h3>
    <p style="font-size: 18px; margin-bottom: 10px;">{{specialOffer}}</p>
    <p style="font-size: 14px;">Use code: <strong>{{promoCode}}</strong></p>
</div>
{{/if}}

<div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
    <h4 style="margin-top: 0; color: #333;">Why Choose Glo Head Spa?</h4>
    <ul style="text-align: left; color: #666;">
        <li>Experienced and certified professionals</li>
        <li>Premium quality products</li>
        <li>Relaxing atmosphere</li>
        <li>Convenient location and hours</li>
    </ul>
</div>
`);

// Follow-up template (after appointment)
export const followUpTemplate = Handlebars.compile(`
<div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #667eea; margin-bottom: 10px;">Thank You!</h2>
    <p style="color: #666; font-size: 16px;">We hope you enjoyed your recent visit to Glo Head Spa.</p>
</div>

<div class="appointment-details">
    <h3 style="margin-top: 0; color: #333;">Your Recent Visit</h3>
    <p><strong>Service:</strong> {{serviceName}}</p>
    <p><strong>Date:</strong> {{formatDate appointmentDate 'EEEE, MMMM do, yyyy'}}</p>
    <p><strong>Staff:</strong> {{staffName}}</p>
</div>

<div style="margin: 30px 0;">
    <p>We'd love to hear about your experience! Your feedback helps us provide the best service possible.</p>
</div>

<div style="text-align: center;">
    <a href="{{reviewUrl}}" class="button">Leave a Review</a>
    <a href="{{bookAgainUrl}}" class="button">Book Your Next Appointment</a>
</div>

<div style="margin-top: 30px; padding: 20px; background-color: #d4edda; border-radius: 8px;">
    <h4 style="margin-top: 0; color: #155724;">Care Tips</h4>
    <p style="color: #155724;">{{careTips}}</p>
</div>
`);

// Birthday template
export const birthdayTemplate = Handlebars.compile(`
<div style="text-align: center; margin-bottom: 30px;">
    <h2 style="color: #667eea; margin-bottom: 10px;">Happy Birthday, {{clientName}}! 🎉</h2>
    <p style="color: #666; font-size: 16px;">We hope your special day is filled with joy and relaxation.</p>
</div>

<div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; border-radius: 8px; text-align: center;">
    <h3 style="margin-top: 0;">Birthday Special Offer!</h3>
    <p style="font-size: 18px; margin-bottom: 10px;">Enjoy {{discountPercent}}% off any service</p>
    <p style="font-size: 14px;">Valid until {{formatDate expiryDate 'MMMM do, yyyy'}}</p>
    <p style="font-size: 14px;">Use code: <strong>BIRTHDAY{{birthdayYear}}</strong></p>
</div>

<div style="text-align: center;">
    <a href="{{bookUrl}}" class="button">Book Your Birthday Treatment</a>
</div>

<div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
    <h4 style="margin-top: 0; color: #333;">Popular Birthday Services</h4>
    <ul style="text-align: left; color: #666;">
        <li>Relaxing massage therapy</li>
        <li>Facial treatments</li>
        <li>Hair styling and treatments</li>
        <li>Manicure and pedicure</li>
    </ul>
</div>
`);

// Function to generate complete email HTML
export function generateEmailHTML(template: HandlebarsTemplateDelegate, data: any, subject: string): string {
  const content = template(data);
  const fullTemplate = Handlebars.compile(baseEmailTemplate);
  
  return fullTemplate({
    content,
    subject,
    email: data.clientEmail,
    unsubscribeUrl: data.unsubscribeUrl || '#'
  });
}

// Function to generate email text version
export function generateEmailText(template: HandlebarsTemplateDelegate, data: any): string {
  const content = template(data);
  // Simple HTML to text conversion
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
} 

// Generate a raw marketing email using ONLY the provided editor HTML plus a minimal unsubscribe footer
// This bypasses the base template wrapper and any default headers/footers
export function generateRawMarketingEmailHTML(editorHtml: string, unsubscribeUrl: string): string {
  const base = (editorHtml || '').toString();
  const compliance = `\n<div style="font-size:12px; color:#666; text-align:center; margin:16px 0;">
    You are receiving this because you opted in to emails from us.
    <a href="${unsubscribeUrl}" style="color:#667eea; text-decoration:underline;">Unsubscribe</a>
  </div>`;

  // If the editor provided a full HTML document, inject compliance before </body> or </html>
  if (/<\/body>/i.test(base)) {
    return base.replace(/<\/body>/i, `${compliance}</body>`);
  }
  if (/<\/html>/i.test(base)) {
    return base.replace(/<\/html>/i, `${compliance}</html>`);
  }
  // Otherwise, append compliance at the end
  return `${base}${compliance}`;
}

// Convert arbitrary HTML to plain text (used for raw marketing emails)
export function htmlToText(html: string): string {
  const raw = (html || '').toString();
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}