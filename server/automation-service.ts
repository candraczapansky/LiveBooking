import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
import type { IStorage } from './storage.js';
import type { AutomationRule } from '../shared/schema.js';
import { db } from './db.js';
import { locations } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

export interface AutomationContext {
  appointmentId: number;
  clientId: number;
  serviceId: number;
  staffId: number;
  startTime: string;
  endTime: string;
  status: string;
}

export interface ClientData {
  id: number;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emailAppointmentReminders?: boolean | null;
  smsAppointmentReminders?: boolean | null;
  emailAccountManagement?: boolean | null;
  smsAccountManagement?: boolean | null;
  emailPromotions?: boolean | null;
  smsPromotions?: boolean | null;
}

export interface ServiceData {
  id: number;
  name: string;
  price?: number;
  duration?: number;
}

export interface StaffData {
  id: number;
  userId: number;
  title?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
}

export class AutomationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Main method to trigger automations for a specific event
   */
  async triggerAutomations(
    trigger: AutomationRule['trigger'],
    context: AutomationContext,
    customTriggerName?: string
  ): Promise<void> {
    console.log(`🚀 AutomationService: Triggering automations for ${trigger}`, {
      appointmentId: context.appointmentId,
      customTriggerName
    });

    try {
      // Get all active automation rules for this trigger
      const rules = await this.getActiveRules(trigger, customTriggerName);
      console.log(`📋 Found ${rules.length} active rules for trigger: ${trigger}`);

      if (rules.length === 0) {
        console.log(`⚠️ No active automation rules found for trigger: ${trigger}`);
        return;
      }

      // Get all required data
      const [client, service, staff] = await Promise.all([
        this.storage.getUser(context.clientId),
        this.storage.getService(context.serviceId),
        this.storage.getStaff(context.staffId)
      ]);

      if (!client) {
        console.log('❌ Client not found for automation trigger');
        return;
      }

      if (!service) {
        console.log('❌ Service not found for automation trigger');
        return;
      }

      if (!staff) {
        console.log('❌ Staff not found for automation trigger');
        return;
      }

      // Get staff user details
      const staffUser = await this.storage.getUser(staff.userId);

      // Prepare template variables
      const variables = this.prepareTemplateVariables(context, client, service, staff, staffUser);

      // Process each automation rule
      for (const rule of rules) {
        await this.processAutomationRule(rule, client, variables);
      }

      console.log(`✅ AutomationService: Completed processing ${rules.length} rules for trigger: ${trigger}`);

    } catch (error) {
      console.error('❌ AutomationService: Error triggering automations:', error);
      throw error;
    }
  }

  /**
   * Get active automation rules for a specific trigger
   */
  private async getActiveRules(
    trigger: AutomationRule['trigger'],
    customTriggerName?: string
  ): Promise<AutomationRule[]> {
    const allRules = await this.storage.getAllAutomationRules();
    
    return allRules.filter(rule => {
      if (!rule.active) return false;
      
      if (rule.trigger === 'custom' && customTriggerName) {
        return rule.customTriggerName === customTriggerName;
      }
      
      return rule.trigger === trigger;
    });
  }

  /**
   * Prepare template variables for automation rules
   */
  private prepareTemplateVariables(
    context: AutomationContext,
    client: ClientData,
    service: ServiceData,
    staff: StaffData,
    staffUser?: any
  ): Record<string, string> {
    const appointmentDate = new Date(context.startTime);
    
    // Convert UTC time to local time for display
    const localOptions: Intl.DateTimeFormatOptions = { 
      timeZone: 'America/Chicago',
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
    
    return {
      client_name: client.firstName && client.lastName ? `${client.firstName} ${client.lastName}` : client.firstName || 'Client',
      client_first_name: client.firstName || 'Client',
      client_last_name: client.lastName || '',
      client_email: client.email || '',
      client_phone: client.phone || '',
      service_name: service.name,
      service_duration: service.duration?.toString() || '60',
      staff_name: staffUser ? `${staffUser.firstName} ${staffUser.lastName}`.trim() || staffUser.username : 'Staff',
      staff_phone: staffUser?.phone || '',
      appointment_date: appointmentDateString,
      appointment_time: appointmentTime,
      appointment_datetime: appointmentDateTime,
      salon_name: 'Glo Head Spa',
      salon_phone: '(555) 123-4567',
      salon_address: '123 Beauty Street, City, State 12345',
      booking_date: new Date().toLocaleDateString('en-US', localDateOptions),
      total_amount: service.price?.toString() || '0'
    };
  }

  /**
   * Process a single automation rule
   */
  private async processAutomationRule(
    rule: AutomationRule,
    client: ClientData,
    variables: Record<string, string>
  ): Promise<void> {
    console.log(`📧 Processing automation rule: ${rule.name} (${rule.type})`);

    try {
      // Check if we should send based on client preferences
      if (!this.shouldSendAutomation(rule, client)) {
        console.log(`⚠️ Skipping ${rule.name} - client preferences not enabled`);
        return;
      }

      // Build per-rule variables, overriding {salon_name} based on rule location tag or appointment location
      let variablesForRule = { ...variables };
      try {
        // 1) Try to infer location from rule tags like [location:ID] or @location:ID or name
        const parseLocationToken = (text?: string | null): string | null => {
          try {
            if (!text) return null;
            const m = /(?:\[location:([^\]]+)\]|@location:([^\s]+))/i.exec(text);
            if (!m) return null;
            const token = (m[1] || m[2] || '').toString().trim();
            return token || null;
          } catch { return null; }
        };
        const token = parseLocationToken(rule.name) || parseLocationToken((rule as any).subject);
        let locationIdFromRule: number | null = null;
        if (token) {
          const n = parseInt(token, 10);
          locationIdFromRule = Number.isNaN(n) ? null : n;
        }

        let resolvedLocation: any = null;
        if (locationIdFromRule != null) {
          // Use storage helpers if available
          try { resolvedLocation = await (this.storage as any).getLocation?.(locationIdFromRule); } catch {}
          if (!resolvedLocation) { try { resolvedLocation = await (this.storage as any).getLocationById?.(locationIdFromRule); } catch {} }
          if (!resolvedLocation) { try { const rows = await db.select().from(locations).where(eq(locations.id, locationIdFromRule)).limit(1); resolvedLocation = (rows as any[])?.[0] || null; } catch {} }
        }

        // 2) If no rule tag location, try appointment location via context.appointmentId
        if (!resolvedLocation) {
          try {
            const apptId = (variables as any)?.appointmentId || null; // Not present in variables; fallback to client context isn't available here
          } catch {}
        }

        // Since we don't have context here, attempt to use client's latest appointment location is too heavy; skip.
        // Rely on rule tag when present; otherwise variables already carry defaults.

        if (resolvedLocation?.name) {
          variablesForRule.salon_name = String(resolvedLocation.name);
          if (resolvedLocation.phone) variablesForRule.salon_phone = String(resolvedLocation.phone);
          const addrParts = [resolvedLocation.address, resolvedLocation.city, resolvedLocation.state, resolvedLocation.zipCode].filter(Boolean);
          if (addrParts.length) variablesForRule.salon_address = addrParts.join(', ');
        }
      } catch {}

      // Process template with per-rule variables
      const processedTemplate = this.replaceTemplateVariables(rule.template, variablesForRule);
      const processedSubject = rule.subject ? this.replaceTemplateVariables(rule.subject, variablesForRule) : 'Notification from Glo Head Spa';

      // Send the automation
      if (rule.type === 'email') {
        await this.sendEmailAutomation(rule, client, processedSubject, processedTemplate);
      } else if (rule.type === 'sms') {
        await this.sendSMSAutomation(rule, client, processedTemplate);
      }

      // Update rule statistics
      await this.updateRuleStatistics(rule.id);

    } catch (error) {
      console.error(`❌ Error processing automation rule ${rule.name}:`, error);
    }
  }

  /**
   * Check if automation should be sent based on client preferences
   */
  private shouldSendAutomation(rule: AutomationRule, client: ClientData): boolean {
    console.log(`🔍 Checking preferences for ${rule.name} (${rule.type})`, {
      trigger: rule.trigger,
      clientEmail: !!client.email,
      clientPhone: !!client.phone,
      emailAppointmentReminders: client.emailAppointmentReminders,
      smsAppointmentReminders: client.smsAppointmentReminders
    });

    if (rule.type === 'email') {
      if (!client.email) {
        console.log(`❌ No email address for client ${client.id}`);
        return false;
      }

      switch (rule.trigger) {
        case 'booking_confirmation':
        case 'appointment_reminder':
          return client.emailAppointmentReminders === true;
        case 'cancellation':
        case 'after_payment':
          return client.emailAccountManagement === true;
        case 'follow_up':
          return client.emailPromotions === true;
        default:
          return true;
      }
    } else if (rule.type === 'sms') {
      if (!client.phone) {
        console.log(`❌ No phone number for client ${client.id}`);
        return false;
      }

      switch (rule.trigger) {
        case 'appointment_reminder':
          return client.smsAppointmentReminders === true;
        case 'booking_confirmation':
          // Skip SMS automation for booking confirmations to prevent duplicates
          // SMS confirmations are already sent directly in the appointment creation route
          return false;
        case 'cancellation':
        case 'after_payment':
          return client.smsAccountManagement === true;
        case 'follow_up':
          return client.smsPromotions === true;
        default:
          return true;
      }
    }

    return false;
  }

  /**
   * Replace template variables in text
   */
  private replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return result;
  }

  /**
   * Send email automation
   */
  private async sendEmailAutomation(
    rule: AutomationRule,
    client: ClientData,
    subject: string,
    template: string
  ): Promise<void> {
    console.log(`📧 Sending email automation: ${rule.name}`);
    console.log(`📧 To: ${client.email}`);
    console.log(`📧 Subject: ${subject}`);

    try {
      const emailResult = await sendEmail({
        to: client.email!,
        from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
        subject,
        text: template,
        html: `<p>${template.replace(/\n/g, '<br>')}</p>`
      });

      if (emailResult) {
        console.log(`✅ Email automation sent successfully: ${rule.name}`);
      } else {
        console.log(`❌ Email automation failed: ${rule.name}`);
      }
    } catch (error) {
      console.error(`❌ Error sending email automation ${rule.name}:`, error);
    }
  }

  /**
   * Send SMS automation
   */
  private async sendSMSAutomation(
    rule: AutomationRule,
    client: ClientData,
    template: string
  ): Promise<void> {
    console.log(`📱 Sending SMS automation: ${rule.name}`);
    console.log(`📱 To: ${client.phone}`);
    console.log(`📱 Message: ${template}`);

    try {
      const smsResult = await sendSMS(client.phone!, template);
      
      if (smsResult.success) {
        console.log(`✅ SMS automation sent successfully: ${rule.name}`);
      } else {
        console.log(`❌ SMS automation failed: ${rule.name} - ${smsResult.error}`);
      }
    } catch (error) {
      console.error(`❌ Error sending SMS automation ${rule.name}:`, error);
    }
  }

  /**
   * Update rule statistics
   */
  private async updateRuleStatistics(ruleId: number): Promise<void> {
    try {
      const rule = await this.storage.getAutomationRule(ruleId);
      if (rule) {
        const newSentCount = (rule.sentCount || 0) + 1;
        await this.storage.updateAutomationRuleSentCount(ruleId, newSentCount);
        console.log(`📊 Updated rule ${ruleId} sent count to ${newSentCount}`);
      }
    } catch (error) {
      console.error(`❌ Error updating rule statistics for rule ${ruleId}:`, error);
    }
  }

  /**
   * Trigger booking confirmation automation
   */
  async triggerBookingConfirmation(context: AutomationContext): Promise<void> {
    console.log('🎯 AutomationService: Triggering booking confirmation automation');
    await this.triggerAutomations('booking_confirmation', context);
  }

  /**
   * Trigger appointment reminder automation
   */
  async triggerAppointmentReminder(context: AutomationContext): Promise<void> {
    console.log('🎯 AutomationService: Triggering appointment reminder automation');
    await this.triggerAutomations('appointment_reminder', context);
  }

  /**
   * Trigger follow-up automation
   */
  async triggerFollowUp(context: AutomationContext): Promise<void> {
    console.log('🎯 AutomationService: Triggering follow-up automation');
    await this.triggerAutomations('follow_up', context);
  }

  /**
   * Trigger cancellation automation
   */
  async triggerCancellation(context: AutomationContext): Promise<void> {
    console.log('🎯 AutomationService: Triggering cancellation automation');
    await this.triggerAutomations('cancellation', context);
  }

  /**
   * Trigger after payment automation
   */
  async triggerAfterPayment(context: AutomationContext): Promise<void> {
    console.log('🎯 AutomationService: Triggering after payment automation');
    await this.triggerAutomations('after_payment', context);
  }

  /**
   * Trigger custom automation
   */
  async triggerCustomAutomation(context: AutomationContext, customTriggerName: string): Promise<void> {
    console.log(`🎯 AutomationService: Triggering custom automation: ${customTriggerName}`);
    await this.triggerAutomations('custom', context, customTriggerName);
  }
} 