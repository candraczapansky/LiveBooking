import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
import { sendLocationMessage, upsertLocationTemplate } from './location-messenger.js';
import type { IStorage } from './storage.js';
import type { AutomationRule } from '../shared/schema.js';
import { db } from './db.js';
import { locations } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

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

// Backward-compatible branding: replace any hardcoded default salon name
function applySalonBranding(text: string, salonName?: string): string {
  try {
    if (!text) return text;
    const name = (salonName || '').toString().trim();
    if (!name) return text;
    return text.replace(/\bGlo Head Spa\b/g, name);
  } catch {
    return text;
  }
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
      // Allow cancellation notices if either account management or appointment reminder SMS is enabled
      return client.smsAccountManagement === true || client.smsAppointmentReminders === true;
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

  // Optional location-aware filtering: support naming convention tags like "[location:2]" or "@location:2"
  const apptLocationIdRaw = (appointmentData as any)?.locationId;
  const apptLocationId = apptLocationIdRaw != null ? parseInt(String(apptLocationIdRaw)) : null;

  // Build a lookup of location names -> IDs (trimmed, case-insensitive)
  let locNameToId = new Map<string, number>();
  try {
    const allLocs = await (storage as any).getAllLocations?.();
    if (Array.isArray(allLocs)) {
      for (const l of allLocs) {
        const key = String((l?.name ?? '')).trim().toLowerCase();
        if (key && typeof l?.id === 'number') locNameToId.set(key, l.id);
      }
    }
  } catch {}
  // Fallback: query DB directly if storage method not available
  try {
    if (locNameToId.size === 0) {
      const rows = await db.select().from(locations);
      for (const l of rows as any[]) {
        const key = String((l?.name ?? '')).trim().toLowerCase();
        if (key && typeof l?.id === 'number') locNameToId.set(key, l.id);
      }
    }
  } catch {}

  const parseLocationToken = (text: string | null | undefined): string | null => {
    try {
      if (!text) return null;
      const m = /(?:\[location:([^\]]+)\]|@location:([^\s]+))/i.exec(text);
      if (m) {
        const token = (m[1] || m[2] || '').toString().trim();
        return token || null;
      }
      return null;
    } catch { return null; }
  };

  const resolveRuleLocationId = (r: any): number | null => {
    const token = parseLocationToken(r?.name) || parseLocationToken(r?.subject);
    if (!token) return null;
    const n = parseInt(token);
    if (!Number.isNaN(n)) return n;
    const key = token.trim().toLowerCase();
    return locNameToId.get(key) ?? null;
  };

  const withLocationMeta = relevantRules.map(r => ({
    rule: r,
    loc: resolveRuleLocationId(r),
  }));
  // If appointment has a location, prefer rules tagged for that location; otherwise include global (no tag)
  let scopedRules = withLocationMeta;
  if (apptLocationId != null) {
    const specific = withLocationMeta.filter(x => x.loc === apptLocationId);
    const global = withLocationMeta.filter(x => x.loc == null);
    scopedRules = specific.length > 0 ? specific : global;
  }
  const effectiveRules = scopedRules.map(x => x.rule);

  if (effectiveRules.length === 0) {
    console.log(`No active automation rules found for trigger: ${trigger}`);
    return;
  }

  // Test mode: allow direct email testing without requiring an appointment/client
  const testEmail: string | undefined = (appointmentData as any)?.testEmail;
  const testPhone: string | undefined = (appointmentData as any)?.testPhone;
  const testRuleId: number | undefined = (appointmentData as any)?.__testRuleId;
  if (testEmail || testPhone) {
    try {
      // Prepare minimal variables for testing
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

      // Reuse location-aware branding if locationId provided
      let salonName = 'Glo Head Spa';
      let salonPhone = '(555) 123-4567';
      let salonAddress = '123 Beauty Street, City, State 12345';
      try {
        const locId = (appointmentData as any)?.locationId;
        if (locId != null) {
          const allLocs = await (storage as any).getAllLocations?.();
          const location = Array.isArray(allLocs) ? allLocs.find((l: any) => String(l.id) === String(locId)) : null;
          if (location) {
            if (location.name) salonName = String(location.name);
            if (location.phone) salonPhone = String(location.phone);
            const addrParts = [location.address, location.city, location.state, location.zipCode].filter(Boolean);
            if (addrParts.length) salonAddress = addrParts.join(', ');
          }
        }
      } catch {}

      const appointmentDate = new Date(appointmentData?.startTime || now.toISOString());
      const dateStr = appointmentDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
      const timeStr = appointmentDate.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true });

      const variables: Record<string, string> = {
        client_name: 'Test Recipient',
        client_first_name: 'Test',
        client_last_name: 'Recipient',
        client_email: testEmail || '',
        client_phone: '',
        service_name: 'Service',
        service_duration: '60',
        staff_name: 'Your stylist',
        staff_phone: '',
        appointment_date: dateStr,
        appointment_time: timeStr,
        appointment_datetime: `${dateStr} ${timeStr}`,
        salon_name: salonName,
        salon_phone: salonPhone,
        salon_address: salonAddress,
        booking_date: dateStr,
        total_amount: '0'
      };

      // In test mode, optionally filter to a single rule if ruleId provided
      const rulesToRun = typeof testRuleId === 'number' ? relevantRules.filter(r => r.id === testRuleId) : relevantRules;
      for (const rule of rulesToRun) {
        if (rule.type === 'email' && testEmail) {
          try {
          // Determine branding for this rule: prefer request locationId; else rule tag
          let ruleSalonName = salonName;
          let ruleSalonPhone = salonPhone;
          let ruleSalonAddress = salonAddress;
          try {
            const reqLocId = (appointmentData as any)?.locationId;
            if (reqLocId == null) {
              const token = ((): string | null => {
                try {
                  const t1 = parseLocationToken((rule as any)?.name);
                  const t2 = parseLocationToken((rule as any)?.subject);
                  return t1 || t2;
                } catch { return null; }
              })();
              if (token) {
                const maybeNum = parseInt(String(token));
                const resolvedId = !Number.isNaN(maybeNum) ? maybeNum : ((): number | null => {
                  const key = String(token).trim().toLowerCase();
                  return locNameToId.get(key) ?? null;
                })();
                if (resolvedId != null) {
                  try {
                    const allLocs = await (storage as any).getAllLocations?.();
                    const location = Array.isArray(allLocs) ? allLocs.find((l: any) => String(l.id) === String(resolvedId)) : null;
                    if (location) {
                      if (location.name) ruleSalonName = String(location.name);
                      if (location.phone) ruleSalonPhone = String(location.phone);
                      const addrParts = [location.address, location.city, location.state, location.zipCode].filter(Boolean);
                      if (addrParts.length) ruleSalonAddress = addrParts.join(', ');
                    }
                  } catch {}
                }
              }
            }
          } catch {}

          const variablesForRule: Record<string, string> = {
            ...variables,
            salon_name: ruleSalonName,
            salon_phone: ruleSalonPhone,
            salon_address: ruleSalonAddress,
          };

          const processedTemplate = replaceTemplateVariables(rule.template, variablesForRule);
          const brandedTemplate = applySalonBranding(processedTemplate, variablesForRule.salon_name);
          const subjectRaw = rule.subject ? replaceTemplateVariables(rule.subject, variablesForRule) : 'Automation Test';
          const subject = applySalonBranding(subjectRaw, variablesForRule.salon_name);
          await sendEmail({
            to: testEmail,
            from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
            subject,
            text: brandedTemplate,
            html: `<p>${brandedTemplate.replace(/\n/g, '<br>')}</p>`
          });
          const newSentCount = (rule.sentCount || 0) + 1;
          await storage.updateAutomationRuleSentCount(rule.id, newSentCount);
          console.log(`Test email sent for rule: ${rule.name} -> ${testEmail}`);
          } catch (e) {
            console.log(`Test email failed for rule: ${rule.name}`, e);
          }
        } else if (rule.type === 'sms' && testPhone) {
          try {
            const brandedSMS = applySalonBranding(replaceTemplateVariables(rule.template, variables), variables.salon_name);
            const smsResult = await sendSMS(testPhone as string, brandedSMS);
            if (smsResult.success) {
              const newSentCount = (rule.sentCount || 0) + 1;
              await storage.updateAutomationRuleSentCount(rule.id, newSentCount);
            }
          } catch (e) {
            console.log(`Test SMS failed for rule: ${rule.name}`, e);
          }
        }
      }
      return; // Do not proceed to real appointment flow in test mode
    } catch (e) {
      console.log('Test mode error:', e);
      return;
    }
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
  
  // Resolve location details for branding (fallback to defaults)
  let salonName = 'Glo Head Spa';
  let salonPhone = '(555) 123-4567';
  let salonAddress = '123 Beauty Street, City, State 12345';
  let reviewLink: string | undefined;
  try {
    const locId = (appointmentData as any)?.locationId;
    if (locId != null) {
      let location: any = null;
      // Try storage helpers if present
      try { location = await (storage as any).getLocation?.(locId); } catch {}
      if (!location) { try { location = await (storage as any).getLocationById?.(locId); } catch {} }
      if (!location) { try { const allLocs = await (storage as any).getAllLocations?.(); if (Array.isArray(allLocs)) location = allLocs.find((l: any) => String(l.id) === String(locId)); } catch {} }
      // Fallback to DB
      if (!location) { try { const rows = await db.select().from(locations).where(eq(locations.id, Number(locId))).limit(1); location = (rows as any[])?.[0] || null; } catch {} }
      if (location) {
        if (location.name) salonName = String(location.name);
        if (location.phone) salonPhone = String(location.phone);
        const addrParts = [location.address, location.city, location.state, location.zipCode].filter(Boolean);
        if (addrParts.length) salonAddress = addrParts.join(', ');
      }
    }
  } catch {}

  const variables = {
    client_name: client.firstName || client.username,
    client_first_name: client.firstName || client.username || '',
    client_last_name: client.lastName || '',
    client_email: client.email,
    client_phone: client.phone || '',
    service_name: service?.name || 'Service',
    service_duration: service?.duration?.toString() || '60',
    staff_name: staffUser ? `${staffUser.firstName} ${staffUser.lastName}`.trim() || staffUser.username : 'Staff',
    appointment_date: appointmentDateString,
    appointment_time: appointmentTime,
    appointment_datetime: appointmentDateTime,
    salon_name: salonName,
    salon_phone: salonPhone,
    salon_address: salonAddress,
    booking_date: new Date().toLocaleDateString('en-US', localDateOptions),
    total_amount: service?.price?.toString() || '0'
  };

  // Process each automation rule
  for (const rule of effectiveRules) {
    try {
      // If the rule is scoped to a specific location, prefer that location's branding for {salon_name}
      let variablesForRule = variables;
      try {
        const ruleLocId = resolveRuleLocationId(rule);
        if (ruleLocId != null) {
          let loc: any = null;
          try { loc = await (storage as any).getLocation?.(ruleLocId); } catch {}
          if (!loc) { try { loc = await (storage as any).getLocationById?.(ruleLocId); } catch {} }
          if (!loc) {
            try {
              const allLocs = await (storage as any).getAllLocations?.();
              if (Array.isArray(allLocs)) loc = allLocs.find((l: any) => String(l.id) === String(ruleLocId));
            } catch {}
          }
          // Fallback to DB
          if (!loc) {
            try {
              const rows = await db.select().from(locations).where(eq(locations.id, Number(ruleLocId))).limit(1);
              loc = (rows as any[])?.[0] || null;
            } catch {}
          }
          if (loc && loc.name) {
            variablesForRule = { ...variablesForRule, salon_name: String(loc.name) } as any;
          }
        }
      } catch {}

      // Location-specific review links and business phones
      const lowerSalon = String(variablesForRule.salon_name || '').toLowerCase();
      const businessPhone = (
        lowerSalon.includes('flutter') ? '918-940-2888' :
        lowerSalon.includes('extensionist') ? '918-949-6299' :
        lowerSalon.includes('gloup') ? '918-932-5396' :
        lowerSalon.includes('glo head spa') ? '918-932-5396' :
        variablesForRule.salon_phone
      );
      const reviewUrl = (
        lowerSalon.includes('flutter') ? 'https://g.page/r/CVsPQrGuF_l1EAE/review' :
        lowerSalon.includes('extensionist') ? 'https://g.page/r/Cb63DI0Siy4gEAE/review' :
        lowerSalon.includes('gloup') ? 'https://g.page/r/CZgpVISFNvHDEAE/review' :
        lowerSalon.includes('glo head spa') ? 'https://g.page/r/CY3ndFc_3Sm6EAE/review' :
        undefined
      );
      const variablesAugmented = {
        ...variablesForRule,
        business_phone_number: businessPhone,
        review_link: reviewUrl || ''
      } as Record<string, string>;

      const processedTemplate = replaceTemplateVariables(rule.template, variablesAugmented);
      const brandedTemplate = applySalonBranding(processedTemplate, variablesForRule.salon_name || variables.salon_name);
      
      // Check client preferences before sending
      const overrideEmail = (appointmentData as any)?.testEmail as string | undefined;
      const canSend = overrideEmail ? true : shouldSendEmail(rule, client);
      const toEmail = overrideEmail || client.email;
      if (rule.type === 'email' && toEmail && canSend) {
        console.log(`Email automation check for ${rule.name}: client.email=${!!client.email}, canSendEmail=${shouldSendEmail(rule, client)}, preferences:`, {
          emailAccountManagement: client.emailAccountManagement,
          emailAppointmentReminders: client.emailAppointmentReminders,
          emailPromotions: client.emailPromotions
        });
        
        const subjectRaw = rule.subject ? replaceTemplateVariables(rule.subject, variablesForRule) : 'Notification from BeautyBook Salon';
        const subject = applySalonBranding(subjectRaw, variablesForRule.salon_name || variables.salon_name);
        
        // Use location-aware sending for cancellation to include the location name automatically
        let emailSent = false;
        if (trigger === 'cancellation' || trigger === 'follow_up' || trigger === 'after_payment') {
          try {
            const locId = (appointmentData as any)?.locationId;
            if (locId != null && variablesForRule.salon_name) {
              try { upsertLocationTemplate(String(locId), { name: String(variablesForRule.salon_name) }); } catch {}
            }
            const res = await sendLocationMessage({
              messageType: trigger === 'cancellation' ? 'cancellation' : (trigger === 'follow_up' ? 'follow_up' : 'after_payment'),
              locationId: String((appointmentData as any)?.locationId ?? 'global'),
              channel: 'email',
              to: { email: toEmail, name: variablesForRule.client_name },
              overrides: { subject, body: `<p>${brandedTemplate.replace(/\n/g, '<br>')}</p>` }
            });
            emailSent = !!res.success;
          } catch {
            emailSent = await sendEmail({
              to: toEmail,
              from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
              fromName: variablesForRule.salon_name || variables.salon_name,
              subject,
              text: brandedTemplate,
              html: `<p>${brandedTemplate.replace(/\n/g, '<br>')}</p>`
            });
          }
        } else {
          emailSent = await sendEmail({
            to: toEmail,
            from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
            fromName: variablesForRule.salon_name || variables.salon_name,
            subject,
            text: brandedTemplate,
            html: `<p>${brandedTemplate.replace(/\n/g, '<br>')}</p>`
          });
        }

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
        
        const brandedSMS = applySalonBranding(processedTemplate, variablesForRule.salon_name || variables.salon_name);
        // Use location-aware sending for cancellation to include the location name automatically
        let smsResult: any;
        if (trigger === 'cancellation' || trigger === 'follow_up' || trigger === 'after_payment') {
          try {
            const locId = (appointmentData as any)?.locationId;
            if (locId != null && variablesForRule.salon_name) {
              try { upsertLocationTemplate(String(locId), { name: String(variablesForRule.salon_name) }); } catch {}
            }
            const r = await sendLocationMessage({
              messageType: trigger === 'cancellation' ? 'cancellation' : (trigger === 'follow_up' ? 'follow_up' : 'after_payment'),
              locationId: String((appointmentData as any)?.locationId ?? 'global'),
              channel: 'sms',
              to: { phone: client.phone, name: variablesForRule.client_name },
              overrides: { body: brandedSMS }
            });
            smsResult = { success: r.success, error: r.error };
          } catch (e: any) {
            smsResult = await sendSMS(client.phone, brandedSMS);
          }
        } else {
          smsResult = await sendSMS(client.phone, brandedSMS);
        }
        
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