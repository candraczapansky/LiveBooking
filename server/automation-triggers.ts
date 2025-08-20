import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
import type { IStorage } from './storage.js';
import type { AutomationRule } from '@shared/schema.js';

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
    case 'after_payment':
      return client.emailAccountManagement === true;
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
  
  // For after_payment triggers, be more lenient - allow if any SMS preference is enabled
  if (rule.trigger === 'after_payment') {
    return client.smsAccountManagement === true || client.smsAppointmentReminders === true || client.smsPromotions === true;
  }
  
  switch (rule.trigger) {
    case 'booking_confirmation':
      // Skip SMS automation for booking confirmations to prevent duplicates
      // SMS confirmations are already sent directly in the appointment creation route
      return false;
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
  console.log("🔧 ALL AUTOMATION RULES:", allRules.length);
  console.log("🔧 ALL RULES:", allRules);
  
  const relevantRules = allRules.filter(rule => {
    if (!rule.active) return false;
    
    if (rule.trigger === 'custom' && customTriggerName) {
      return rule.customTriggerName === customTriggerName;
    }
    
    return rule.trigger === trigger;
  });

  console.log("🔧 RELEVANT RULES FOR TRIGGER:", trigger, relevantRules.length);
  console.log("🔧 RELEVANT RULES:", relevantRules);

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
  
  // Convert UTC time to local time for display
  const localOptions: Intl.DateTimeFormatOptions = { 
    timeZone: 'America/Chicago', // Central Time Zone
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  };
  
  const localDateOptions: Intl.DateTimeFormatOptions = { 
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  };
  
  const localDateTimeOptions: Intl.DateTimeFormatOptions = { 
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'numeric', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  const appointmentTime = appointmentDate.toLocaleTimeString('en-US', localOptions);
  const appointmentDateString = appointmentDate.toLocaleDateString('en-US', localDateOptions);
  const appointmentDateTime = appointmentDate.toLocaleString('en-US', localDateTimeOptions);
  
  const variables = {
    client_name: client.firstName || client.username,
    client_email: client.email,
    client_phone: client.phone || '',
    service_name: service?.name || 'Service',
    service_duration: service?.duration?.toString() || '60',
    staff_name: staffUser ? `${staffUser.firstName} ${staffUser.lastName}`.trim() || staffUser.username : 'Staff',
    appointment_date: appointmentDateString,
    appointment_time: appointmentTime,
    appointment_datetime: appointmentDateTime,
    salon_name: 'Glo Head Spa',
    salon_phone: '(555) 123-4567',
    salon_address: '123 Beauty Street, City, State 12345',
    booking_date: new Date().toLocaleDateString('en-US', localDateOptions),
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
          from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
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
        
        console.log(`SMS sending result for ${rule.name}:`, smsResult);
        
        if (smsResult.success) {
          const newSentCount = (rule.sentCount || 0) + 1;
          await storage.updateAutomationRuleSentCount(rule.id, newSentCount);
          console.log(`SMS automation sent successfully for rule: ${rule.name}`);
        } else {
          console.log(`SMS automation failed for rule: ${rule.name}, error: ${smsResult.error}`);
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
  console.log("🔧 TRIGGERING BOOKING CONFIRMATION AUTOMATION");
  console.log("🔧 Appointment data:", appointmentData);
  await triggerAutomations('booking_confirmation', appointmentData, storage);
  console.log("🔧 BOOKING CONFIRMATION AUTOMATION COMPLETED");
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

export async function triggerAfterPayment(appointmentData: any, storage: IStorage) {
  await triggerAutomations('after_payment', appointmentData, storage);
}

export async function triggerCustomAutomation(appointmentData: any, storage: IStorage, customTriggerName: string) {
  await triggerAutomations('custom', appointmentData, storage, customTriggerName);
}