import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
import type { DatabaseStorage } from './storage.js';

export interface AutomationRule {
  id: number;
  name: string;
  type: 'email' | 'sms';
  trigger: 'appointment_reminder' | 'follow_up' | 'birthday' | 'no_show' | 'booking_confirmation' | 'cancellation' | 'custom';
  timing: string;
  template: string;
  subject?: string;
  active: boolean;
  lastRun?: string;
  sentCount: number;
  customTriggerName?: string;
}

// Mock automation rules storage (in production, this would be in the database)
const automationRules: AutomationRule[] = [
  {
    id: 1,
    name: "24h Appointment Reminder",
    type: "email",
    trigger: "appointment_reminder",
    timing: "24_hours_before",
    subject: "Appointment Reminder - {salon_name}",
    template: "Hi {client_name}, this is a friendly reminder that you have an appointment scheduled for {appointment_time} at {salon_name}. We look forward to seeing you!",
    active: true,
    sentCount: 0
  },
  {
    id: 2,
    name: "Booking Confirmation SMS",
    type: "sms",
    trigger: "booking_confirmation",
    timing: "immediately",
    template: "Hi {client_name}! Your appointment at {salon_name} for {service_name} on {appointment_date} at {appointment_time} has been confirmed. See you soon!",
    active: true,
    sentCount: 0
  }
];

export function getAutomationRules(): AutomationRule[] {
  return automationRules;
}

export function addAutomationRule(rule: Omit<AutomationRule, 'id'>): AutomationRule {
  const newRule = {
    ...rule,
    id: Date.now()
  };
  automationRules.push(newRule);
  return newRule;
}

export function updateAutomationRule(id: number, updates: Partial<AutomationRule>): AutomationRule | null {
  const index = automationRules.findIndex(rule => rule.id === id);
  if (index === -1) return null;
  
  automationRules[index] = { ...automationRules[index], ...updates };
  return automationRules[index];
}

export function deleteAutomationRule(id: number): boolean {
  const index = automationRules.findIndex(rule => rule.id === id);
  if (index === -1) return false;
  
  automationRules.splice(index, 1);
  return true;
}

// Template variable replacement
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return result;
}

// Main trigger function
export async function triggerAutomations(
  trigger: AutomationRule['trigger'],
  appointmentData: any,
  storage: DatabaseStorage,
  customTriggerName?: string
) {
  console.log(`Triggering automations for: ${trigger}`, { appointmentData, customTriggerName });
  
  const relevantRules = automationRules.filter(rule => {
    if (!rule.active) return false;
    
    if (rule.trigger === 'custom' && customTriggerName) {
      return rule.customTriggerName === customTriggerName;
    }
    
    return rule.trigger === trigger;
  });

  if (relevantRules.length === 0) {
    console.log(`No active automation rules found for trigger: ${trigger}`);
    return;
  }

  // Get appointment details
  const service = await storage.getService(appointmentData.serviceId);
  const client = await storage.getUser(appointmentData.clientId);
  const staffMember = await storage.getStaff(appointmentData.staffId);
  const staffUser = staffMember ? await storage.getUser(staffMember.userId) : null;

  if (!client) {
    console.log('Client not found for automation trigger');
    return;
  }

  // Prepare template variables
  const appointmentDate = new Date(appointmentData.startTime);
  const variables = {
    client_name: client.firstName || client.username,
    client_email: client.email,
    client_phone: client.phone || '',
    service_name: service?.name || 'Service',
    service_duration: service?.duration?.toString() || '60',
    staff_name: staffUser ? `${staffUser.firstName} ${staffUser.lastName}`.trim() || staffUser.username : 'Staff',
    appointment_date: appointmentDate.toLocaleDateString(),
    appointment_time: appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    appointment_datetime: appointmentDate.toLocaleString(),
    salon_name: 'BeautyBook Salon',
    salon_phone: '(555) 123-4567',
    salon_address: '123 Beauty Street, City, State 12345',
    booking_date: new Date().toLocaleDateString(),
    total_amount: service?.price?.toString() || '0'
  };

  // Process each automation rule
  for (const rule of relevantRules) {
    try {
      const processedTemplate = replaceTemplateVariables(rule.template, variables);
      
      if (rule.type === 'email' && client.email) {
        const subject = rule.subject ? replaceTemplateVariables(rule.subject, variables) : 'Notification from BeautyBook Salon';
        
        const emailSent = await sendEmail({
          to: client.email,
          from: 'noreply@beautybook.com',
          subject,
          text: processedTemplate,
          html: `<p>${processedTemplate.replace(/\n/g, '<br>')}</p>`
        });

        if (emailSent) {
          rule.sentCount++;
          rule.lastRun = new Date().toISOString();
          console.log(`Email automation sent successfully for rule: ${rule.name}`);
        }
      } else if (rule.type === 'sms' && client.phone) {
        const smsResult = await sendSMS(client.phone, processedTemplate);
        
        if (smsResult.success) {
          rule.sentCount++;
          rule.lastRun = new Date().toISOString();
          console.log(`SMS automation sent successfully for rule: ${rule.name}`);
        }
      }
    } catch (error) {
      console.error(`Failed to execute automation rule ${rule.name}:`, error);
    }
  }
}

// Specific trigger functions
export async function triggerBookingConfirmation(appointmentData: any, storage: DatabaseStorage) {
  await triggerAutomations('booking_confirmation', appointmentData, storage);
}

export async function triggerAppointmentReminder(appointmentData: any, storage: DatabaseStorage) {
  await triggerAutomations('appointment_reminder', appointmentData, storage);
}

export async function triggerFollowUp(appointmentData: any, storage: DatabaseStorage) {
  await triggerAutomations('follow_up', appointmentData, storage);
}

export async function triggerCancellation(appointmentData: any, storage: DatabaseStorage) {
  await triggerAutomations('cancellation', appointmentData, storage);
}

export async function triggerNoShow(appointmentData: any, storage: DatabaseStorage) {
  await triggerAutomations('no_show', appointmentData, storage);
}

export async function triggerCustomAutomation(appointmentData: any, storage: DatabaseStorage, customTriggerName: string) {
  await triggerAutomations('custom', appointmentData, storage, customTriggerName);
}