import { sendEmail } from './email';
import { sendSMS } from './sms';
import type { IStorage } from './storage';
import { storage } from './storage';
import type { AutomationRule } from '@shared/schema';

// Automation rules are now stored in the database via storage layer

// Template variable replacement
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return result;
}

// Check if email should be sent based on client preferences
function shouldSendEmail(rule: AutomationRule, client: any): boolean {
  console.log(`Checking email preferences for trigger: ${rule.trigger}`, {
    emailAccountManagement: client.emailAccountManagement,
    emailAppointmentReminders: client.emailAppointmentReminders,
    emailPromotions: client.emailPromotions
  });
  
  switch (rule.trigger) {
    case 'booking_confirmation':
      return client.emailAppointmentReminders === true;
    case 'appointment_reminder':
      return client.emailAppointmentReminders === true;
    case 'cancellation':
      return client.emailAccountManagement === true;
    case 'follow_up':
      return client.emailPromotions === true;
    default:
      return true;
  }
}

// Check if SMS should be sent based on client preferences
function shouldSendSMS(rule: AutomationRule, client: any): boolean {
  console.log(`Checking SMS preferences for trigger: ${rule.trigger}`, {
    smsAccountManagement: client.smsAccountManagement,
    smsAppointmentReminders: client.smsAppointmentReminders,
    smsPromotions: client.smsPromotions
  });
  
  switch (rule.trigger) {
    case 'booking_confirmation':
      return client.smsAppointmentReminders === true;
    case 'appointment_reminder':
      return client.smsAppointmentReminders === true;
    case 'cancellation':
      return client.smsAccountManagement === true;
    case 'follow_up':
      return client.smsPromotions === true;
    default:
      return true;
  }
}

// Main trigger function
export async function triggerAutomations(
  trigger: AutomationRule['trigger'],
  appointmentData: any,
  storage: IStorage,
  customTriggerName?: string
) {
  console.log(`Triggering automations for: ${trigger}`, { appointmentData, customTriggerName });
  
  // Get all automation rules from database
  const allRules = await storage.getAllAutomationRules();
  
  const relevantRules = allRules.filter(rule => {
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
      
      // Check client preferences before sending
      if (rule.type === 'email' && client.email && shouldSendEmail(rule, client)) {
        console.log(`Email automation check for ${rule.name}: client.email=${!!client.email}, canSendEmail=${shouldSendEmail(rule, client)}, preferences:`, {
          emailAccountManagement: client.emailAccountManagement,
          emailAppointmentReminders: client.emailAppointmentReminders,
          emailPromotions: client.emailPromotions
        });
        
        const subject = rule.subject ? replaceTemplateVariables(rule.subject, variables) : 'Notification from BeautyBook Salon';
        
        const emailSent = await sendEmail({
          to: client.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@beautybook.com',
          subject,
          text: processedTemplate,
          html: `<p>${processedTemplate.replace(/\n/g, '<br>')}</p>`
        });

        if (emailSent) {
          const newSentCount = (rule.sentCount || 0) + 1;
          await storage.updateAutomationRuleSentCount(rule.id, newSentCount);
          console.log(`Email automation sent successfully for rule: ${rule.name}`);
        }
      } else if (rule.type === 'sms' && client.phone && shouldSendSMS(rule, client)) {
        console.log(`SMS automation check for ${rule.name}: client.phone=${!!client.phone}, canSendSMS=${shouldSendSMS(rule, client)}, preferences:`, {
          smsAccountManagement: client.smsAccountManagement,
          smsAppointmentReminders: client.smsAppointmentReminders,
          smsPromotions: client.smsPromotions
        });
        
        const smsResult = await sendSMS(client.phone, processedTemplate);
        
        if (smsResult.success) {
          const newSentCount = (rule.sentCount || 0) + 1;
          await storage.updateAutomationRuleSentCount(rule.id, newSentCount);
          console.log(`SMS automation sent successfully for rule: ${rule.name}`);
        }
      } else {
        console.log(`Automation skipped for ${rule.name} (${rule.type}): client.email=${!!client.email}, client.phone=${!!client.phone}, canSendEmail=${rule.type === 'email' ? shouldSendEmail(rule, client) : 'N/A'}, canSendSMS=${rule.type === 'sms' ? shouldSendSMS(rule, client) : 'N/A'}`);
      }
    } catch (error) {
      console.error(`Failed to execute automation rule ${rule.name}:`, error);
    }
  }
}

// Specific trigger functions
export async function triggerBookingConfirmation(appointmentData: any, storage: IStorage) {
  await triggerAutomations('booking_confirmation', appointmentData, storage);
}

export async function triggerAppointmentReminder(appointmentData: any, storage: IStorage) {
  await triggerAutomations('appointment_reminder', appointmentData, storage);
}

export async function triggerFollowUp(appointmentData: any, storage: IStorage) {
  await triggerAutomations('follow_up', appointmentData, storage);
}

export async function triggerCancellation(appointmentData: any, storage: IStorage) {
  await triggerAutomations('cancellation', appointmentData, storage);
}

export async function triggerNoShow(appointmentData: any, storage: IStorage) {
  await triggerAutomations('no_show', appointmentData, storage);
}

export async function triggerCustomAutomation(appointmentData: any, storage: IStorage, customTriggerName: string) {
  await triggerAutomations('custom', appointmentData, storage, customTriggerName);
}