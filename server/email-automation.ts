import { sendEmail } from './email.js';
import { 
  appointmentConfirmationTemplate, 
  appointmentReminderTemplate, 
  followUpTemplate,
  birthdayTemplate,
  generateEmailHTML,
  generateEmailText
} from './email-templates.js';
import type { IStorage } from './storage.js';
import { addHours, addDays, isAfter, format } from 'date-fns';

interface AppointmentData {
  id: number;
  clientId: number;
  serviceId: number;
  staffId: number;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
  totalAmount?: number | null;
}

interface ClientData {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emailAppointmentReminders?: boolean | null;
  emailPromotions?: boolean | null;
  birthday?: string | Date | null;
}

interface ServiceData {
  id: number;
  name: string;
  duration?: number;
  price?: number;
}

interface StaffData {
  id: number;
  userId: number;
  title?: string;
  user?: {
    firstName?: string;
    lastName?: string;
  };
}

export class EmailAutomationService {
  private storage: IStorage;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Start the email automation service
   */
  startService(): void {
    if (this.isRunning) {
      console.log('Email automation service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting email automation service...');

    // Check for emails to send every 5 minutes
    this.intervalId = setInterval(async () => {
      try {
        // Add a small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.processScheduledEmails();
      } catch (error) {
        console.error('Error in email automation service:', error);
        // If there's a critical error, stop the service to prevent loops
        if (error instanceof Error && error.message.includes('database')) {
          console.error('Critical database error detected. Stopping email automation service to prevent loops.');
          this.stopService();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also process immediately on startup
    this.processScheduledEmails();
  }

  /**
   * Stop the email automation service
   */
  stopService(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('🛑 Email automation service stopped');
  }

  /**
   * Process all scheduled emails
   */
  private async processScheduledEmails(): Promise<void> {
    console.log('📧 Processing scheduled emails...');

    try {
      // Process appointment reminders (24 hours before)
      await this.processAppointmentReminders();
      
      // Process follow-up emails (1 day after appointment)
      await this.processFollowUpEmails();
      
      // Process birthday emails
      await this.processBirthdayEmails();
      
      // Process marketing campaigns
      await this.processMarketingCampaigns();

    } catch (error) {
      console.error('Error processing scheduled emails:', error);
    }
  }

  /**
   * Process appointment reminders (24 hours before)
   */
  private async processAppointmentReminders(): Promise<void> {
    console.log('⏰ Processing appointment reminders...');

    try {
      // Get appointments that are 24 hours away
      const tomorrow = addDays(new Date(), 1);
      const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const endOfTomorrow = addDays(startOfTomorrow, 1);

      const appointments = await this.storage.getAppointmentsByDateRange(startOfTomorrow, endOfTomorrow);
      
      for (const appointment of appointments) {
        if (appointment.status !== 'confirmed' && appointment.status !== 'pending') {
          continue;
        }

        // Check if reminder was already sent
        const reminderKey = `reminder_${appointment.id}`;
        const reminderSent = await this.storage.getSystemConfig(reminderKey);
        
        if (reminderSent) {
          continue;
        }

        // Get client, service, and staff data
        const [client, service, staff] = await Promise.all([
          this.storage.getUser(appointment.clientId),
          this.storage.getService(appointment.serviceId),
          this.storage.getStaff(appointment.staffId)
        ]);

        if (!client || !service || !staff) {
          console.log(`Missing data for appointment ${appointment.id}`);
          continue;
        }

        // Check if client wants email reminders
        if (!client.emailAppointmentReminders || !client.email) {
          continue;
        }

        // Send reminder email
        await this.sendAppointmentReminder(appointment, client, service, staff);
        
        // Mark reminder as sent
        await this.storage.setSystemConfig({
          key: reminderKey,
          value: 'sent',
          description: `Appointment reminder sent for appointment ${appointment.id}`,
          category: 'email_automation'
        });
        
        console.log(`✅ Appointment reminder sent for appointment ${appointment.id}`);
      }
    } catch (error) {
      console.error('Error processing appointment reminders:', error);
    }
  }

  /**
   * Process follow-up emails (1 day after appointment)
   */
  private async processFollowUpEmails(): Promise<void> {
    console.log('📝 Processing follow-up emails...');

    try {
      // Get completed appointments from yesterday
      const yesterday = addDays(new Date(), -1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endOfYesterday = addDays(startOfYesterday, 1);

      const appointments = await this.storage.getAppointmentsByDateRange(startOfYesterday, endOfYesterday);
      
      for (const appointment of appointments) {
        if (appointment.status !== 'completed') {
          continue;
        }

        // Check if follow-up was already sent
        const followUpKey = `followup_${appointment.id}`;
        const followUpSent = await this.storage.getSystemConfig(followUpKey);
        
        if (followUpSent) {
          continue;
        }

        // Get client, service, and staff data
        const [client, service, staff] = await Promise.all([
          this.storage.getUser(appointment.clientId),
          this.storage.getService(appointment.serviceId),
          this.storage.getStaff(appointment.staffId)
        ]);

        if (!client || !service || !staff) {
          continue;
        }

        // Check if client wants promotional emails
        if (!client.emailPromotions || !client.email) {
          continue;
        }

        // Send follow-up email
        await this.sendFollowUpEmail(appointment, client, service, staff);
        
        // Mark follow-up as sent
        await this.storage.setSystemConfig({
          key: followUpKey,
          value: 'sent',
          description: `Follow-up email sent for appointment ${appointment.id}`,
          category: 'email_automation'
        });
        
        console.log(`✅ Follow-up email sent for appointment ${appointment.id}`);
      }
    } catch (error) {
      console.error('Error processing follow-up emails:', error);
    }
  }

  /**
   * Process birthday emails
   */
  private async processBirthdayEmails(): Promise<void> {
    console.log('🎂 Processing birthday emails...');

    try {
      const today = new Date();
      const todayStr = format(today, 'MM-dd');

      // Get all clients with birthdays today
      const clients = await this.storage.getAllUsers();
      const birthdayClients = clients.filter(client => {
        if (!client.birthday || !client.emailPromotions || !client.email) {
          return false;
        }
        const birthday = new Date(client.birthday as any);
        const birthdayStr = format(birthday, 'MM-dd');
        return birthdayStr === todayStr;
      });

      for (const client of birthdayClients) {
        // Check if birthday email was already sent today
        const birthdayKey = `birthday_${client.id}_${format(today, 'yyyy-MM-dd')}`;
        const birthdaySent = await this.storage.getSystemConfig(birthdayKey);
        
        if (birthdaySent) {
          continue;
        }

        // Send birthday email
        await this.sendBirthdayEmail(client);
        
        // Mark birthday email as sent
        await this.storage.setSystemConfig({
          key: birthdayKey,
          value: 'sent',
          description: `Birthday email sent for client ${client.id}`,
          category: 'email_automation'
        });
        
        console.log(`✅ Birthday email sent for client ${client.id}`);
      }
    } catch (error) {
      console.error('Error processing birthday emails:', error);
    }
  }

  /**
   * Process marketing campaigns
   */
  private async processMarketingCampaigns(): Promise<void> {
    console.log('📢 Processing marketing campaigns...');

    try {
      // Get scheduled marketing campaigns
      const campaigns = await this.storage.getMarketingCampaigns();
      const scheduledCampaigns = campaigns.filter(campaign => 
        campaign.status === 'scheduled' && 
        campaign.sendDate && 
        isAfter(new Date(), new Date(campaign.sendDate))
      );

      for (const campaign of scheduledCampaigns) {
        await this.sendMarketingCampaign(campaign);
        
        // Update campaign status
        await this.storage.updateMarketingCampaign(campaign.id, {
          status: 'sent',
          sentAt: new Date()
        });
        
        console.log(`✅ Marketing campaign sent: ${campaign.name}`);
      }
    } catch (error) {
      console.error('Error processing marketing campaigns:', error);
    }
  }

  /**
   * Send appointment reminder email
   */
  private async sendAppointmentReminder(
    appointment: AppointmentData,
    client: ClientData,
    service: ServiceData,
    staff: StaffData
  ): Promise<void> {
    const appointmentDate = new Date(appointment.startTime);
    const appointmentTime = format(appointmentDate, 'HH:mm');
    
    const templateData = {
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Valued Client',
      clientEmail: client.email,
      serviceName: service.name,
      appointmentDate: appointmentDate,
      appointmentTime: appointmentTime,
      duration: service.duration || 60,
      staffName: staff.user ? `${staff.user.firstName || ''} ${staff.user.lastName || ''}`.trim() : 'Our Staff',
      totalAmount: appointment.totalAmount,
      salonAddress: '123 Main St, New York, NY 10001',
      salonPhone: '(555) 123-4567',
      rescheduleUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/appointments/${appointment.id}/reschedule`,
      cancelUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/appointments/${appointment.id}/cancel`,
      unsubscribeUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/unsubscribe/${client.id}`
    };

    const html = generateEmailHTML(appointmentReminderTemplate, templateData, 'Appointment Reminder - Tomorrow');
    const text = generateEmailText(appointmentReminderTemplate, templateData);

    await sendEmail({
      to: client.email!,
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
      subject: `Appointment Reminder - ${service.name}`,
      html,
      text
    });
  }

  /**
   * Send follow-up email
   */
  private async sendFollowUpEmail(
    appointment: AppointmentData,
    client: ClientData,
    service: ServiceData,
    staff: StaffData
  ): Promise<void> {
    const appointmentDate = new Date(appointment.startTime);
    
    const templateData = {
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Valued Client',
      clientEmail: client.email,
      serviceName: service.name,
      appointmentDate: appointmentDate,
      staffName: staff.user ? `${staff.user.firstName || ''} ${staff.user.lastName || ''}`.trim() : 'Our Staff',
      reviewUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/review/${appointment.id}`,
      bookAgainUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/book`,
      careTips: this.getCareTipsForService(service.name),
      unsubscribeUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/unsubscribe/${client.id}`
    };

    const html = generateEmailHTML(followUpTemplate, templateData, 'Thank You for Your Visit!');
    const text = generateEmailText(followUpTemplate, templateData);

    await sendEmail({
      to: client.email!,
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
      subject: 'Thank You for Your Visit to Glo Head Spa',
      html,
      text
    });
  }

  /**
   * Send birthday email
   */
  private async sendBirthdayEmail(client: ClientData): Promise<void> {
    const birthday = new Date(client.birthday!);
    const birthdayYear = birthday.getFullYear();
    const expiryDate = addDays(new Date(), 30);
    
    const templateData = {
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Valued Client',
      clientEmail: client.email,
      birthdayYear: birthdayYear,
      discountPercent: 20,
      expiryDate: expiryDate,
      bookUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/book`,
      unsubscribeUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/unsubscribe/${client.id}`
    };

    const html = generateEmailHTML(birthdayTemplate, templateData, 'Happy Birthday from Glo Head Spa!');
    const text = generateEmailText(birthdayTemplate, templateData);

    await sendEmail({
      to: client.email!,
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
      subject: 'Happy Birthday from Glo Head Spa! 🎉',
      html,
      text
    });
  }

  /**
   * Send marketing campaign
   */
  private async sendMarketingCampaign(campaign: any): Promise<void> {
    // Get target audience
    const clients = await this.getTargetAudience(campaign.audience);
    
    let sentCount = 0;
    let failedCount = 0;

    for (const client of clients) {
      if (!client.email || !client.emailPromotions) {
        continue;
      }

      try {
        const templateData = {
          clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Valued Client',
          clientEmail: client.email,
          campaignTitle: campaign.name,
          campaignSubtitle: campaign.subject || '',
          campaignContent: campaign.htmlContent || campaign.content,
          ctaButton: campaign.ctaButton,
          ctaUrl: campaign.ctaUrl,
          specialOffer: campaign.specialOffer,
          promoCode: campaign.promoCode,
          unsubscribeUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/unsubscribe/${client.id}`
        };

        const html = generateEmailHTML(require('./email-templates').marketingCampaignTemplate, templateData, campaign.subject || campaign.name);
        const text = generateEmailText(require('./email-templates').marketingCampaignTemplate, templateData);

        await sendEmail({
          to: client.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
          subject: campaign.subject || campaign.name,
          html,
          text
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send campaign email to ${client.email}:`, error);
        failedCount++;
      }
    }

    console.log(`📢 Marketing campaign "${campaign.name}" completed: ${sentCount} sent, ${failedCount} failed`);
  }

  /**
   * Get target audience for marketing campaign
   */
  private async getTargetAudience(audience: string): Promise<ClientData[]> {
    const allClients = await this.storage.getAllUsers();
    
    switch (audience) {
      case 'all_clients':
        return allClients.filter(client => client.role === 'client');
      
      case 'regular_clients':
        // Clients with 3+ appointments in the last 6 months
        const sixMonthsAgo = addDays(new Date(), -180);
        const regularClients = [];
        
        for (const client of allClients) {
          if (client.role !== 'client') continue;
          
          const appointments = await this.storage.getAppointmentsByClient(client.id);
          const recentAppointments = appointments.filter(apt => 
            new Date(apt.startTime) > sixMonthsAgo
          );
          
          if (recentAppointments.length >= 3) {
            regularClients.push(client);
          }
        }
        
        return regularClients;
      
      case 'new_clients':
        // Clients who joined in the last 30 days
        const thirtyDaysAgo = addDays(new Date(), -30);
        return allClients.filter(client => 
          client.role === 'client' && 
          client.createdAt && 
          new Date(client.createdAt) > thirtyDaysAgo
        );
      
      default:
        return allClients.filter(client => client.role === 'client');
    }
  }

  /**
   * Get care tips for specific service
   */
  private getCareTipsForService(serviceName: string): string {
    const careTips: { [key: string]: string } = {
      'massage': 'Drink plenty of water and avoid strenuous activity for 24 hours. Consider a warm bath to relax muscles.',
      'facial': 'Avoid touching your face for 24 hours. Use gentle cleansers and moisturizers. Stay hydrated.',
      'hair_cut': 'Avoid washing your hair for 24-48 hours. Use recommended products for best results.',
      'manicure': 'Avoid water for 2 hours. Use cuticle oil daily. Wear gloves for household chores.',
      'pedicure': 'Avoid water for 2 hours. Wear open-toed shoes. Moisturize daily.',
      'default': 'Stay hydrated and avoid harsh chemicals. Follow any specific instructions from your service provider.'
    };

    const serviceKey = serviceName.toLowerCase().replace(/\s+/g, '_');
    return careTips[serviceKey] || careTips.default;
  }

  /**
   * Send immediate appointment confirmation
   */
  async sendAppointmentConfirmation(
    appointment: AppointmentData,
    client: ClientData,
    service: ServiceData,
    staff: StaffData
  ): Promise<void> {
    const appointmentDate = new Date(appointment.startTime);
    const appointmentTime = format(appointmentDate, 'HH:mm');
    
    const templateData = {
      clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Valued Client',
      clientEmail: client.email,
      serviceName: service.name,
      appointmentDate: appointmentDate,
      appointmentTime: appointmentTime,
      duration: service.duration || 60,
      staffName: staff.user ? `${staff.user.firstName || ''} ${staff.user.lastName || ''}`.trim() : 'Our Staff',
      totalAmount: appointment.totalAmount,
      rescheduleUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/appointments/${appointment.id}/reschedule`,
      cancelUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/appointments/${appointment.id}/cancel`,
      unsubscribeUrl: `${process.env.CUSTOM_DOMAIN || 'http://localhost:5000'}/unsubscribe/${client.id}`
    };

    const html = generateEmailHTML(appointmentConfirmationTemplate, templateData, 'Appointment Confirmed');
    const text = generateEmailText(appointmentConfirmationTemplate, templateData);

    await sendEmail({
      to: client.email!,
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
      subject: `Appointment Confirmed - ${service.name}`,
      html,
      text
    });
  }
} 