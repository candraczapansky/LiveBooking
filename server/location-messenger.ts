// Location-aware messaging (Option A: in-module config map)
// This module does not modify existing senders; it wraps them.

export type MessageType = 'confirmation' | 'cancellation' | 'reschedule' | 'marketing' | 'reminder' | 'after_payment' | 'follow_up';
export type Channel = 'sms' | 'email';

export interface Recipient {
  phone?: string;
  email?: string | string[];
  name?: string;
}

export interface SendLocationMessageInput {
  messageType: MessageType;
  locationId: string; // e.g., 'flutter'
  channel: Channel;
  to: Recipient;
  context?: Record<string, string | undefined>;
  overrides?: { subject?: string; body?: string };
  photoUrl?: string; // For SMS/MMS marketing with an image
}

type SmsTemplate = { body: string };
type EmailTemplate = { subject: string; body: string };

export interface LocationTemplates {
  name: string; // Display name used in templates, e.g., "Flutter"
  fromNumber?: string; // Not used by current sendSMS API, reserved for future
  fromEmail?: string;  // sendEmail ultimately resolves to verified sender, but we can pass fromName
  sms?: Partial<Record<MessageType, SmsTemplate>>;
  email?: Partial<Record<MessageType, EmailTemplate>>;
}

type TemplatesStore = Record<string, LocationTemplates>;

// Default, safe templates. Include {{locationName}} so a location like "Flutter" is rendered.
const DEFAULT_TEMPLATES: TemplatesStore = {
  global: {
    name: 'Our Location',
    sms: {
      confirmation: { body: 'Hi {{name}}, your {{serviceName}} at {{locationName}} is confirmed for {{appointmentDate}} {{appointmentTime}}.' },
      cancellation: { body: 'Hi {{name}}, your {{serviceName}} at {{locationName}} on {{appointmentDate}} has been cancelled.' },
      reschedule: { body: 'Hi {{name}}, your {{serviceName}} at {{locationName}} is rescheduled to {{appointmentDate}} {{appointmentTime}}.' },
      reminder: { body: 'Reminder: Your {{serviceName}} at {{locationName}} is on {{appointmentDate}} at {{appointmentTime}}.' },
      after_payment: { body: 'Thanks {{name}}! Payment received for {{serviceName}} at {{locationName}} on {{appointmentDate}}.' },
      follow_up: { body: 'Hi {{name}}, thanks for visiting {{locationName}} for {{serviceName}}. How did we do?' },
      marketing: { body: '{{name}}, {{locationName}} has a limited-time offer on {{serviceName}}. Reply STOP to opt out.' }
    },
    email: {
      confirmation: { subject: 'Appointment Confirmation - {{serviceName}} at {{locationName}}', body: '<p>Hi {{name}},</p><p>Your {{serviceName}} at <strong>{{locationName}}</strong> is confirmed for {{appointmentDate}} {{appointmentTime}}.</p>' },
      cancellation: { subject: 'Appointment Cancelled - {{serviceName}} at {{locationName}}', body: '<p>Hi {{name}},</p><p>Your {{serviceName}} at <strong>{{locationName}}</strong> on {{appointmentDate}} has been cancelled.</p>' },
      reschedule: { subject: 'Appointment Rescheduled - {{serviceName}} at {{locationName}}', body: '<p>Hi {{name}},</p><p>Your {{serviceName}} at <strong>{{locationName}}</strong> is rescheduled to {{appointmentDate}} {{appointmentTime}}.</p>' },
      reminder: { subject: 'Appointment Reminder - {{serviceName}} at {{locationName}}', body: '<p>Hi {{name}},</p><p>This is a reminder for your {{serviceName}} at <strong>{{locationName}}</strong> on {{appointmentDate}} at {{appointmentTime}}.</p>' },
      after_payment: { subject: 'Receipt - {{serviceName}} at {{locationName}}', body: '<p>Hi {{name}},</p><p>Thanks for your payment for {{serviceName}} at <strong>{{locationName}}</strong> on {{appointmentDate}}.</p>' },
      follow_up: { subject: 'Thank You for Your Visit to {{locationName}}', body: '<p>Hi {{name}},</p><p>Thanks for visiting <strong>{{locationName}}</strong> for {{serviceName}}. We hope to see you again soon.</p>' },
      marketing: { subject: '{{locationName}} Specials - {{serviceName}}', body: '<p>{{name}},</p><p>{{locationName}} has a limited-time offer on <strong>{{serviceName}}</strong>.</p>' }
    }
  },
  // Example location with display name only. It inherits all message bodies from global.
  flutter: {
    name: 'Flutter'
  }
};

let LOCATION_TEMPLATES: TemplatesStore = { ...DEFAULT_TEMPLATES };

export function setLocationTemplates(newConfig: TemplatesStore): void {
  LOCATION_TEMPLATES = { ...newConfig };
}

export function upsertLocationTemplate(locationId: string, templates: Partial<LocationTemplates> & { name?: string }): void {
  const existing = LOCATION_TEMPLATES[locationId] || { name: locationId } as LocationTemplates;
  LOCATION_TEMPLATES[locationId] = {
    ...existing,
    ...templates,
    sms: { ...(existing.sms || {}), ...(templates.sms || {}) },
    email: { ...(existing.email || {}), ...(templates.email || {}) }
  } as LocationTemplates;
}

function getLocationConfig(locationId: string): LocationTemplates {
  return LOCATION_TEMPLATES[locationId] || LOCATION_TEMPLATES.global;
}

function getTemplate(locationId: string, messageType: MessageType, channel: Channel): SmsTemplate | EmailTemplate | null {
  const loc = getLocationConfig(locationId);
  if (channel === 'sms') {
    return (loc.sms && loc.sms[messageType]) || (LOCATION_TEMPLATES.global.sms && LOCATION_TEMPLATES.global.sms[messageType]) || null;
  }
  return (loc.email && loc.email[messageType]) || (LOCATION_TEMPLATES.global.email && LOCATION_TEMPLATES.global.email[messageType]) || null;
}

function renderTemplate(template: string, model: Record<string, string | undefined>): string {
  return (template || '').replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = model[key];
    return value != null ? String(value) : '';
  });
}

function buildModel(locationId: string, to: Recipient, context?: Record<string, string | undefined>): Record<string, string | undefined> {
  const loc = getLocationConfig(locationId);
  return {
    locationName: loc.name,
    locationFromEmail: loc.fromEmail,
    locationFromNumber: loc.fromNumber,
    name: to.name,
    ...context
  };
}

export interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendLocationMessage(input: SendLocationMessageInput): Promise<SendResult> {
  const { messageType, locationId, channel, to, context, overrides, photoUrl } = input;

  if (channel === 'sms') {
    if (!to.phone) {
      return { success: false, error: 'Missing recipient phone for SMS' };
    }
    const tpl = getTemplate(locationId, messageType, 'sms') as SmsTemplate | null;
    const model = buildModel(locationId, to, context);
    let body = renderTemplate(overrides?.body ?? tpl?.body ?? '', model);
    // Minimal, safe fallback for legacy single-brace placeholders that may slip through
    try {
      const safeName = (to?.name || '').toString().trim();
      if (safeName) {
        body = body
          .replace(/\{client_first_name\}/g, safeName.split(' ')[0])
          .replace(/\{client_name\}/g, safeName);
      }
    } catch {}
    const smsModule = await import('./sms.js');
    const result = await smsModule.sendSMS(to.phone, body, photoUrl);
    return { success: !!result?.success, id: result?.messageId, error: result?.error };
  }

  // email
  if (!to.email) {
    return { success: false, error: 'Missing recipient email for Email' };
  }
  const tpl = getTemplate(locationId, messageType, 'email') as EmailTemplate | null;
  const model = buildModel(locationId, to, context);
  const subject = renderTemplate(overrides?.subject ?? tpl?.subject ?? '', model);
  const htmlBody = renderTemplate(overrides?.body ?? tpl?.body ?? '', model);

  const emailModule = await import('./email.js');
  const sent = await emailModule.sendEmail({
    to: to.email,
    from: (getLocationConfig(locationId).fromEmail || process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com'),
    fromName: getLocationConfig(locationId).name,
    subject,
    html: htmlBody
  });
  return { success: !!sent };
}



