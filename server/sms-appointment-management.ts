import { IStorage } from './storage';
import { format, parseISO, addDays, isAfter, isBefore } from 'date-fns';

interface AppointmentManagementRequest {
  action: 'reschedule' | 'cancel';
  clientPhone: string;
  appointmentId?: number;
  newDate?: string;
  newTime?: string;
  reason?: string;
}

interface AppointmentManagementResult {
  success: boolean;
  message: string;
  appointment?: any;
  availableSlots?: any[];
  error?: string;
}

export class SMSAppointmentManagementService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Parse appointment management request from SMS text
   */
  async parseManagementRequest(smsText: string, clientPhone: string): Promise<AppointmentManagementRequest> {
    const text = smsText.toLowerCase().trim();
    
    // Determine action
    let action: 'reschedule' | 'cancel' = 'reschedule';
    if (text.includes('cancel') || text.includes('cancellation')) {
      action = 'cancel';
    }

    // Extract date and time for rescheduling
    let newDate: string | undefined;
    let newTime: string | undefined;

    if (action === 'reschedule') {
      // Extract date patterns
      const datePatterns = [
        /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        /(january|february|march|april|may|june|july|august|september|october|november|december)/i,
        /(today|tomorrow|next week)/i,
        /\d{1,2}(st|nd|rd|th)?/i
      ];

      // Extract time patterns
      const timePatterns = [
        /\d{1,2}:\d{2}\s*(am|pm)?/i,
        /\d{1,2}\s*(am|pm)/i,
        /(morning|afternoon|evening|night)/i
      ];

      // Find date matches
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          newDate = match[0];
          break;
        }
      }

      // Find time matches
      for (const pattern of timePatterns) {
        const match = text.match(pattern);
        if (match) {
          newTime = match[0];
          break;
        }
      }
    }

    return {
      action,
      clientPhone,
      newDate,
      newTime,
      reason: action === 'cancel' ? 'Client requested cancellation via SMS' : undefined
    };
  }

  /**
   * Find client's upcoming appointments
   */
  async findClientAppointments(clientPhone: string): Promise<any[]> {
    try {
      // Find client by phone number
      const allUsers = await this.storage.getAllUsers();
      const client = allUsers.find(user => user.phone === clientPhone);
      
      if (!client) {
        return [];
      }

      // Get all appointments
      const allAppointments = await this.storage.getAllAppointments();
      
      // Filter for this client's upcoming appointments
      const now = new Date();
      const clientAppointments = allAppointments.filter(apt => 
        apt.clientId === client.id && 
        apt.status === 'confirmed' &&
        new Date(apt.startTime) > now
      );

      return clientAppointments.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    } catch (error) {
      console.error('Error finding client appointments:', error);
      return [];
    }
  }

  /**
   * Process appointment management request
   */
  async processManagementRequest(smsText: string, clientPhone: string): Promise<AppointmentManagementResult> {
    try {
      const request = await this.parseManagementRequest(smsText, clientPhone);
      const clientAppointments = await this.findClientAppointments(clientPhone);

      if (clientAppointments.length === 0) {
        return {
          success: false,
          message: "I couldn't find any upcoming appointments for your phone number. Please call us directly to check your appointments. 📞"
        };
      }

      if (request.action === 'cancel') {
        return await this.handleCancellation(request, clientAppointments);
      } else {
        return await this.handleReschedule(request, clientAppointments);
      }
    } catch (error: any) {
      console.error('Error processing appointment management request:', error);
      return {
        success: false,
        message: "I'm sorry, I encountered an issue processing your request. Please call us directly for assistance. 📞",
        error: error.message
      };
    }
  }

  /**
   * Handle appointment cancellation
   */
  private async handleCancellation(request: AppointmentManagementRequest, appointments: any[]): Promise<AppointmentManagementResult> {
    // If multiple appointments, ask which one to cancel
    if (appointments.length > 1) {
      const appointmentList = await Promise.all(appointments.map(async (apt, index) => {
        const service = await this.storage.getService(apt.serviceId);
        const staff = await this.storage.getUser(apt.staffId);
        return `${index + 1}. ${service?.name || 'Service'} on ${format(new Date(apt.startTime), 'EEEE, MMMM d')} at ${format(new Date(apt.startTime), 'h:mm a')} with ${staff?.firstName || 'Staff'}`;
      }));
      const appointmentListText = appointmentList.join('\n');

      return {
        success: false,
        message: `I found ${appointments.length} upcoming appointments. Which one would you like to cancel?\n\n${appointmentListText}\n\nPlease reply with the number (1, 2, etc.) or the appointment details.`
      };
    }

    // Cancel the single appointment
    const appointment = appointments[0];
    const service = await this.storage.getService(appointment.serviceId);
    const staff = await this.storage.getUser(appointment.staffId);

    try {
      await this.storage.moveAppointmentToCancelled(
        appointment.id,
        request.reason || 'Cancelled via SMS',
        undefined,
        'client'
      );

      return {
        success: true,
        message: `I've cancelled your ${service?.name || 'appointment'} for ${format(new Date(appointment.startTime), 'EEEE, MMMM d')} at ${format(new Date(appointment.startTime), 'h:mm a')}. You'll receive a confirmation email shortly. If you'd like to reschedule, just let me know! 💆‍♀️✨`,
        appointment
      };
    } catch (error: any) {
      return {
        success: false,
        message: "I'm sorry, I couldn't cancel your appointment. Please call us directly for assistance. 📞",
        error: error.message
      };
    }
  }

  /**
   * Handle appointment rescheduling
   */
  private async handleReschedule(request: AppointmentManagementRequest, appointments: any[]): Promise<AppointmentManagementResult> {
    // If multiple appointments, ask which one to reschedule
    if (appointments.length > 1) {
      const appointmentList = await Promise.all(appointments.map(async (apt, index) => {
        const service = await this.storage.getService(apt.serviceId);
        const staff = await this.storage.getUser(apt.staffId);
        return `${index + 1}. ${service?.name || 'Service'} on ${format(new Date(apt.startTime), 'EEEE, MMMM d')} at ${format(new Date(apt.startTime), 'h:mm a')} with ${staff?.firstName || 'Staff'}`;
      }));
      const appointmentListText = appointmentList.join('\n');

      return {
        success: false,
        message: `I found ${appointments.length} upcoming appointments. Which one would you like to reschedule?\n\n${appointmentListText}\n\nPlease reply with the number (1, 2, etc.) or the appointment details.`
      };
    }

    const appointment = appointments[0];
    const service = await this.storage.getService(appointment.serviceId);

    // If no new date/time specified, ask for preferences
    if (!request.newDate && !request.newTime) {
      return {
        success: false,
        message: `I'd be happy to help you reschedule your ${service?.name || 'appointment'}. What date and time would work better for you? You can say things like "tomorrow at 2pm" or "next Tuesday morning". 💆‍♀️✨`
      };
    }

    // Find available slots for rescheduling
    const availableSlots = await this.findAvailableSlotsForReschedule(appointment, request.newDate, request.newTime);

    if (availableSlots.length === 0) {
      return {
        success: false,
        message: `I'm sorry, but I couldn't find any available slots for ${service?.name || 'your service'} on the requested date/time. Please call us directly to check availability or try a different date/time. 📞`
      };
    }

    // If specific time requested, try to match it
    if (request.newTime) {
      const matchingSlot = availableSlots.find(slot => {
        const slotTime = format(slot.startTime, 'h:mm a').toLowerCase();
        const requestedTime = request.newTime!.toLowerCase();
        return slotTime.includes(requestedTime) || requestedTime.includes(slotTime);
      });

      if (matchingSlot) {
        return await this.performReschedule(appointment, matchingSlot);
      }
    }

    // Show available options
    const timeOptions = availableSlots.slice(0, 5).map(slot => 
      format(slot.startTime, 'h:mm a')
    ).join(', ');

    return {
      success: false,
      message: `Great! Here are some available times for ${service?.name || 'your service'}: ${timeOptions}. Which time works best for you? 💆‍♀️✨`,
      availableSlots
    };
  }

  /**
   * Find available slots for rescheduling
   */
  private async findAvailableSlotsForReschedule(appointment: any, newDate?: string, newTime?: string): Promise<any[]> {
    try {
      const service = await this.storage.getService(appointment.serviceId);
      const allStaff = await this.storage.getAllStaff();
      const existingAppointments = await this.storage.getAllAppointments();

      // Filter out the current appointment from conflicts
      const otherAppointments = existingAppointments.filter(apt => apt.id !== appointment.id);

      const availableSlots: any[] = [];
      const today = new Date();
      const endDate = addDays(today, 14); // Look ahead 2 weeks

      // Generate time slots for each day
      for (let day = 0; day < 14; day++) {
        const currentDate = addDays(today, day);
        
        // Check if this matches the requested date
        if (newDate) {
          const requestedDate = this.parseDateRequest(newDate, currentDate);
          if (!this.isSameDay(requestedDate, currentDate)) {
            continue;
          }
        }

        // Get staff schedules for this day
        for (const staff of allStaff) {
          const schedules = await this.storage.getStaffSchedulesByStaffId(staff.id);
          const daySchedule = schedules.find(s => 
            s.dayOfWeek.toLowerCase() === format(currentDate, 'EEEE').toLowerCase()
          );

          if (daySchedule && !daySchedule.isBlocked) {
            const slots = this.generateTimeSlotsForDay(
              currentDate,
              daySchedule.startTime,
              daySchedule.endTime,
              service?.duration || 60,
              staff.id,
              service,
              otherAppointments
            );
            availableSlots.push(...slots);
          }
        }
      }

      return availableSlots;
    } catch (error) {
      console.error('Error finding available slots for reschedule:', error);
      return [];
    }
  }

  /**
   * Perform the actual reschedule
   */
  private async performReschedule(appointment: any, newSlot: any): Promise<AppointmentManagementResult> {
    try {
      const service = await this.storage.getService(appointment.serviceId);
      const staff = await this.storage.getUser(appointment.staffId);

      // Update the appointment
      const updatedAppointment = await this.storage.updateAppointment(appointment.id, {
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        staffId: newSlot.staffId,
        notes: `${appointment.notes || ''} - Rescheduled via SMS on ${new Date().toISOString()}`
      });

      return {
        success: true,
        message: `Perfect! I've rescheduled your ${service?.name || 'appointment'} to ${format(newSlot.startTime, 'EEEE, MMMM d')} at ${format(newSlot.startTime, 'h:mm a')}. You'll receive a confirmation shortly! 💆‍♀️✨`,
        appointment: updatedAppointment
      };
    } catch (error: any) {
      return {
        success: false,
        message: "I'm sorry, I couldn't reschedule your appointment. Please call us directly for assistance. 📞",
        error: error.message
      };
    }
  }

  /**
   * Generate time slots for a specific day
   */
  private generateTimeSlotsForDay(
    date: Date,
    startTime: string,
    endTime: string,
    duration: number,
    staffId: number,
    service: any,
    existingAppointments: any[]
  ): any[] {
    const slots: any[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const slotStart = new Date(date);
    slotStart.setHours(startHour, startMinute, 0, 0);
    
    const slotEnd = new Date(date);
    slotEnd.setHours(endHour, endMinute, 0, 0);
    
    const intervalMinutes = 30; // 30-minute intervals
    
    while (slotStart < slotEnd) {
      const appointmentEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
      
      // Check for conflicts
      const hasConflict = existingAppointments.some(apt => {
        if (apt.staffId !== staffId || apt.status === 'cancelled') return false;
        
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        
        return (slotStart < aptEnd && appointmentEnd > aptStart);
      });

      if (!hasConflict) {
        slots.push({
          startTime: new Date(slotStart),
          endTime: appointmentEnd,
          staffId,
          serviceId: service?.id,
          serviceName: service?.name
        });
      }
      
      slotStart.setMinutes(slotStart.getMinutes() + intervalMinutes);
    }
    
    return slots;
  }

  /**
   * Parse date request from text
   */
  private parseDateRequest(dateText: string, currentDate: Date): Date {
    const text = dateText.toLowerCase();
    
    if (text.includes('tomorrow')) {
      return addDays(currentDate, 1);
    }
    
    if (text.includes('next week')) {
      return addDays(currentDate, 7);
    }
    
    // For now, return current date as fallback
    return currentDate;
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
} 